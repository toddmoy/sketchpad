import { createShapeId, Editor, StateNode, TLShape, TLShapeId, toRichText } from 'tldraw'

// A mind map is plain tldraw geo shapes + elbow arrows. Tree structure lives in shape meta:
//   node:  meta.mm = { parent: TLShapeId | null, order: number }
//   edge:  meta.mmEdge = true
// so everything still copies, undoes and deletes like normal shapes.

type MmMeta = { parent: TLShapeId | null; order: number }

const NODE_W = 160
const NODE_H = 44
const GAP_X = 56
const GAP_Y = 16

function mm(shape: TLShape | undefined): MmMeta | null {
  return (shape?.meta?.mm as MmMeta | undefined) ?? null
}

function nodes(editor: Editor) {
  return editor.getCurrentPageShapes().filter((s) => mm(s))
}

function childrenOf(editor: Editor, id: TLShapeId) {
  return nodes(editor)
    .filter((s) => mm(s)!.parent === id)
    .sort((a, b) => mm(a)!.order - mm(b)!.order)
}

function rootOf(editor: Editor, id: TLShapeId): TLShapeId {
  let cur = editor.getShape(id)
  while (cur && mm(cur)?.parent) cur = editor.getShape(mm(cur)!.parent!)
  return cur?.id ?? id
}

function descendants(editor: Editor, id: TLShapeId): TLShapeId[] {
  return childrenOf(editor, id).flatMap((c) => [c.id, ...descendants(editor, c.id)])
}

export function selectedNode(editor: Editor) {
  const ids = editor.getSelectedShapeIds()
  if (ids.length !== 1) return null
  const shape = editor.getShape(ids[0])
  return mm(shape) ? shape! : null
}

function createNode(editor: Editor, parent: TLShapeId | null, order: number, x: number, y: number) {
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'geo',
    x,
    y,
    meta: { mm: { parent, order } },
    props: {
      geo: 'rectangle',
      w: NODE_W,
      h: NODE_H,
      size: 's',
      fill: parent ? 'none' : 'semi',
      richText: toRichText(''),
    },
  })
  if (parent) connect(editor, parent, id)
  return id
}

function connect(editor: Editor, from: TLShapeId, to: TLShapeId) {
  const arrowId = createShapeId()
  editor.createShape({
    id: arrowId,
    type: 'arrow',
    meta: { mmEdge: true },
    props: { kind: 'elbow', size: 's', arrowheadEnd: 'none', arrowheadStart: 'none' },
  })
  const anchor = (terminal: 'start' | 'end', toId: TLShapeId, x: number) => ({
    type: 'arrow' as const,
    fromId: arrowId,
    toId,
    props: { terminal, normalizedAnchor: { x, y: 0.5 }, isExact: false, isPrecise: true, snap: 'none' as const },
  })
  editor.createBindings([anchor('start', from, 1), anchor('end', to, 0)])
}

export function startEditing(editor: Editor, id: TLShapeId) {
  editor.setCurrentTool('select')
  editor.select(id)
  editor.setEditingShape(id)
  editor.setCurrentTool('select.editing_shape')
}

function stopEditing(editor: Editor) {
  if (editor.getEditingShapeId()) editor.setCurrentTool('select.idle')
}

export function createRoot(editor: Editor, x: number, y: number) {
  editor.markHistoryStoppingPoint('mindmap root')
  const id = createNode(editor, null, 0, x - NODE_W / 2, y - NODE_H / 2)
  startEditing(editor, id)
}

export function addChild(editor: Editor, parentId: TLShapeId) {
  editor.markHistoryStoppingPoint('mindmap child')
  stopEditing(editor)
  const kids = childrenOf(editor, parentId)
  const order = kids.length ? mm(kids[kids.length - 1])!.order + 1 : 0
  const p = editor.getShapePageBounds(parentId)!
  const id = createNode(editor, parentId, order, p.maxX + GAP_X, p.y)
  layout(editor, rootOf(editor, parentId))
  startEditing(editor, id)
}

export function addSibling(editor: Editor, nodeId: TLShapeId) {
  const node = editor.getShape(nodeId)!
  const parent = mm(node)!.parent
  if (!parent) return addChild(editor, nodeId)
  editor.markHistoryStoppingPoint('mindmap sibling')
  stopEditing(editor)
  // Insert right after this node, shifting later siblings down.
  const order = mm(node)!.order
  for (const s of childrenOf(editor, parent)) {
    const m = mm(s)!
    if (m.order > order) editor.updateShape({ id: s.id, type: s.type, meta: { mm: { ...m, order: m.order + 1 } } })
  }
  const b = editor.getShapePageBounds(nodeId)!
  const id = createNode(editor, parent, order + 1, b.x, b.maxY + GAP_Y)
  layout(editor, rootOf(editor, parent))
  startEditing(editor, id)
}

export function deleteNode(editor: Editor, nodeId: TLShapeId) {
  const node = editor.getShape(nodeId)!
  const parent = mm(node)!.parent
  editor.markHistoryStoppingPoint('mindmap delete')
  const doomed = new Set([nodeId, ...descendants(editor, nodeId)])
  const edges = editor
    .getCurrentPageShapes()
    .filter((s) => s.meta?.mmEdge && editor.getBindingsFromShape(s.id, 'arrow').some((b) => doomed.has(b.toId)))
  editor.deleteShapes([...doomed, ...edges.map((e) => e.id)])
  if (parent) {
    const siblings = childrenOf(editor, parent)
    const next = siblings.find((s) => mm(s)!.order > mm(node)!.order) ?? siblings[siblings.length - 1]
    editor.select(next?.id ?? parent)
    layout(editor, rootOf(editor, parent))
  }
}

export function navigate(editor: Editor, nodeId: TLShapeId, dir: 'left' | 'right' | 'up' | 'down') {
  const node = editor.getShape(nodeId)!
  const parent = mm(node)!.parent
  let target: TLShapeId | undefined
  if (dir === 'left') target = parent ?? undefined
  if (dir === 'right') {
    const kids = childrenOf(editor, nodeId)
    target = kids[Math.floor((kids.length - 1) / 2)]?.id
  }
  if ((dir === 'up' || dir === 'down') && parent) {
    const sibs = childrenOf(editor, parent)
    const i = sibs.findIndex((s) => s.id === nodeId)
    target = sibs[i + (dir === 'up' ? -1 : 1)]?.id
  }
  if (target) editor.select(target)
}

// Right-growing tree: each subtree is a vertical stack, centered on its parent.
// The root never moves, so dragging it carries the whole map.
export function layout(editor: Editor, rootId: TLShapeId) {
  const size = new Map<TLShapeId, { w: number; h: number }>()
  const span = new Map<TLShapeId, number>()
  const measure = (id: TLShapeId): number => {
    const b = editor.getShapePageBounds(id)!
    size.set(id, { w: b.w, h: b.h })
    const kids = childrenOf(editor, id)
    const kidsSpan = kids.reduce((sum, k) => sum + measure(k.id), 0) + GAP_Y * Math.max(0, kids.length - 1)
    const s = Math.max(b.h, kidsSpan)
    span.set(id, s)
    return s
  }
  measure(rootId)

  const updates: { id: TLShapeId; type: 'geo'; x: number; y: number }[] = []
  const place = (id: TLShapeId, x: number, centerY: number) => {
    const { w } = size.get(id)!
    const kids = childrenOf(editor, id)
    const kidsSpan = kids.reduce((sum, k) => sum + span.get(k.id)!, 0) + GAP_Y * Math.max(0, kids.length - 1)
    let top = centerY - kidsSpan / 2
    for (const k of kids) {
      const s = span.get(k.id)!
      const kh = size.get(k.id)!.h
      const kx = x + w + GAP_X
      const ky = top + s / 2
      const shape = editor.getShape(k.id)!
      if (Math.abs(shape.x - kx) > 0.5 || Math.abs(shape.y - (ky - kh / 2)) > 0.5)
        updates.push({ id: k.id, type: 'geo', x: kx, y: ky - kh / 2 })
      place(k.id, kx, ky)
      top += s + GAP_Y
    }
  }
  const root = editor.getShapePageBounds(rootId)!
  place(rootId, root.x, root.midY)
  if (updates.length) editor.updateShapes(updates)
}

// Re-layout when node text changes size or the root is dragged.
export function watchLayout(editor: Editor) {
  let pending = new Set<TLShapeId>()
  let frame = 0
  return editor.store.listen(
    ({ changes }) => {
      for (const [, to] of Object.values(changes.updated)) {
        if (to.typeName === 'shape' && mm(to as TLShape)) pending.add(to.id as TLShapeId)
      }
      if (!pending.size || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const roots = new Set([...pending].filter((id) => editor.getShape(id)).map((id) => rootOf(editor, id)))
        pending = new Set()
        editor.run(() => roots.forEach((r) => layout(editor, r)), { history: 'ignore' })
      })
    },
    { scope: 'document' }
  )
}

// Keys: Tab = child, Enter = sibling (while editing or selected), arrows = move, Delete = remove branch.
export function handleKey(editor: Editor, e: KeyboardEvent): boolean {
  const editingId = editor.getEditingShapeId()
  const editing = editingId ? editor.getShape(editingId) : undefined
  if (editing && mm(editing)) {
    if (e.key === 'Tab' && !e.shiftKey) return addChild(editor, editing.id), true
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) return addSibling(editor, editing.id), true
    return false
  }

  if (!editor.isIn('select.idle')) return false
  const node = selectedNode(editor)
  if (!node || e.metaKey || e.ctrlKey || e.altKey) return false
  switch (e.key) {
    case 'Tab':
      return addChild(editor, node.id), true
    case 'Enter':
      // Enter on a selected node edits it, like the rest of tldraw; Shift+Enter adds a sibling.
      if (e.shiftKey) return addSibling(editor, node.id), true
      return startEditing(editor, node.id), true
    case 'Backspace':
    case 'Delete':
      return deleteNode(editor, node.id), true
    case 'ArrowLeft':
      return navigate(editor, node.id, 'left'), true
    case 'ArrowRight':
      return navigate(editor, node.id, 'right'), true
    case 'ArrowUp':
      return navigate(editor, node.id, 'up'), true
    case 'ArrowDown':
      return navigate(editor, node.id, 'down'), true
  }
  return false
}

// Toolbar tool: click the canvas to drop a root node and start typing.
export class MindMapTool extends StateNode {
  static override id = 'mindmap'

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  override onPointerDown() {
    const { x, y } = this.editor.inputs.currentPagePoint
    createRoot(this.editor, x, y)
  }

  override onCancel() {
    this.editor.setCurrentTool('select')
  }
}

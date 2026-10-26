import { useCallback, useEffect, useState } from 'react'
import {
  DefaultToolbar,
  DefaultToolbarContent,
  Editor,
  Tldraw,
  TldrawUiMenuItem,
  TLComponents,
  TLUiOverrides,
  useIsToolSelected,
  useTools,
} from 'tldraw'
import { handleKey, MindMapTool, watchLayout } from './mindmap'

const tools = [MindMapTool]

const overrides: TLUiOverrides = {
  tools(editor, tools) {
    tools.mindmap = {
      id: 'mindmap',
      icon: 'arrow-elbow',
      label: 'Mind map',
      kbd: 'm',
      onSelect: () => editor.setCurrentTool('mindmap'),
    }
    return tools
  },
}

function Toolbar() {
  const tools = useTools()
  const isSelected = useIsToolSelected(tools.mindmap)
  return (
    <DefaultToolbar>
      <TldrawUiMenuItem {...tools.mindmap} isSelected={isSelected} />
      <DefaultToolbarContent />
    </DefaultToolbar>
  )
}

const components: TLComponents = { Toolbar }

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [status, setStatus] = useState('')

  const clear = useCallback(() => {
    if (!editor) return
    editor.deleteShapes([...editor.getCurrentPageShapeIds()])
    editor.setCurrentTool('draw')
  }, [editor])

  const copy = useCallback(async () => {
    if (!editor) return
    const selected = editor.getSelectedShapeIds()
    const ids = selected.length ? selected : [...editor.getCurrentPageShapeIds()]
    if (!ids.length) return
    const { blob } = await editor.toImage(ids, { format: 'png', background: true, padding: 16, scale: 2 })
    await window.api?.copyPng(await blob.arrayBuffer())
    setStatus('Copied')
    setTimeout(() => {
      setStatus('')
      window.api?.hide()
    }, 350)
  }, [editor])

  // ⌘↩ copies and closes, like a quick capture tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault()
        copy()
      } else if (editor && handleKey(editor, e)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [copy, editor])

  // Each time the popup opens, be ready to draw immediately.
  useEffect(() => {
    if (!editor) return
    window.api?.onShown(() => {
      if (editor.getCurrentToolId() === 'select' && !editor.getSelectedShapeIds().length) {
        editor.setCurrentTool('draw')
      }
    })
  }, [editor])

  return (
    <div className="app">
      <div className="bar">
        <button onClick={clear} title="Clear" aria-label="Clear">
          <EraserIcon />
        </button>
        <span className="hint">{status || '⌘↩ copy & close'}</span>
        <div className="group">
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              window.api?.showMenu(r.left, r.bottom)
            }}
            title="More"
            aria-label="More"
          >
            <MoreIcon />
          </button>
          <button className="primary" onClick={copy} title="Copy (⌘↩)" aria-label="Copy">
            <CopyIcon />
          </button>
        </div>
      </div>
      <div className="canvas">
        <Tldraw
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
          tools={tools}
          overrides={overrides}
          components={components}
          onMount={(e) => {
            e.setCurrentTool('draw')
            setEditor(e)
            if (import.meta.env.DEV) (window as unknown as { editor: Editor }).editor = e
            return watchLayout(e)
          }}
        />
      </div>
    </div>
  )
}

// Lucide icons (ISC license), inlined.
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function EraserIcon() {
  return (
    <svg {...iconProps}>
      <path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' />
      <path d='M22 21H7' />
      <path d='m5 11 9 9' />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg {...iconProps}>
      <circle cx='12' cy='12' r='1' />
      <circle cx='19' cy='12' r='1' />
      <circle cx='5' cy='12' r='1' />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
      <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
    </svg>
  )
}

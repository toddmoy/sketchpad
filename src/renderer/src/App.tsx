import { useCallback, useEffect, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'

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
    await window.api.copyPng(await blob.arrayBuffer())
    setStatus('Copied')
    setTimeout(() => {
      setStatus('')
      window.api.hide()
    }, 350)
  }, [editor])

  // ⌘↩ copies and closes, like a quick capture tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault()
        copy()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [copy])

  // Each time the popup opens, be ready to draw immediately.
  useEffect(() => {
    if (!editor) return
    window.api.onShown(() => {
      if (editor.getCurrentToolId() === 'select' && !editor.getSelectedShapeIds().length) {
        editor.setCurrentTool('draw')
      }
    })
  }, [editor])

  return (
    <div className="app">
      <div className="canvas">
        <Tldraw
          onMount={(e) => {
            e.setCurrentTool('draw')
            setEditor(e)
          }}
        />
      </div>
      <div className="bar">
        <button onClick={clear}>Clear</button>
        <span className="hint">{status || '⌘↩ copy & close'}</span>
        <button className="primary" onClick={copy}>
          Copy
        </button>
      </div>
    </div>
  )
}

import { contextBridge, ipcRenderer } from 'electron'

const api = {
  copyPng: (data: ArrayBuffer) => ipcRenderer.invoke('copy-png', data),
  hide: () => ipcRenderer.send('hide'),
  onShown: (cb: () => void) => {
    ipcRenderer.on('shown', cb)
  },
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)

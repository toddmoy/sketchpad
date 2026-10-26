import { contextBridge, ipcRenderer } from 'electron'

const api = {
  copyPng: (data: ArrayBuffer) => ipcRenderer.invoke('copy-png', data),
  hide: () => ipcRenderer.send('hide'),
  showMenu: (x: number, y: number) => ipcRenderer.send('show-menu', x, y),
  onShown: (cb: () => void) => {
    ipcRenderer.on('shown', cb)
  },
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)

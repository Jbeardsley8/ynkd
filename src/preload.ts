import { contextBridge, ipcRenderer } from "electron";

export interface HistoryEntry {
    id: string;
    content: string;
    timestamp: number;
    pinned: boolean;
}

contextBridge.exposeInMainWorld("api", {
    getHistory: (): Promise<HistoryEntry[]> =>
        ipcRenderer.invoke("get-history"),
    copyEntry: (id: string): Promise<void> =>
        ipcRenderer.invoke("copy-entry", id),
    deleteEntry: (id: string): Promise<void> =>
        ipcRenderer.invoke("delete-entry", id),
    togglePin: (id: string): Promise<void> =>
        ipcRenderer.invoke("toggle-pin", id),
    onHistoryUpdated: (callback: (history: HistoryEntry[]) => void) => {
        ipcRenderer.on("history-updated", (_event, history) =>
            callback(history));
    },
    onWindowShown: (callback: () => void) => {
        ipcRenderer.on("window-shown", () => callback());
    },
});
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
    onHistoryUpdated: (callback: (history: HistoryEntry[]) => void) => {
        ipcRenderer.on("history-updated", (_event, history) =>
            callback(history));
    },
});
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
    onHistoryUpdated: (callback: (history: HistoryEntry[]) => void) => {
        ipcRenderer.on("history-updated", (_event, history) =>
            callback(history));
    },
});
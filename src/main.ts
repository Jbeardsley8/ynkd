import { app, BrowserWindow, clipboard, ipcMain } from "electron";
import path from "path";

interface HistoryEntry {
    id: string;
    content: string;
    timestamp: number;
    pinned: boolean;
}

const POLL_INTERVAL_MS = 500;
const MAX_ENTRIES = 50;

const history: HistoryEntry[] = [];
let lastSeen = "";
let mainWindow: BrowserWindow | null = null;

function pollClipboard(): void {
    const current = clipboard.readText();
    if (current && current !== lastSeen) {
        lastSeen = current;
        history.unshift({
            id: Date.now() + Math.random().toString(36).slice(2, 8),
            content: current,
            timestamp: Date.now(),
            pinned: false
        });
        if (history.length > MAX_ENTRIES) {
            history.pop();
        }
        const preview = current.length > 60 ? current.slice(0, 60) + "..." :
            current;
        if (mainWindow) {
            mainWindow.webContents.send("history-updated", history);
        }
        console.log(`captured: ${preview}`);
    }
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        },
    });

    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("get-history", () => history);
ipcMain.handle("copy-entry", (_event, id: string) => {
    const index = history.findIndex(e => e.id === id);
    if (index === -1) return;
    const [entry] = history.splice(index, 1);
    entry.timestamp = Date.now();
    history.unshift(entry);
    lastSeen = entry.content;
    clipboard.writeText(entry.content);
    if (mainWindow) {
        mainWindow.webContents.send("history-updated", history);
    }
});

app.whenReady().then(() => {
    createWindow();
    setInterval(pollClipboard, POLL_INTERVAL_MS);
});
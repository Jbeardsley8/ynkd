import { app, BrowserWindow, clipboard, ipcMain, Menu, Tray, nativeImage, globalShortcut } from "electron";
import path from "path";
import fs from "fs";

interface HistoryEntry {
    id: string;
    content: string;
    timestamp: number;
    pinned: boolean;
}

const POLL_INTERVAL_MS = 500;
const MAX_ENTRIES = 50;
let storageFile = "";
const history: HistoryEntry[] = [];
let lastSeen = "";
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let pollTimer: NodeJS.Timeout | null = null;

function normalizeEntry(value: unknown): HistoryEntry | null {
    if (typeof value !== "object" || value === null) return null;
    const v = value as Record<string, unknown>;
    if (typeof v.id !== "string") return null;
    if (typeof v.content !== "string") return null;
    if (typeof v.timestamp !== "number") return null;
    return {
        id: v.id,
        content: v.content,
        timestamp: v.timestamp,
        pinned: v.pinned === true,
    };
}

function parseHistory(raw: unknown): HistoryEntry[] {
    if (!Array.isArray(raw)) return [];
    const result: HistoryEntry[] = [];
    for (const item of raw) {
        const entry = normalizeEntry(item);
        if (entry !== null) result.push(entry);
    }
    return result;
}

function loadHistory(): void {
    try {
        if (!fs.existsSync(storageFile)) return;
        const raw = fs.readFileSync(storageFile, "utf8");
        const parsed: unknown = JSON.parse(raw);
        history.push(...parseHistory(parsed));
        if (history.length > 0) lastSeen = history[0].content;
    } catch (err) {
        console.error("Failed to load history:", err);
    }
}

function saveHistory(): void {
    try {
        fs.writeFileSync(storageFile, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error("Failed to save history:", err);
    }
}

function notifyHistoryChanged(): void {
    saveHistory();
    if (mainWindow) {
        mainWindow.webContents.send("history-updated", history);
    }
}

function toggleWindow(): void {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
}

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
            for (let i = history.length - 1; i >= 0; i--) {
                if (!history[i].pinned) {
                    history.splice(i, 1);
                    break;
                }
            }
        }
        const preview = current.length > 60 ? current.slice(0, 60) + "..." :
            current;
        notifyHistoryChanged();
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
    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}

function createTray(): void {
    const icon = nativeImage.createFromDataURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAQ0lEQVQ4T2NkoBAwUqifYdQAhpEBwH9G/v//z0AKYGRkBOnHpZmQfgYGqAGENDIyMjJgM4CYAEONIeQNYjQS0kuMfgBmIQYR9jqz1AAAAABJRU5ErkJggg=="
    ).resize({ width: 16, height: 16 });
    icon.setTemplateImage(true);

    tray = new Tray(icon);
    tray.setToolTip("ynkd");
    tray.on("click", toggleWindow);

    const menu = Menu.buildFromTemplate([
        { label: "Show / Hide (⌘⇧V)", click: toggleWindow },
        { type: "separator" },
        {
            label: "Clear history (keep pinned)",
            click: () => {
                const pinned = history.filter(e => e.pinned);
                history.length = 0;
                history.push(...pinned);
                notifyHistoryChanged();
            },
        },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
    console.log("Tray created");
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
    notifyHistoryChanged();
});

ipcMain.handle("delete-entry", (_event, id: string) => {
    const index = history.findIndex(e => e.id === id);
    if (index === -1) return;
    history.splice(index, 1);
    notifyHistoryChanged();
});

ipcMain.handle("toggle-pin", (_event, id: string) => {
    const entry = history.find(e => e.id === id);
    if (!entry) return;
    entry.pinned = !entry.pinned;
    notifyHistoryChanged();
})

app.whenReady().then(() => {
    storageFile = path.join(app.getPath("userData"), "history.json");
    console.log(`history file: ${storageFile}`);
    loadHistory();
    if (!lastSeen) lastSeen = clipboard.readText();
    createWindow();
    createTray();
    pollTimer = setInterval(pollClipboard, POLL_INTERVAL_MS);

    const registered = globalShortcut.register("CommandOrControl+Shift+V", toggleWindow);
    if (!registered) console.error("Failed to register global shortcut Command+Shift+V");
});

app.on("before-quit", () => {
    isQuitting = true;
});

app.on("will-quit", () => {
    if (pollTimer) clearInterval(pollTimer);
    globalShortcut.unregisterAll();
});
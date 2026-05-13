import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow(): void {
    const win = new BrowserWindow({
        width: 600,
        height: 400,
    })

    win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
    createWindow();
});
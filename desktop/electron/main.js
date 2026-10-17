const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const RENDERER = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer', 'index.html')
    : path.join(__dirname, '..', '..', 'client', 'dist', 'index.html');
const RENDERER_DIR = pathToFileURL(path.dirname(RENDERER)).href;

if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
    app.commandLine.appendSwitch('ozone-platform', 'wayland');
    app.disableHardwareAcceleration();
}

function isExternal(url) {
    return /^https?:\/\//i.test(url);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        minHeight: 560,
        title: 'Мультархив',
        backgroundColor: '#edf1f4',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (isExternal(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith(RENDERER_DIR)) return;
        event.preventDefault();
        if (isExternal(url)) shell.openExternal(url);
    });

    win.loadFile(RENDERER);
    if (process.env.NODE_ENV === 'development') win.webContents.openDevTools();
    return win;
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

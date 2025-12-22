const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const getPort = require('get-port');

let mainWindow;
let pythonProcess;

async function startBackend() {
    const port = await getPort({ port: 8000 });
    const isDev = !app.isPackaged;

    let pythonPath;
    let args = [];
    let cwd;

    if (isDev) {
        // In development, assume 'uv' is available and we're running from the root
        pythonPath = 'uv';
        args = ['run', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', port.toString()];
        cwd = path.join(__dirname, '../../backend');
    } else {
        // In production, the backend is bundled by PyInstaller
        // We expect it to be in the Resources folder or relative to the executable
        pythonPath = path.join(process.resourcesPath, 'backend_dist', 'backend_app');
        args = ['--host', '127.0.0.1', '--port', port.toString()];
        cwd = path.join(process.resourcesPath, 'backend_dist');
    }

    console.log(`Starting backend: ${pythonPath} ${args.join(' ')}`);

    pythonProcess = spawn(pythonPath, args, { cwd });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    return port;
}

async function createWindow() {
    const port = await startBackend();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#000000',
    });

    // Give the backend a moment to start
    setTimeout(() => {
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }, 2000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

process.on('exit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});

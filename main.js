const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:gmail',
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  // Set up permission handler for WebAuthn/passkeys
  const ses = session.fromPartition('persist:gmail');

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'clipboard-write', 'notifications'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(true); // Allow other permissions for Google auth
    }
  });

  ses.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  // Set a proper user agent to avoid Google blocking
  const userAgent = mainWindow.webContents.getUserAgent().replace(/Electron\/[\d.]+\s/, '');
  mainWindow.webContents.setUserAgent(userAgent);

  mainWindow.loadURL('https://mail.google.com');

  // Handle new windows (for OAuth popups and passkey flows)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google auth-related URLs to open in new windows
    if (url.includes('accounts.google.com') ||
        url.includes('google.com/signin') ||
        url.includes('gstatic.com') ||
        url.includes('googleapis.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'persist:gmail',
          }
        }
      };
    }

    // Open other external links in default browser
    if (!url.startsWith('https://mail.google.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

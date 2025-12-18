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

  const ses = session.fromPartition('persist:gmail');

  // Allow all permissions for Google auth flows
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  ses.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  // Enable WebAuthn device permissions
  ses.setDevicePermissionHandler((details) => {
    return true;
  });

  // Set a proper user agent (Chrome-like) to avoid Google blocking
  const chromeVersion = process.versions.chrome;
  const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
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

// Handle HID device selection (for security keys)
app.on('select-hid-device', (event, details, callback) => {
  event.preventDefault();
  if (details.deviceList && details.deviceList.length > 0) {
    callback(details.deviceList[0].deviceId);
  } else {
    callback('');
  }
});

// Handle USB device permission requests
app.on('select-usb-device', (event, details, callback) => {
  event.preventDefault();
  if (details.deviceList && details.deviceList.length > 0) {
    callback(details.deviceList[0].deviceId);
  } else {
    callback('');
  }
});

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

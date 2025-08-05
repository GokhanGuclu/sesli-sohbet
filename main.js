const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Güncelleme konfigürasyonu
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        title: 'Sesli Sohbet',
        show: false
    });

    // Geliştirme modunda devtools aç
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Güncelleme event'leri
autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Güncelleme kontrol ediliyor...');
});

autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Yeni güncelleme mevcut!');
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Güncelleme Mevcut',
        message: 'Yeni bir güncelleme mevcut. İndirmek istiyor musunuz?',
        buttons: ['İndir', 'İptal']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Güncel sürüm kullanıyorsunuz.');
});

autoUpdater.on('error', (err) => {
    sendStatusToWindow('Güncelleme hatası: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "İndirme hızı: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - İndirilen ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Güncelleme indirildi. Uygulama yeniden başlatılacak...');
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Güncelleme Hazır',
        message: 'Güncelleme indirildi. Uygulamayı yeniden başlatmak istiyor musunuz?',
        buttons: ['Yeniden Başlat', 'Daha Sonra']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

function sendStatusToWindow(text) {
    if (mainWindow) {
        mainWindow.webContents.send('update-status', text);
    }
}

// IPC event handlers
ipcMain.handle('check-for-updates', async () => {
    try {
        await autoUpdater.checkForUpdates();
        return { success: true, message: 'Güncelleme kontrolü başlatıldı' };
    } catch (error) {
        return { success: false, message: 'Güncelleme kontrolü başarısız: ' + error.message };
    }
});

ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true, message: 'Güncelleme indirme başlatıldı' };
    } catch (error) {
        return { success: false, message: 'Güncelleme indirme başarısız: ' + error.message };
    }
});

ipcMain.handle('install-update', async () => {
    try {
        autoUpdater.quitAndInstall();
        return { success: true, message: 'Güncelleme kuruluyor...' };
    } catch (error) {
        return { success: false, message: 'Güncelleme kurulumu başarısız: ' + error.message };
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

app.whenReady().then(() => {
    createWindow();
    
    // Uygulama başladığında güncelleme kontrolü yap
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);
});

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
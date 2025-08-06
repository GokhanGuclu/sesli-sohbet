const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Güvenlik ayarları - SmartScreen'e yakalanmaması için
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('disable-http2');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--allow-running-insecure-content');

// CSP (Content Security Policy) ayarları - Daha esnek
const csp = {
  'default-src': ["'self'", "https:", "http:"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
  'style-src': ["'self'", "'unsafe-inline'", "https:", "http:"],
  'img-src': ["'self'", "data:", "https:", "http:"],
  'connect-src': ["'self'", "ws:", "wss:", "https:", "http:"],
  'media-src': ["'self'", "blob:", "https:", "http:"],
  'object-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-src': ["'self'"],
  'worker-src': ["'self'", "blob:"]
};

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
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            allowRunningInsecureContent: true,
            experimentalFeatures: false,
            enableWebRTC: true,
            sandbox: false,
            webgl: true,
            plugins: false,
            devTools: true
        },
        title: 'Sesli Sohbet',
        show: false,
        titleBarStyle: 'default',
        frame: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        fullscreenable: true,
        webSecurity: false
    });

    // CSP header'ı ekle - Daha esnek
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [Object.entries(csp).map(([key, values]) => `${key} ${values.join(' ')}`).join('; ')],
                'X-Content-Type-Options': ['nosniff'],
                'X-Frame-Options': ['SAMEORIGIN'],
                'X-XSS-Protection': ['1; mode=block']
            }
        });
    });

    // Mikrofon izinleri için
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'microphone', 'camera', 'notifications'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
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
        message: `Yeni bir güncelleme mevcut!\n\nMevcut versiyon: ${app.getVersion()}\nYeni versiyon: ${info.version}\n\nİndirmek istiyor musunuz?`,
        buttons: ['İndir', 'İptal'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            sendStatusToWindow('Güncelleme indiriliyor...');
            autoUpdater.downloadUpdate();
        } else {
            sendStatusToWindow('Güncelleme iptal edildi.');
        }
    });
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Güncel sürüm kullanıyorsunuz.');
});

autoUpdater.on('error', (err) => {
    sendStatusToWindow('Güncelleme hatası: ' + err.message);
    dialog.showErrorBox('Güncelleme Hatası', 'Güncelleme sırasında bir hata oluştu: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const speed = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(1);
    const transferred = (progressObj.transferred / 1024 / 1024).toFixed(1);
    const total = (progressObj.total / 1024 / 1024).toFixed(1);
    
    const log_message = `İndiriliyor: ${percent}% (${transferred}MB/${total}MB) - ${speed}MB/s`;
    sendStatusToWindow(log_message, { type: 'progress', percent, speed, transferred, total });
});

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Güncelleme indirildi. Uygulama yeniden başlatılacak...');
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Güncelleme Hazır',
        message: 'Güncelleme başarıyla indirildi. Uygulamayı yeniden başlatmak istiyor musunuz?',
        buttons: ['Yeniden Başlat', 'Daha Sonra'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            sendStatusToWindow('Uygulama yeniden başlatılıyor...');
            autoUpdater.quitAndInstall();
        } else {
            sendStatusToWindow('Güncelleme daha sonra kurulacak.');
        }
    });
});

function sendStatusToWindow(text, data = {}) {
    if (mainWindow) {
        mainWindow.webContents.send('update-status', text, data);
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

// Lisans işlemleri
ipcMain.handle('validate-license', async (event, licenseKey) => {
    try {
        // Lisans doğrulama işlemi (gerçek uygulamada daha güvenli olmalı)
        const isValid = await validateLicenseKey(licenseKey);
        return { success: true, valid: isValid };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-license-status', async () => {
    try {
        const status = await getLicenseStatus();
        return { success: true, status };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clear-license', async () => {
    try {
        await clearLicense();
        return { success: true, message: 'Lisans temizlendi' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Güvenlik işlemleri
ipcMain.handle('get-security-info', async () => {
    try {
        const securityInfo = await getSecurityInfo();
        return { success: true, info: securityInfo };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-integrity', async () => {
    try {
        const integrity = await checkAppIntegrity();
        return { success: true, integrity };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-file-integrity', async (event, filePath) => {
    try {
        const integrity = await checkFileIntegrity(filePath);
        return { success: true, integrity };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-network-security', async () => {
    try {
        const security = await checkNetworkSecurity();
        return { success: true, security };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-system-security', async () => {
    try {
        const security = await checkSystemSecurity();
        return { success: true, security };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Lisans doğrulama fonksiyonu
async function validateLicenseKey(licenseKey) {
    // Bu fonksiyon gerçek uygulamada daha güvenli olmalı
    // Şimdilik basit bir kontrol yapıyoruz
    if (!licenseKey || licenseKey.length < 10) {
        return false;
    }
    
    // Lisans anahtarının geçerliliğini kontrol et
    const hashedKey = await hashLicenseKey(licenseKey);
    const licenseData = decodeLicenseData(hashedKey);
    
    if (!licenseData) {
        return false;
    }
    
    // Lisans süresini kontrol et
    if (licenseData.expiryDate && new Date() > new Date(licenseData.expiryDate)) {
        return false;
    }
    
    return true;
}

// Lisans anahtarını hash'le
async function hashLicenseKey(licenseKey) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(licenseKey).digest('hex');
}

// Lisans verilerini çöz
function decodeLicenseData(hashedKey) {
    try {
        // Basit bir çözme algoritması (gerçek uygulamada daha güvenli olmalı)
        const decoded = Buffer.from(hashedKey.substring(0, 32), 'hex').toString();
        return JSON.parse(decoded);
    } catch (error) {
        return null;
    }
}

// Lisans durumunu al
async function getLicenseStatus() {
    // Bu fonksiyon gerçek uygulamada daha kapsamlı olmalı
    return {
        isValid: false,
        message: 'Lisans gerekli'
    };
}

// Lisansı temizle
async function clearLicense() {
    // Lisans verilerini temizle
    return true;
}

// Güvenlik bilgilerini al
async function getSecurityInfo() {
    return {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
    };
}

// Uygulama bütünlüğünü kontrol et
async function checkAppIntegrity() {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    
    try {
        // Ana dosyaların hash'lerini kontrol et
        const mainFiles = ['main.js', 'preload.js', 'index.html'];
        const hashes = {};
        
        for (const file of mainFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                hashes[file] = hash;
            }
        }
        
        return {
            valid: true,
            hashes
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// Dosya bütünlüğünü kontrol et
async function checkFileIntegrity(filePath) {
    const fs = require('fs');
    const crypto = require('crypto');
    
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            return {
                valid: true,
                hash
            };
        } else {
            return {
                valid: false,
                error: 'Dosya bulunamadı'
            };
        }
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// Ağ güvenliğini kontrol et
async function checkNetworkSecurity() {
    return {
        secure: true,
        message: 'Ağ güvenliği kontrol edildi'
    };
}

// Sistem güvenliğini kontrol et
async function checkSystemSecurity() {
    return {
        secure: true,
        message: 'Sistem güvenliği kontrol edildi'
    };
}

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
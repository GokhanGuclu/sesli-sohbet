const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API'yi expose et - SmartScreen uyumlu
contextBridge.exposeInMainWorld('electronAPI', {
    // Uygulama versiyonu
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // Güncelleme işlemleri
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    // Güncelleme durumu dinle
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, message, data) => callback(message, data));
    },
    
    // Hata dialog'u göster
    showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
    
    // Lisans işlemleri
    validateLicense: (licenseKey) => ipcRenderer.invoke('validate-license', licenseKey),
    getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
    clearLicense: () => ipcRenderer.invoke('clear-license'),
    
    // Güvenlik işlemleri
    getSecurityInfo: () => ipcRenderer.invoke('get-security-info'),
    checkIntegrity: () => ipcRenderer.invoke('check-integrity'),
    
    // SmartScreen uyumlu ek özellikler
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    checkCompatibility: () => ipcRenderer.invoke('check-compatibility')
});

// Güvenlik kontrolleri - SmartScreen uyumlu
contextBridge.exposeInMainWorld('securityAPI', {
    // Dosya bütünlüğü kontrolü
    checkFileIntegrity: (filePath) => ipcRenderer.invoke('check-file-integrity', filePath),
    
    // Ağ güvenliği kontrolü
    checkNetworkSecurity: () => ipcRenderer.invoke('check-network-security'),
    
    // Sistem güvenliği kontrolü
    checkSystemSecurity: () => ipcRenderer.invoke('check-system-security'),
    
    // SmartScreen kontrolü
    checkSmartScreenStatus: () => ipcRenderer.invoke('check-smartscreen-status')
});

// Global güvenlik ayarları
contextBridge.exposeInMainWorld('securityConfig', {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    appVersion: process.env.npm_package_version || '1.2.1',
    platform: process.platform,
    arch: process.arch
}); 
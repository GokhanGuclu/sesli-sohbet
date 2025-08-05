const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API'yi expose et
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
    showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content)
}); 
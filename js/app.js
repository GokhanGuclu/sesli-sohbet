// Ana uygulama sınıfı
class App {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    // Uygulamayı başlat
    async init() {
        try {
            console.log('Sesli Sohbet uygulaması başlatılıyor...');
            
            // UI manager'ı başlat
            this.initializeUI();
            
            // WebSocket event listener'larını bağla
            this.bindWebSocketEvents();
            
            // WebRTC event listener'larını bağla
            this.bindWebRTCEvents();
            
            // Uygulama hazır
            this.isInitialized = true;
            console.log('Uygulama başarıyla başlatıldı');
            
        } catch (error) {
            console.error('Uygulama başlatma hatası:', error);
            this.showError('Uygulama başlatılamadı: ' + error.message);
        }
    }

    // UI'ı başlat
    initializeUI() {
        // UI manager'ın event listener'larını bağla
        uiManager.bindWebSocketEvents();
        uiManager.bindWebRTCEvents();
        
        // Sayfa yüklendiğinde çalışacak kodlar
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM yüklendi');
            
            // Varsayılan sunucu URL'sini ayarla
            const serverUrlInput = document.getElementById('server-url');
            if (serverUrlInput && !serverUrlInput.value) {
                serverUrlInput.value = CONFIG.DEFAULT_SERVER_URL;
            }
            
            // Mikrofon listesini başlat (eğer mikrofon izni verilmişse)
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                uiManager.initializeMicrophoneList().catch(error => {
                    console.log('Mikrofon listesi başlatılamadı (izin gerekli):', error);
                });
            }
            
            // Uygulama versiyonunu göster
            uiManager.showAppVersion();
        });
    }

    // WebSocket event listener'larını bağla
    bindWebSocketEvents() {
        // WebRTC mesajlarını işle
        wsManager.on('offer', (data) => {
            console.log('Offer alındı:', data.from);
            rtcManager.handleOffer(data.from, data.offer);
        });

        wsManager.on('answer', (data) => {
            console.log('Answer alındı:', data.from);
            rtcManager.handleAnswer(data.from, data.answer);
        });

        wsManager.on('iceCandidate', (data) => {
            console.log('ICE candidate alındı:', data.from);
            rtcManager.handleIceCandidate(data.from, data.candidate);
        });

        // Bağlantı durumu değişikliklerini dinle
        wsManager.on('connected', () => {
            console.log('WebSocket bağlantısı kuruldu');
        });

        wsManager.on('disconnected', () => {
            console.log('WebSocket bağlantısı kesildi');
        });

        wsManager.on('error', (error) => {
            console.error('WebSocket hatası:', error);
            this.showError('Bağlantı hatası: ' + error.message);
        });
    }

    // WebRTC event listener'larını bağla
    bindWebRTCEvents() {
        // Peer bağlantı durumu değişikliklerini dinle
        rtcManager.on('peerConnected', (clientId) => {
            console.log(`Peer bağlantısı kuruldu: ${clientId}`);
            this.showSuccess(`Sesli bağlantı kuruldu: ${clientId}`);
        });

        rtcManager.on('peerDisconnected', (clientId) => {
            console.log(`Peer bağlantısı kesildi: ${clientId}`);
            this.showError(`Sesli bağlantı kesildi: ${clientId}`);
        });

        rtcManager.on('connectionFailed', (clientId) => {
            console.error(`Bağlantı başarısız: ${clientId}`);
            this.showError(`Sesli bağlantı kurulamadı: ${clientId}`);
        });
    }

    // Hata göster
    showError(message) {
        if (uiManager) {
            uiManager.showError(message);
        } else {
            console.error(message);
            alert(message);
        }
    }

    // Başarı mesajı göster
    showSuccess(message) {
        if (uiManager) {
            uiManager.showSuccess(message);
        } else {
            console.log(message);
        }
    }

    // Uygulama durumunu al
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            websocketStatus: wsManager ? wsManager.getConnectionStatus() : null,
            rtcStatus: rtcManager ? rtcManager.getStatus() : null,
            uiStatus: uiManager ? {
                currentScreen: uiManager.currentScreen,
                currentUser: uiManager.currentUser,
                currentRoom: uiManager.currentRoom,
                userCount: uiManager.users.size,
                messageCount: uiManager.messages.length
            } : null
        };
    }
}

// Uygulamayı başlat
window.addEventListener('load', () => {
    window.app = new App();
});

// Global hata yakalama
window.addEventListener('error', (event) => {
    console.error('Global hata:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('İşlenmeyen promise hatası:', event.reason);
});

// Sayfa kapatılırken temizlik yap
window.addEventListener('beforeunload', () => {
    if (wsManager) {
        wsManager.disconnect();
    }
    if (rtcManager) {
        rtcManager.closeAllConnections();
    }
});

// Electron API kontrolü
if (window.electronAPI) {
    console.log('Electron API mevcut');
    
    // Uygulama versiyonunu al
    window.electronAPI.getAppVersion().then(version => {
        console.log('Uygulama versiyonu:', version);
    }).catch(error => {
        console.error('Versiyon bilgisi alınamadı:', error);
    });
} else {
    console.log('Electron API mevcut değil - web modunda çalışıyor');
} 
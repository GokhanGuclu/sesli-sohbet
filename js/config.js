// Uygulama konfigürasyonu
const CONFIG = {
    // WebSocket sunucu URL'si - Localhost için
    DEFAULT_SERVER_URL: 'ws://localhost:8000/ws',
    
    // WebRTC konfigürasyonu
    RTC_CONFIG: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    },
    
    // Uygulama ayarları
    APP_SETTINGS: {
        maxMessageLength: 1000,
        reconnectAttempts: 5,
        reconnectDelay: 3000,
        heartbeatInterval: 30000
    },
    
    // UI ayarları
    UI_SETTINGS: {
        messageDisplayTime: 5000,
        typingIndicatorTimeout: 3000,
        autoScrollThreshold: 100
    }
};

// Konfigürasyonu dışa aktar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
} 
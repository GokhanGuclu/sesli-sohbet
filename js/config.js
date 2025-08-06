// Uygulama konfigürasyonu
const CONFIG = {
    // WebSocket sunucu URL'si - Localhost için
    DEFAULT_SERVER_URL: 'ws://localhost:8000/ws',
    
    // WebRTC konfigürasyonu - Chrome tabanlı tarayıcılar için optimize edildi
    RTC_CONFIG: {
        iceServers: [
            // Google STUN sunucuları (en güvenilir)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Ek STUN sunucuları
            { urls: 'stun:stun.voiparound.com:3478' },
            { urls: 'stun:stun.voipbuster.com:3478' },
            { urls: 'stun:stun.voipstunt.com:3478' },
            { urls: 'stun:stun.voxgratia.org:3478' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        // Chrome tabanlı tarayıcılar için ek optimizasyonlar
        sdpSemantics: 'unified-plan',
        // Chrome için özel ayarlar
        iceServersPolicy: 'all',
        // ICE candidate toplama stratejisi
        iceCandidatePoolSize: 10
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
// WebSocket bağlantı yönetimi
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.APP_SETTINGS.reconnectAttempts;
        this.reconnectDelay = CONFIG.APP_SETTINGS.reconnectDelay;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.eventListeners = {};
    }

    // WebSocket bağlantısını başlat
    connect(serverUrl, clientId) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${serverUrl}/${clientId}`;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket bağlantısı kuruldu');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.processMessageQueue();
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Mesaj parse hatası:', error);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('WebSocket bağlantısı kapandı:', event.code, event.reason);
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.emit('disconnected', event);
                    
                    // Otomatik yeniden bağlanma
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket hatası:', error);
                    this.emit('error', error);
                    reject(error);
                };

            } catch (error) {
                console.error('WebSocket bağlantı hatası:', error);
                reject(error);
            }
        });
    }

    // WebSocket bağlantısını kapat
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Kullanıcı ayrıldı');
            this.ws = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();
        this.reconnectAttempts = 0;
    }

    // Mesaj gönder
    send(message) {
        if (this.isConnected && this.ws) {
            try {
                this.ws.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error('Mesaj gönderme hatası:', error);
                this.messageQueue.push(message);
                return false;
            }
        } else {
            this.messageQueue.push(message);
            return false;
        }
    }

    // Odaya katıl
    joinRoom(roomId) {
        return this.send({
            type: 'join_room',
            room_id: roomId
        });
    }

    // WebRTC offer gönder
    sendOffer(targetClient, offer) {
        return this.send({
            type: 'offer',
            to: targetClient,
            offer: offer
        });
    }

    // WebRTC answer gönder
    sendAnswer(targetClient, answer) {
        return this.send({
            type: 'answer',
            to: targetClient,
            answer: answer
        });
    }

    // ICE candidate gönder
    sendIceCandidate(targetClient, candidate) {
        return this.send({
            type: 'ice_candidate',
            to: targetClient,
            candidate: candidate
        });
    }

    // Mesaj işleme
    handleMessage(data) {
        const { type } = data;
        
        switch (type) {
            case 'user_joined':
                this.emit('userJoined', data);
                break;
            case 'user_left':
                this.emit('userLeft', data);
                break;
            case 'room_users':
                this.emit('roomUsers', data);
                break;
            case 'offer':
                this.emit('offer', data);
                break;
            case 'answer':
                this.emit('answer', data);
                break;
            case 'ice_candidate':
                this.emit('iceCandidate', data);
                break;
            default:
                console.log('Bilinmeyen mesaj tipi:', type);
        }
    }

    // Heartbeat başlat
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, CONFIG.APP_SETTINGS.heartbeatInterval);
    }

    // Heartbeat durdur
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Yeniden bağlanma planla
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`${delay}ms sonra yeniden bağlanma denemesi ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect(this.ws.url, this.clientId)
                    .catch(error => {
                        console.error('Yeniden bağlanma hatası:', error);
                    });
            }
        }, delay);
    }

    // Mesaj kuyruğunu işle
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    // Event listener ekle
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    // Event listener kaldır
    off(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    // Event emit
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener hatası (${event}):`, error);
                }
            });
        }
    }

    // Bağlantı durumunu kontrol et
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Global WebSocket manager instance'ı oluştur
window.wsManager = new WebSocketManager(); 
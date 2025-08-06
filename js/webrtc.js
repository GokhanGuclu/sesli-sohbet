// WebRTC ses iletişimi yönetimi
class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStreams = new Map();
        this.peerConnections = new Map();
        this.isMuted = false;
        this.isDeafened = false;
        this.localAudioElement = null;
        this.remoteAudioElements = new Map();
        this.volumeLevel = 0.5;
        this.availableDevices = [];
        this.selectedDeviceId = null;
        this.pendingIceCandidates = new Map();
        this.connectionTimeouts = new Map();
        this.retryCounts = new Map(); // Yeniden deneme sayılarını tutmak için
        
        this.initializeAudioElements();
    }

    // Ses elementlerini başlat
    initializeAudioElements() {
        // Yerel ses elementi
        this.localAudioElement = document.createElement('audio');
        this.localAudioElement.autoplay = true;
        this.localAudioElement.muted = true; // Kendi sesimizi duymayalım
        document.body.appendChild(this.localAudioElement);
    }

    // Kullanılabilir ses cihazlarını al
    async getAvailableDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');
            console.log('Kullanılabilir ses cihazları:', this.availableDevices);
            return this.availableDevices;
        } catch (error) {
            console.error('Cihaz listesi alınamadı:', error);
            return [];
        }
    }

    // Mikrofon erişimi iste
    async requestMicrophoneAccess(deviceId = null) {
        try {
            // Önce cihaz listesini al
            await this.getAvailableDevices();
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1
                },
                video: false
            };

            // Eğer belirli bir cihaz seçilmişse, onu kullan
            if (deviceId) {
                constraints.audio.deviceId = { exact: deviceId };
                this.selectedDeviceId = deviceId;
            }

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Yerel ses akışını elemente bağla
            this.localAudioElement.srcObject = this.localStream;
            
            console.log('Mikrofon erişimi başarılı:', this.localStream.getAudioTracks()[0].label);
            return true;
        } catch (error) {
            console.error('Mikrofon erişimi hatası:', error);
            throw error;
        }
    }

    // Mikrofon değiştir
    async changeMicrophone(deviceId) {
        try {
            // Mevcut stream'i durdur
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }

            // Yeni mikrofon ile stream al
            await this.requestMicrophoneAccess(deviceId);

            // Tüm peer connection'larda yeni stream'i güncelle
            this.peerConnections.forEach((peerConnection, clientId) => {
                const senders = peerConnection.getSenders();
                const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
                if (audioSender && this.localStream) {
                    const audioTrack = this.localStream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioSender.replaceTrack(audioTrack);
                        console.log(`Mikrofon güncellendi: ${clientId}`);
                    }
                }
            });

            console.log('Mikrofon başarıyla değiştirildi');
            return true;
        } catch (error) {
            console.error('Mikrofon değiştirme hatası:', error);
            throw error;
        }
    }

    // Peer connection oluştur
    createPeerConnection(targetClientId) {
        console.log(`Peer connection oluşturuluyor: ${targetClientId}`);
        
        const peerConnection = new RTCPeerConnection(CONFIG.RTC_CONFIG);
        
        // Yerel ses akışını ekle
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('Ses track ekleniyor:', track.kind, track.label);
                peerConnection.addTrack(track, this.localStream);
            });
        } else {
            console.warn('Yerel ses akışı bulunamadı');
        }

        // Uzak ses akışını dinle
        peerConnection.ontrack = (event) => {
            console.log('Uzak ses akışı alındı:', targetClientId, event.streams);
            if (event.streams && event.streams.length > 0) {
                this.handleRemoteStream(targetClientId, event.streams[0]);
            }
        };

        // ICE candidate'ları dinle
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate gönderiliyor:', targetClientId, event.candidate.type);
                wsManager.sendIceCandidate(targetClientId, event.candidate);
            } else {
                console.log('ICE candidate toplama tamamlandı:', targetClientId);
            }
        };

        // Bağlantı durumu değişikliklerini dinle
        peerConnection.onconnectionstatechange = () => {
            console.log(`Peer connection durumu (${targetClientId}):`, peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'connected') {
                console.log(`Peer bağlantısı başarılı: ${targetClientId}`);
                this.emit('peerConnected', targetClientId);
            } else if (peerConnection.connectionState === 'disconnected' || 
                       peerConnection.connectionState === 'failed') {
                console.warn(`Peer bağlantısı kesildi: ${targetClientId} (${peerConnection.connectionState})`);
                this.emit('peerDisconnected', targetClientId);
                
                // Bağlantı başarısız olduğunda yeniden deneme
                if (peerConnection.connectionState === 'failed') {
                    console.warn(`Peer connection başarısız (${targetClientId}), yeniden deneniyor...`);
                    this.retryConnection(targetClientId);
                }
            } else if (peerConnection.connectionState === 'connecting') {
                console.log(`Peer bağlantısı kuruluyor: ${targetClientId}`);
            }
        };

        // ICE connection state değişikliklerini dinle
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection durumu (${targetClientId}):`, peerConnection.iceConnectionState);
            
            // ICE bağlantısı başarısız olduğunda
            if (peerConnection.iceConnectionState === 'failed') {
                console.warn(`ICE bağlantısı başarısız (${targetClientId}), yeniden deneniyor...`);
                this.retryConnection(targetClientId);
            } else if (peerConnection.iceConnectionState === 'connected') {
                console.log(`ICE bağlantısı başarılı (${targetClientId})`);
                // Başarılı bağlantıda retry count'u sıfırla
                this.retryCounts.delete(targetClientId);
            } else if (peerConnection.iceConnectionState === 'checking') {
                console.log(`ICE bağlantısı kontrol ediliyor (${targetClientId})`);
            } else if (peerConnection.iceConnectionState === 'disconnected') {
                console.warn(`ICE bağlantısı kesildi (${targetClientId})`);
            } else if (peerConnection.iceConnectionState === 'completed') {
                console.log(`ICE bağlantısı tamamlandı (${targetClientId})`);
            }
        };

        // Signaling state değişikliklerini dinle
        peerConnection.onsignalingstatechange = () => {
            console.log(`Signaling state (${targetClientId}):`, peerConnection.signalingState);
            
            // Remote description set edildiğinde pending ICE candidate'ları ekle
            if (peerConnection.signalingState === 'stable' && this.pendingIceCandidates && this.pendingIceCandidates.has(targetClientId)) {
                this.processPendingIceCandidates(targetClientId, peerConnection);
            }
        };

        this.peerConnections.set(targetClientId, peerConnection);
        console.log(`Peer connection oluşturuldu: ${targetClientId}`);
        return peerConnection;
    }

    // Pending ICE candidate'ları işle
    async processPendingIceCandidates(clientId, peerConnection) {
        if (!this.pendingIceCandidates || !this.pendingIceCandidates.has(clientId)) {
            return;
        }

        const candidates = this.pendingIceCandidates.get(clientId);
        console.log(`${candidates.length} pending ICE candidate işleniyor: ${clientId}`);

        for (const candidate of candidates) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`Pending ICE candidate eklendi: ${clientId}`);
            } catch (error) {
                console.warn(`Pending ICE candidate eklenemedi (${clientId}):`, error.message);
                // Bu normal bir durum olabilir, candidate zaten eklenmiş olabilir
                // veya candidate geçersiz olabilir
            }
        }

        // İşlenen candidate'ları temizle
        this.pendingIceCandidates.delete(clientId);
        console.log(`Pending ICE candidate'lar temizlendi: ${clientId}`);
    }

    // Uzak ses akışını işle
    handleRemoteStream(clientId, stream) {
        console.log(`Uzak ses akışı işleniyor: ${clientId}`, stream);
        
        // Mevcut ses elementini kaldır
        const existingAudio = this.remoteAudioElements.get(clientId);
        if (existingAudio) {
            existingAudio.remove();
        }

        // Uzak ses elementi oluştur
        const audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.srcObject = stream;
        audioElement.volume = this.volumeLevel;
        audioElement.id = `remote-audio-${clientId}`;
        // Electron ortamında muted=false olmalı
        if (window && window.process && window.process.type === 'renderer') {
            audioElement.muted = false;
        }
        // Ses seviyesini ayarla
        if (this.isDeafened) {
            audioElement.muted = true;
        }
        // Sadece bir kez ekle
        if (!document.getElementById(audioElement.id)) {
            document.body.appendChild(audioElement);
        }
        this.remoteAudioElements.set(clientId, audioElement);
        this.remoteStreams.set(clientId, stream);
        console.log(`Uzak ses akışı eklendi: ${clientId}`);
    }

    // Offer oluştur ve gönder
    async createAndSendOffer(targetClientId) {
        try {
            console.log(`Offer oluşturuluyor: ${targetClientId}`);
            
            // Eğer zaten bir peer connection varsa, önce onu kapat
            if (this.peerConnections.has(targetClientId)) {
                console.log(`Mevcut peer connection kapatılıyor: ${targetClientId}`);
                this.closePeerConnection(targetClientId);
            }
            
            const peerConnection = this.createPeerConnection(targetClientId);
            
            // Timeout ekle (daha uzun süre)
            const timeout = setTimeout(() => {
                if (peerConnection.signalingState !== 'stable') {
                    console.warn(`Offer timeout: ${targetClientId}`);
                    this.closePeerConnection(targetClientId);
                }
            }, 15000); // 15 saniye timeout (artırıldı)
            
            this.connectionTimeouts.set(targetClientId, timeout);
            
            const offer = await peerConnection.createOffer();
            console.log(`Offer oluşturuldu: ${targetClientId}`, offer.type);
            await peerConnection.setLocalDescription(offer);
            
            // Timeout'u temizle
            this.clearConnectionTimeout(targetClientId);
            
            wsManager.sendOffer(targetClientId, offer);
            console.log(`Offer gönderildi: ${targetClientId}`);
        } catch (error) {
            console.error('Offer oluşturma hatası:', error);
            this.clearConnectionTimeout(targetClientId);
        }
    }

    // Offer al ve answer gönder
    async handleOffer(fromClientId, offer) {
        try {
            console.log(`Offer alındı: ${fromClientId}`, offer.type);
            
            // Eğer zaten bir peer connection varsa, önce onu kapat
            if (this.peerConnections.has(fromClientId)) {
                console.log(`Mevcut peer connection kapatılıyor: ${fromClientId}`);
                this.closePeerConnection(fromClientId);
            }
            
            const peerConnection = this.createPeerConnection(fromClientId);
            
            // Timeout ekle (daha uzun süre)
            const timeout = setTimeout(() => {
                if (peerConnection.signalingState !== 'stable') {
                    console.warn(`Answer timeout: ${fromClientId}`);
                    this.closePeerConnection(fromClientId);
                }
            }, 15000); // 15 saniye timeout (artırıldı)
            
            this.connectionTimeouts.set(fromClientId, timeout);
            
            // Önce remote description'ı set et
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Remote description set edildi: ${fromClientId}`);
            
            // Sonra answer oluştur
            const answer = await peerConnection.createAnswer();
            console.log(`Answer oluşturuldu: ${fromClientId}`, answer.type);
            await peerConnection.setLocalDescription(answer);
            
            // Timeout'u temizle
            this.clearConnectionTimeout(fromClientId);
            
            wsManager.sendAnswer(fromClientId, answer);
            console.log(`Answer gönderildi: ${fromClientId}`);
        } catch (error) {
            console.error('Answer oluşturma hatası:', error);
            this.clearConnectionTimeout(fromClientId);
        }
    }

    // Answer al
    async handleAnswer(fromClientId, answer) {
        try {
            console.log(`Answer alındı: ${fromClientId}`, answer.type);
            const peerConnection = this.peerConnections.get(fromClientId);
            
            if (peerConnection) {
                // Peer connection'ın durumunu kontrol et
                if (peerConnection.signalingState === 'have-local-offer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log(`Answer işlendi: ${fromClientId}`);
                } else {
                    console.warn(`Peer connection yanlış durumda (${fromClientId}): ${peerConnection.signalingState}`);
                }
            } else {
                console.warn(`Peer connection bulunamadı: ${fromClientId}`);
            }
        } catch (error) {
            console.error('Answer işleme hatası:', error);
        }
    }

    // ICE candidate al
    async handleIceCandidate(fromClientId, candidate) {
        try {
            console.log(`ICE candidate alındı: ${fromClientId}`, candidate.type);
            const peerConnection = this.peerConnections.get(fromClientId);
            
            if (!peerConnection) {
                console.warn(`Peer connection bulunamadı: ${fromClientId}`);
                return;
            }

            // Peer connection'ın durumunu kontrol et
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(`ICE candidate eklendi: ${fromClientId}`);
                } catch (iceError) {
                    console.warn(`ICE candidate eklenemedi (${fromClientId}):`, iceError.message);
                    // Bu normal bir durum olabilir, candidate zaten eklenmiş olabilir
                    // veya candidate geçersiz olabilir
                }
            } else {
                console.log(`Remote description henüz set edilmedi, ICE candidate bekletiliyor: ${fromClientId}`);
                // ICE candidate'ı daha sonra eklemek için sakla
                if (!this.pendingIceCandidates) {
                    this.pendingIceCandidates = new Map();
                }
                if (!this.pendingIceCandidates.has(fromClientId)) {
                    this.pendingIceCandidates.set(fromClientId, []);
                }
                this.pendingIceCandidates.get(fromClientId).push(candidate);
            }
        } catch (error) {
            console.error('ICE candidate işleme hatası:', error);
        }
    }

    // Mikrofonu sustur/aç
    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                console.log(`Mikrofon ${this.isMuted ? 'susturuldu' : 'açıldı'}`);
            }
        }
        return this.isMuted;
    }

    // Sesi kapat/aç
    toggleDeafen() {
        this.isDeafened = !this.isDeafened;
        
        // Tüm uzak ses elementlerini güncelle
        this.remoteAudioElements.forEach((audioElement, clientId) => {
            audioElement.muted = this.isDeafened;
        });
        
        console.log(`Ses ${this.isDeafened ? 'kapatıldı' : 'açıldı'}`);
        return this.isDeafened;
    }

    // Ses seviyesini ayarla
    setVolume(level) {
        this.volumeLevel = Math.max(0, Math.min(1, level));
        
        // Tüm uzak ses elementlerini güncelle
        this.remoteAudioElements.forEach((audioElement, clientId) => {
            audioElement.volume = this.volumeLevel;
        });
        
        console.log(`Ses seviyesi ayarlandı: ${this.volumeLevel}`);
    }

    // Peer connection'ı kapat
    closePeerConnection(clientId) {
        const peerConnection = this.peerConnections.get(clientId);
        if (peerConnection) {
            console.log(`Peer connection kapatılıyor: ${clientId}`);
            peerConnection.close();
            this.peerConnections.delete(clientId);
        }

        // Uzak ses elementini kaldır
        const audioElement = this.remoteAudioElements.get(clientId);
        if (audioElement) {
            audioElement.remove();
            this.remoteAudioElements.delete(clientId);
        }

        // Pending ICE candidate'ları temizle
        if (this.pendingIceCandidates && this.pendingIceCandidates.has(clientId)) {
            this.pendingIceCandidates.delete(clientId);
        }

        // Connection timeout'ını temizle
        this.clearConnectionTimeout(clientId);

        // Yeniden deneme sayısını temizle
        this.retryCounts.delete(clientId);

        this.remoteStreams.delete(clientId);
        console.log(`Peer connection kapatıldı: ${clientId}`);
    }

    // Tüm bağlantıları kapat
    closeAllConnections() {
        console.log('Tüm WebRTC bağlantıları kapatılıyor...');
        
        this.peerConnections.forEach((peerConnection, clientId) => {
            console.log(`Peer connection kapatılıyor: ${clientId}`);
            peerConnection.close();
        });
        this.peerConnections.clear();

        this.remoteAudioElements.forEach((audioElement, clientId) => {
            console.log(`Uzak ses elementi kaldırılıyor: ${clientId}`);
            audioElement.remove();
        });
        this.remoteAudioElements.clear();
        this.remoteStreams.clear();

        // Pending ICE candidate'ları temizle
        if (this.pendingIceCandidates) {
            this.pendingIceCandidates.clear();
        }

        // Connection timeout'larını temizle
        this.connectionTimeouts.forEach((timeout, clientId) => {
            clearTimeout(timeout);
        });
        this.connectionTimeouts.clear();

        // Yeniden deneme sayılarını temizle
        this.retryCounts.clear();

        // Yerel ses akışını durdur
        if (this.localStream) {
            console.log('Yerel ses akışı durduruluyor');
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        console.log('Tüm WebRTC bağlantıları kapatıldı');
    }

    // Durum bilgilerini al
    getStatus() {
        return {
            isMuted: this.isMuted,
            isDeafened: this.isDeafened,
            volumeLevel: this.volumeLevel,
            activeConnections: this.peerConnections.size,
            hasLocalStream: !!this.localStream,
            availableDevices: this.availableDevices.length,
            selectedDeviceId: this.selectedDeviceId,
            connectionStates: Array.from(this.peerConnections.entries()).map(([clientId, pc]) => ({
                clientId,
                connectionState: pc.connectionState,
                iceConnectionState: pc.iceConnectionState,
                signalingState: pc.signalingState
            }))
        };
    }

    // Event listener'lar için basit sistem
    on(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners && this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener hatası (${event}):`, error);
                }
            });
        }
    }

    // Connection timeout'ını temizle
    clearConnectionTimeout(clientId) {
        const timeout = this.connectionTimeouts.get(clientId);
        if (timeout) {
            console.log(`Connection timeout temizleniyor: ${clientId}`);
            clearTimeout(timeout);
            this.connectionTimeouts.delete(clientId);
        }
    }

    // Bağlantıyı yeniden dene
    async retryConnection(targetClientId, maxRetries = 3) {
        const retryCount = this.retryCounts.get(targetClientId) || 0;
        
        if (retryCount >= maxRetries) {
            console.error(`Maksimum yeniden deneme sayısına ulaşıldı (${targetClientId})`);
            this.emit('connectionFailed', targetClientId);
            return;
        }

        console.log(`Bağlantı yeniden deneniyor (${targetClientId}) - Deneme ${retryCount + 1}/${maxRetries}`);
        
        // Mevcut bağlantıyı kapat
        this.closePeerConnection(targetClientId);
        
        // Yeniden deneme sayısını artır
        this.retryCounts.set(targetClientId, retryCount + 1);
        
        // Exponential backoff ile bekleme süresi
        const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000);
        console.log(`${waitTime}ms sonra yeniden deneme...`);
        
        // Bekle ve yeniden dene
        setTimeout(async () => {
            try {
                console.log(`Yeniden deneme başlatılıyor: ${targetClientId}`);
                await this.createAndSendOffer(targetClientId);
            } catch (error) {
                console.error(`Yeniden deneme hatası (${targetClientId}):`, error);
            }
        }, waitTime);
    }
}

// Global WebRTC manager instance'ı oluştur
window.rtcManager = new WebRTCManager(); 
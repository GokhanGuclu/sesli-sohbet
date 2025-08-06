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
        
        // Chrome tabanlı tarayıcılar için özel konfigürasyon
        const rtcConfig = {
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
                { urls: 'stun:stun.voxgratia.org:3478' },
                // Chrome için ek sunucular
                { urls: 'stun:stun.ekiga.net:3478' },
                { urls: 'stun:stun.ideasip.com:3478' },
                { urls: 'stun:stun.rixtelecom.se:3478' },
                { urls: 'stun:stun.schlund.de:3478' }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan',
            // Chrome tabanlı tarayıcılar için ek ayarlar
            iceServersPolicy: 'all'
        };
        
        const peerConnection = new RTCPeerConnection(rtcConfig);
        
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

        // ICE candidate'ları dinle - Chrome için optimize edildi
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate gönderiliyor:', targetClientId, event.candidate.type, event.candidate.candidate);
                
                // Chrome tabanlı tarayıcılar için candidate filtreleme
                if (this.isValidIceCandidate(event.candidate)) {
                    wsManager.sendIceCandidate(targetClientId, event.candidate);
                } else {
                    console.log('Geçersiz ICE candidate filtrelendi:', event.candidate.type);
                }
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
            
            // Chrome tabanlı tarayıcılar için ek durum kontrolü
            if (peerConnection.signalingState === 'have-remote-offer' && this.pendingIceCandidates && this.pendingIceCandidates.has(targetClientId)) {
                console.log(`Remote offer durumunda pending candidate'lar işleniyor: ${targetClientId}`);
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
                // Chrome tabanlı tarayıcılar için candidate geçerlilik kontrolü
                if (this.isValidIceCandidate(candidate)) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(`Pending ICE candidate eklendi: ${clientId}`, candidate.type);
                } else {
                    console.log(`Pending ICE candidate filtrelendi: ${clientId}`, candidate.type);
                }
            } catch (error) {
                console.warn(`Pending ICE candidate eklenemedi (${clientId}):`, error.message);
                // Chrome tabanlı tarayıcılar için hata durumunda devam et
                continue;
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
            
            // Chrome tabanlı tarayıcılar için özel bağlantı yönetimi
            this.handleChromeConnection(targetClientId);
            
            // Timeout ekle (Chrome için daha uzun süre)
            const timeout = setTimeout(() => {
                if (peerConnection.signalingState !== 'stable') {
                    console.warn(`Offer timeout: ${targetClientId}`);
                    this.closePeerConnection(targetClientId);
                }
            }, 25000); // 25 saniye timeout (Chrome için artırıldı)
            
            this.connectionTimeouts.set(targetClientId, timeout);
            
            // Chrome tabanlı tarayıcılar için özel offer konfigürasyonu
            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
                voiceActivityDetection: true,
                // Chrome için ek ayarlar
                iceRestart: false
            };
            
            const offer = await peerConnection.createOffer(offerOptions);
            console.log(`Offer oluşturuldu: ${targetClientId}`, offer.type);
            
            // Chrome için SDP optimizasyonu
            if (offer.sdp) {
                offer.sdp = this.optimizeSdpForChrome(offer.sdp);
                console.log(`SDP optimize edildi: ${targetClientId}`);
            }
            
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
            
            // Chrome tabanlı tarayıcılar için özel bağlantı yönetimi
            this.handleChromeConnection(fromClientId);
            
            // Timeout ekle (Chrome için daha uzun süre)
            const timeout = setTimeout(() => {
                if (peerConnection.signalingState !== 'stable') {
                    console.warn(`Answer timeout: ${fromClientId}`);
                    this.closePeerConnection(fromClientId);
                }
            }, 25000); // 25 saniye timeout (Chrome için artırıldı)
            
            this.connectionTimeouts.set(fromClientId, timeout);
            
            // Chrome için SDP optimizasyonu
            if (offer.sdp) {
                offer.sdp = this.optimizeSdpForChrome(offer.sdp);
                console.log(`Gelen SDP optimize edildi: ${fromClientId}`);
            }
            
            // Önce remote description'ı set et
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Remote description set edildi: ${fromClientId}`);
            
            // Sonra answer oluştur
            const answerOptions = {
                voiceActivityDetection: true
            };
            
            const answer = await peerConnection.createAnswer(answerOptions);
            console.log(`Answer oluşturuldu: ${fromClientId}`, answer.type);
            
            // Chrome için SDP optimizasyonu
            if (answer.sdp) {
                answer.sdp = this.optimizeSdpForChrome(answer.sdp);
                console.log(`Answer SDP optimize edildi: ${fromClientId}`);
            }
            
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
                // Chrome için SDP optimizasyonu
                if (answer.sdp) {
                    answer.sdp = this.optimizeSdpForChrome(answer.sdp);
                }
                
                // Peer connection'ın durumunu kontrol et - Chrome için daha esnek kontrol
                if (peerConnection.signalingState === 'have-local-offer' || 
                    peerConnection.signalingState === 'stable') {
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                        console.log(`Answer işlendi: ${fromClientId}`);
                    } catch (error) {
                        console.warn(`Answer set edilirken hata (${fromClientId}):`, error.message);
                        // Chrome tabanlı tarayıcılar için yeniden deneme
                        if (error.name === 'InvalidStateError') {
                            console.log(`Peer connection durumu uygun değil, yeniden deneniyor: ${fromClientId}`);
                            // Kısa bir bekleme sonrası tekrar dene
                            setTimeout(async () => {
                                try {
                                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                                    console.log(`Answer yeniden deneme başarılı: ${fromClientId}`);
                                } catch (retryError) {
                                    console.error(`Answer yeniden deneme başarısız (${fromClientId}):`, retryError.message);
                                }
                            }, 1000);
                        }
                    }
                } else {
                    console.warn(`Peer connection yanlış durumda (${fromClientId}): ${peerConnection.signalingState}`);
                    // Chrome tabanlı tarayıcılar için durum kontrolünü esnet
                    if (peerConnection.signalingState === 'have-remote-offer') {
                        console.log(`Remote offer durumunda answer işleniyor: ${fromClientId}`);
                        try {
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                            console.log(`Answer işlendi (remote offer durumunda): ${fromClientId}`);
                        } catch (error) {
                            console.error(`Answer işleme hatası (remote offer): ${fromClientId}`, error.message);
                        }
                    }
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
            console.log(`ICE candidate alındı: ${fromClientId}`, candidate.type, candidate.candidate);
            const peerConnection = this.peerConnections.get(fromClientId);
            
            if (!peerConnection) {
                console.warn(`Peer connection bulunamadı: ${fromClientId}`);
                return;
            }

            // Chrome tabanlı tarayıcılar için candidate geçerlilik kontrolü
            if (!this.isValidIceCandidate(candidate)) {
                console.log(`Geçersiz ICE candidate filtrelendi: ${fromClientId}`, candidate.type);
                return;
            }

            // Peer connection'ın durumunu kontrol et - Chrome için daha esnek kontrol
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(`ICE candidate eklendi: ${fromClientId}`, candidate.type);
                } catch (iceError) {
                    console.warn(`ICE candidate eklenemedi (${fromClientId}):`, iceError.message);
                    // Chrome tabanlı tarayıcılar için özel hata yönetimi
                    if (iceError.name === 'InvalidStateError' || iceError.name === 'OperationError') {
                        console.log(`Peer connection henüz hazır değil, candidate bekletiliyor: ${fromClientId}`);
                        // Candidate'ı daha sonra eklemek için sakla
                        if (!this.pendingIceCandidates) {
                            this.pendingIceCandidates = new Map();
                        }
                        if (!this.pendingIceCandidates.has(fromClientId)) {
                            this.pendingIceCandidates.set(fromClientId, []);
                        }
                        this.pendingIceCandidates.get(fromClientId).push(candidate);
                    }
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
    async retryConnection(targetClientId, maxRetries = 5) {
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
        
        // Chrome tabanlı tarayıcılar için exponential backoff ile bekleme süresi
        const waitTime = Math.min(4000 * Math.pow(2, retryCount), 20000); // Chrome için daha uzun bekleme
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

    // Chrome tabanlı tarayıcılar için özel bağlantı yönetimi
    async handleChromeConnection(targetClientId) {
        console.log(`Chrome tabanlı tarayıcı bağlantısı yönetiliyor: ${targetClientId}`);
        
        // Chrome tabanlı tarayıcılar için özel timeout
        const chromeTimeout = setTimeout(() => {
            const peerConnection = this.peerConnections.get(targetClientId);
            if (peerConnection && peerConnection.connectionState !== 'connected') {
                console.warn(`Chrome bağlantısı timeout: ${targetClientId}`);
                this.retryConnection(targetClientId);
            }
        }, 30000); // 30 saniye Chrome timeout
        
        // Chrome tabanlı tarayıcılar için özel event listener'lar
        const peerConnection = this.peerConnections.get(targetClientId);
        if (peerConnection) {
            const originalOnConnectionStateChange = peerConnection.onconnectionstatechange;
            peerConnection.onconnectionstatechange = () => {
                console.log(`Chrome connection state change (${targetClientId}):`, peerConnection.connectionState);
                
                if (peerConnection.connectionState === 'connected') {
                    clearTimeout(chromeTimeout);
                    console.log(`Chrome bağlantısı başarılı: ${targetClientId}`);
                } else if (peerConnection.connectionState === 'failed') {
                    clearTimeout(chromeTimeout);
                    console.warn(`Chrome bağlantısı başarısız: ${targetClientId}`);
                    this.retryConnection(targetClientId);
                }
                
                // Orijinal event listener'ı çağır
                if (originalOnConnectionStateChange) {
                    originalOnConnectionStateChange.call(peerConnection);
                }
            };
        }
    }

    // ICE candidate'ın geçerli olup olmadığını kontrol et
    isValidIceCandidate(candidate) {
        if (!candidate || !candidate.candidate) {
            return false;
        }
        
        const candidateStr = candidate.candidate.toLowerCase();
        
        // Chrome tabanlı tarayıcılar için özel kontroller
        if (candidateStr.includes('tcp') && !candidateStr.includes('host')) {
            // TCP candidate'ları sadece host ise kabul et
            return candidateStr.includes('host');
        }
        
        // Geçersiz candidate türlerini filtrele - Chrome için daha esnek
        const invalidTypes = ['relay'];
        if (invalidTypes.some(type => candidateStr.includes(type))) {
            return false;
        }
        
        // Chrome için özel candidate filtreleme
        if (candidateStr.includes('udp') && candidateStr.includes('192.168.')) {
            // Yerel ağ candidate'larını kabul et
            return true;
        }
        
        if (candidateStr.includes('udp') && candidateStr.includes('10.')) {
            // Özel ağ candidate'larını kabul et
            return true;
        }
        
        if (candidateStr.includes('udp') && candidateStr.includes('172.')) {
            // Özel ağ candidate'larını kabul et
            return true;
        }
        
        // STUN candidate'larını kabul et
        if (candidateStr.includes('udp') && candidateStr.includes('stun')) {
            return true;
        }
        
        // Chrome tabanlı tarayıcılar için ek kontroller
        if (candidateStr.includes('udp') && candidateStr.includes('127.0.0.1')) {
            // Localhost candidate'larını kabul et
            return true;
        }
        
        // Genel UDP candidate'larını kabul et
        if (candidateStr.includes('udp') && !candidateStr.includes('tcp')) {
            return true;
        }
        
        // Chrome için prflx candidate'larını da kabul et (daha esnek)
        if (candidateStr.includes('prflx')) {
            return true;
        }
        
        return true;
    }

    // Chrome tabanlı tarayıcılar için SDP optimizasyonu
    optimizeSdpForChrome(sdp) {
        if (!sdp) return sdp;
        
        let optimizedSdp = sdp;
        
        // Chrome için özel SDP optimizasyonları
        // 1. ICE candidate toplama stratejisi
        optimizedSdp = optimizedSdp.replace(/a=ice-options:trickle/g, 'a=ice-options:trickle\na=ice-options:renomination');
        
        // 2. Bundle policy optimizasyonu
        if (!optimizedSdp.includes('a=group:BUNDLE')) {
            optimizedSdp = optimizedSdp.replace(/(m=audio.*\r?\n)/, '$1a=group:BUNDLE audio\r\n');
        }
        
        // 3. Chrome için özel codec ayarları
        optimizedSdp = optimizedSdp.replace(/a=rtpmap:111 opus\/48000\/2/g, 'a=rtpmap:111 opus/48000/2\na=fmtp:111 minptime=10;useinbandfec=1');
        
        // 4. Chrome tabanlı tarayıcılar için ek optimizasyonlar
        // ICE candidate toplama süresini artır
        if (!optimizedSdp.includes('a=ice-options:trickle')) {
            optimizedSdp = optimizedSdp.replace(/(v=0.*\r?\n)/, '$1a=ice-options:trickle\r\n');
        }
        
        // 5. Chrome için özel media ayarları
        optimizedSdp = optimizedSdp.replace(/a=mid:audio/g, 'a=mid:audio\na=sendonly');
        
        // 6. Chrome tabanlı tarayıcılar için connection bilgisi
        if (!optimizedSdp.includes('c=IN IP4')) {
            optimizedSdp = optimizedSdp.replace(/(m=audio.*\r?\n)/, '$1c=IN IP4 0.0.0.0\r\n');
        }
        
        // 7. Chrome için özel attribute'lar
        optimizedSdp = optimizedSdp.replace(/a=rtcp-mux/g, 'a=rtcp-mux\na=rtcp-rsize');
        
        // 8. Chrome tabanlı tarayıcılar için ek SDP optimizasyonları
        // ICE candidate toplama süresini artır
        optimizedSdp = optimizedSdp.replace(/a=ice-options:trickle/g, 'a=ice-options:trickle\na=ice-options:renomination');
        
        // 9. Chrome için özel media ayarları
        if (!optimizedSdp.includes('a=sendrecv')) {
            optimizedSdp = optimizedSdp.replace(/a=mid:audio/g, 'a=mid:audio\na=sendrecv');
        }
        
        // 10. Chrome tabanlı tarayıcılar için connection bilgisi
        if (!optimizedSdp.includes('c=IN IP4 0.0.0.0')) {
            optimizedSdp = optimizedSdp.replace(/(m=audio.*\r?\n)/, '$1c=IN IP4 0.0.0.0\r\n');
        }
        
        return optimizedSdp;
    }
}

// Global WebRTC manager instance'ı oluştur
window.rtcManager = new WebRTCManager(); 
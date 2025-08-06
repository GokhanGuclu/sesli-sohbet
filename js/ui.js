// UI yönetimi
class UIManager {
    constructor() {
        this.currentScreen = 'login';
        this.currentUser = null;
        this.currentRoom = null;
        this.users = new Map();
        this.messages = [];
        
        this.initializeElements();
        this.bindEvents();
    }

    // DOM elementlerini başlat
    initializeElements() {
        // Ekranlar
        this.loginScreen = document.getElementById('login-screen');
        this.chatScreen = document.getElementById('chat-screen');
        
        // Giriş formu elementleri
        this.usernameInput = document.getElementById('username');
        this.roomIdInput = document.getElementById('room-id');
        // this.serverUrlInput = document.getElementById('server-url'); // kaldırıldı
        this.joinBtn = document.getElementById('join-btn');
        
        // Sohbet ekranı elementleri
        this.currentRoomSpan = document.getElementById('current-room');
        this.currentUserSpan = document.getElementById('current-user');
        this.leaveBtn = document.getElementById('leave-btn');
        this.usersList = document.getElementById('users-list');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        
        // Ses kontrol elementleri
        this.muteBtn = document.getElementById('mute-btn');
        this.deafenBtn = document.getElementById('deafen-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusDot = document.querySelector('.status-dot');
        
        // Mikrofon seçimi elementleri
        this.microphoneSelect = document.getElementById('microphone-select');
        this.refreshMicrophonesBtn = document.getElementById('refresh-microphones');
        
        // Güncelleme elementleri
        this.appVersion = document.getElementById('app-version');
        this.updateStatus = document.getElementById('update-status');
        this.checkUpdatesBtn = document.getElementById('check-updates');
    }

    // Event listener'ları bağla
    bindEvents() {
        // Giriş formu
        if (this.joinBtn) this.joinBtn.addEventListener('click', () => this.handleJoin());
        if (this.usernameInput) this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJoin();
        });
        if (this.roomIdInput) this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJoin();
        });

        // Sohbet ekranı
        if (this.leaveBtn) this.leaveBtn.addEventListener('click', () => this.handleLeave());
        if (this.sendBtn) this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        if (this.messageInput) this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        // Ses kontrolleri
        if (this.muteBtn) this.muteBtn.addEventListener('click', () => this.handleMute());
        if (this.deafenBtn) this.deafenBtn.addEventListener('click', () => this.handleDeafen());
        if (this.volumeSlider) this.volumeSlider.addEventListener('input', (e) => {
            this.handleVolumeChange(e.target.value);
        });

        // Mikrofon seçimi
        if (this.microphoneSelect) {
            this.microphoneSelect.addEventListener('change', (e) => {
                this.handleMicrophoneChange(e.target.value);
            });
        }
        if (this.refreshMicrophonesBtn) {
            this.refreshMicrophonesBtn.addEventListener('click', () => {
                this.refreshMicrophones();
            });
        }

        // Güncelleme sistemi
        if (this.checkUpdatesBtn) {
            this.checkUpdatesBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }

        // Electron API'den güncelleme durumunu dinle
        if (window.electronAPI && window.electronAPI.onUpdateStatus) {
            window.electronAPI.onUpdateStatus((message) => {
                this.updateUpdateStatus(message);
            });
        }
    }

    // Odaya katılma işlemi
    async handleJoin() {
        const username = this.usernameInput.value.trim();
        const roomId = this.roomIdInput.value.trim();
        const serverUrl = 'wss://sesli.gokhanguclu.com/ws';

        if (!username || !roomId) {
            this.showError('Kullanıcı adı ve oda ID gereklidir.');
            return;
        }

        try {
            this.joinBtn.disabled = true;
            this.joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bağlanıyor...';

            // WebSocket bağlantısını kur
            await wsManager.connect(serverUrl, username);
            
            // Mikrofon erişimi iste
            await rtcManager.requestMicrophoneAccess();
            
            // Mikrofon listesini başlat
            await this.initializeMicrophoneList();
            
            // Odaya katıl
            wsManager.joinRoom(roomId);
            
            // UI'ı güncelle
            this.currentUser = username;
            this.currentRoom = roomId;
            this.switchToChatScreen();
            
        } catch (error) {
            console.error('Bağlantı hatası:', error);
            this.showError(`Bağlantı hatası: ${error.message}`);
        } finally {
            this.joinBtn.disabled = false;
            this.joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Odaya Katıl';
        }
    }

    // Odadan ayrılma işlemi
    handleLeave() {
        wsManager.disconnect();
        rtcManager.closeAllConnections();
        this.switchToLoginScreen();
        this.clearChatData();
    }

    // Mesaj gönderme işlemi
    handleSendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Mesajı UI'a ekle
        this.addMessage(this.currentUser, message, 'own');
        
        // Input'u temizle
        this.messageInput.value = '';
    }

    // Ses kontrolleri
    handleMute() {
        const isMuted = rtcManager.toggleMute();
        this.updateMuteButton(isMuted);
    }

    handleDeafen() {
        const isDeafened = rtcManager.toggleDeafen();
        this.updateDeafenButton(isDeafened);
    }

    handleVolumeChange(value) {
        const volume = value / 100;
        rtcManager.setVolume(volume);
    }

    // Mikrofon seçimi
    async handleMicrophoneChange(deviceId) {
        if (!deviceId) return;
        
        try {
            this.microphoneSelect.disabled = true;
            await rtcManager.changeMicrophone(deviceId);
            this.showSuccess('Mikrofon değiştirildi');
        } catch (error) {
            console.error('Mikrofon değiştirme hatası:', error);
            this.showError('Mikrofon değiştirilemedi: ' + error.message);
        } finally {
            this.microphoneSelect.disabled = false;
        }
    }

    async refreshMicrophones() {
        try {
            this.refreshMicrophonesBtn.disabled = true;
            this.refreshMicrophonesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const devices = await rtcManager.getAvailableDevices();
            this.populateMicrophoneSelect(devices);
            
            this.showSuccess('Mikrofon listesi güncellendi');
        } catch (error) {
            console.error('Mikrofon listesi güncelleme hatası:', error);
            this.showError('Mikrofon listesi güncellenemedi: ' + error.message);
        } finally {
            this.refreshMicrophonesBtn.disabled = false;
            this.refreshMicrophonesBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
    }

    populateMicrophoneSelect(devices) {
        if (!this.microphoneSelect) return;
        
        // Mevcut seçimi sakla
        const currentSelection = this.microphoneSelect.value;
        
        // Select'i temizle
        this.microphoneSelect.innerHTML = '';
        
        if (devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Mikrofon bulunamadı';
            this.microphoneSelect.appendChild(option);
            return;
        }
        
        // Cihazları ekle
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Mikrofon ${device.deviceId.slice(0, 8)}`;
            this.microphoneSelect.appendChild(option);
        });
        
        // Önceki seçimi geri yükle
        if (currentSelection) {
            this.microphoneSelect.value = currentSelection;
        }
    }

    // Mikrofon listesini başlat
    async initializeMicrophoneList() {
        try {
            const devices = await rtcManager.getAvailableDevices();
            this.populateMicrophoneSelect(devices);
        } catch (error) {
            console.error('Mikrofon listesi başlatma hatası:', error);
        }
    }

    // Ekran geçişleri
    switchToChatScreen() {
        this.loginScreen.classList.remove('active');
        this.chatScreen.classList.add('active');
        this.currentScreen = 'chat';
        
        // Bilgileri güncelle
        this.currentRoomSpan.textContent = this.currentRoom;
        this.currentUserSpan.textContent = this.currentUser;
        
        // Bağlantı durumunu güncelle
        this.updateConnectionStatus(true);
    }

    switchToLoginScreen() {
        this.chatScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
        this.currentScreen = 'login';
        
        // Form'u temizle
        this.usernameInput.value = '';
        this.roomIdInput.value = '';
    }

    // Kullanıcı listesini güncelle
    updateUsersList(users) {
        this.usersList.innerHTML = '';
        this.users.clear();
        
        users.forEach(userId => {
            if (userId !== this.currentUser) {
                this.addUser(userId);
            }
        });
    }

    // Kullanıcı ekle
    addUser(userId) {
        if (this.users.has(userId)) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-avatar">${userId.charAt(0).toUpperCase()}</div>
            <div class="user-name">${userId}</div>
            <div class="user-status"></div>
        `;
        
        this.usersList.appendChild(userItem);
        this.users.set(userId, userItem);
    }

    // Kullanıcı kaldır
    removeUser(userId) {
        const userItem = this.users.get(userId);
        if (userItem) {
            userItem.remove();
            this.users.delete(userId);
        }
    }

    // Mesaj ekle
    addMessage(sender, content, type = 'other') {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <div class="message-header">${sender}</div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.messages.push({ sender, content, type, timestamp: Date.now() });
        
        // Otomatik scroll
        this.scrollToBottom();
    }

    // Sistem mesajı ekle
    addSystemMessage(content) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Bağlantı durumunu güncelle
    updateConnectionStatus(isConnected) {
        if (isConnected) {
            this.connectionStatus.textContent = 'Bağlı';
            this.statusDot.classList.add('connected');
        } else {
            this.connectionStatus.textContent = 'Bağlantı yok';
            this.statusDot.classList.remove('connected');
        }
    }

    // Mute butonunu güncelle
    updateMuteButton(isMuted) {
        const icon = this.muteBtn.querySelector('i');
        const text = this.muteBtn.querySelector('span');
        
        if (isMuted) {
            icon.className = 'fas fa-microphone-slash';
            text.textContent = 'Susturuldu';
            this.muteBtn.classList.add('active');
        } else {
            icon.className = 'fas fa-microphone';
            text.textContent = 'Sustur';
            this.muteBtn.classList.remove('active');
        }
    }

    // Deafen butonunu güncelle
    updateDeafenButton(isDeafened) {
        const icon = this.deafenBtn.querySelector('i');
        const text = this.deafenBtn.querySelector('span');
        
        if (isDeafened) {
            icon.className = 'fas fa-volume-off';
            text.textContent = 'Ses Kapalı';
            this.deafenBtn.classList.add('active');
        } else {
            icon.className = 'fas fa-volume-mute';
            text.textContent = 'Sesi Kapat';
            this.deafenBtn.classList.remove('active');
        }
    }

    // Chat verilerini temizle
    clearChatData() {
        this.users.clear();
        this.messages = [];
        this.usersList.innerHTML = '';
        this.messagesContainer.innerHTML = '';
    }

    // Otomatik scroll
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // HTML escape
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Hata mesajı göster
    showError(message) {
        if (window.electronAPI && window.electronAPI.showErrorDialog) {
            window.electronAPI.showErrorDialog('Hata', message);
        } else {
            alert(message);
        }
    }

    // Başarı mesajı göster
    showSuccess(message) {
        this.addSystemMessage(`✅ ${message}`);
    }

    // WebSocket event listener'larını bağla
    bindWebSocketEvents() {
        wsManager.on('connected', () => {
            this.updateConnectionStatus(true);
            this.showSuccess('Sunucuya bağlandı');
        });

        wsManager.on('disconnected', () => {
            this.updateConnectionStatus(false);
            this.showError('Sunucu bağlantısı kesildi');
        });

        wsManager.on('userJoined', (data) => {
            this.addUser(data.client_id);
            this.addSystemMessage(`${data.client_id} odaya katıldı`);
            
            // Yeni kullanıcı için WebRTC bağlantısı başlat
            if (rtcManager && rtcManager.localStream) {
                console.log(`Yeni kullanıcı için WebRTC bağlantısı başlatılıyor: ${data.client_id}`);
                rtcManager.createAndSendOffer(data.client_id);
            }
        });

        wsManager.on('userLeft', (data) => {
            this.removeUser(data.client_id);
            this.addSystemMessage(`${data.client_id} odadan ayrıldı`);
            
            // WebRTC bağlantısını kapat
            if (rtcManager) {
                rtcManager.closePeerConnection(data.client_id);
            }
        });

        wsManager.on('roomUsers', (data) => {
            this.updateUsersList(data.users);
            
            // Odadaki mevcut kullanıcılar için WebRTC bağlantıları başlat
            if (rtcManager && rtcManager.localStream) {
                data.users.forEach(userId => {
                    if (userId !== this.currentUser && !rtcManager.peerConnections.has(userId)) {
                        console.log(`Mevcut kullanıcı için WebRTC bağlantısı başlatılıyor: ${userId}`);
                        rtcManager.createAndSendOffer(userId);
                    }
                });
            }
        });
    }

    // WebRTC event listener'larını bağla
    bindWebRTCEvents() {
        rtcManager.on('peerConnected', (clientId) => {
            this.addSystemMessage(`${clientId} ile ses bağlantısı kuruldu`);
        });

        rtcManager.on('peerDisconnected', (clientId) => {
            this.addSystemMessage(`${clientId} ile ses bağlantısı kesildi`);
        });
    }

    // Güncelleme durumunu güncelle
    updateUpdateStatus(message) {
        if (this.updateStatus) {
            this.updateStatus.textContent = message;
            this.updateStatus.classList.add('show');
            
            // Mesaj tipine göre CSS class'ı ekle
            this.updateStatus.classList.remove('checking', 'available', 'downloading', 'error');
            
            if (message.includes('kontrol ediliyor')) {
                this.updateStatus.classList.add('checking');
            } else if (message.includes('mevcut')) {
                this.updateStatus.classList.add('available');
            } else if (message.includes('indiriliyor') || message.includes('İndirme')) {
                this.updateStatus.classList.add('downloading');
            } else if (message.includes('hatası') || message.includes('başarısız')) {
                this.updateStatus.classList.add('error');
            }
            
            // 5 saniye sonra gizle
            setTimeout(() => {
                this.updateStatus.classList.remove('show');
            }, 5000);
        }
    }

    // Güncelleme kontrolü yap
    async checkForUpdates() {
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            try {
                this.checkUpdatesBtn.disabled = true;
                this.checkUpdatesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol...';
                
                const result = await window.electronAPI.checkForUpdates();
                
                if (result.success) {
                    this.showSuccess(result.message);
                } else {
                    this.showError(result.message);
                }
            } catch (error) {
                console.error('Güncelleme kontrolü hatası:', error);
                this.showError('Güncelleme kontrolü sırasında bir hata oluştu: ' + error.message);
            } finally {
                this.checkUpdatesBtn.disabled = false;
                this.checkUpdatesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Güncelle';
            }
        } else {
            this.showError('Güncelleme sistemi mevcut değil.');
        }
    }

    // Uygulama versiyonunu göster
    async showAppVersion() {
        const versionSpan = this.appVersion;
        if (!versionSpan) return;
        let version = '';
        if (window.electronAPI && window.electronAPI.getAppVersion) {
            try {
                version = await window.electronAPI.getAppVersion();
            } catch (e) {
                version = '';
            }
        } else {
            // Web ortamı için: package.json'ı fetch ile oku
            try {
                const res = await fetch('package.json');
                if (res.ok) {
                    const pkg = await res.json();
                    version = pkg.version;
                }
            } catch (e) {
                version = '';
            }
        }
        versionSpan.textContent = version ? `v${version}` : '';
    }
}

// Global UI manager instance'ı oluştur
if (typeof window !== 'undefined') {
    window.uiManager = new UIManager();
} 
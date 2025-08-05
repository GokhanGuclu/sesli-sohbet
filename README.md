# Sesli Sohbet - Frontend

Bu klasör, Sesli Sohbet uygulamasının Electron tabanlı frontend'ini içerir.

## Özellikler

- 🎤 Gerçek zamanlı sesli iletişim (WebRTC)
- 💬 Metin mesajlaşması
- 👥 Kullanıcı listesi
- 🔇 Mikrofon susturma
- 🔈 Ses kapatma
- 📊 Bağlantı durumu göstergesi
- 🎨 Modern ve kullanıcı dostu arayüz
- 🌐 Web versiyonu desteği

## Kurulum

1. Node.js ve npm'in yüklü olduğundan emin olun
2. Frontend klasörüne gidin:
   ```bash
   cd frontend
   ```
3. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

## Çalıştırma

### 🌐 Web Versiyonu (Tarayıcıda)
```bash
npm run web
```
Tarayıcınızda `http://localhost:3000` adresini açın.

### 💻 Electron Versiyonu (Desktop)
```bash
npm start
```

### 🔧 Geliştirme Modu
```bash
npm run dev
```

### 📦 Build
```bash
npm run build
```

## Proje Yapısı

```
frontend/
├── index.html          # Electron ana sayfa
├── web.html            # Web versiyonu
├── server.js           # Web sunucusu
├── main.js            # Electron ana süreç
├── preload.js         # Electron preload script
├── package.json       # Proje konfigürasyonu
├── styles/
│   └── main.css       # Ana CSS dosyası
├── js/
│   ├── config.js      # Konfigürasyon
│   ├── websocket.js   # WebSocket yönetimi
│   ├── webrtc.js      # WebRTC ses iletişimi
│   ├── ui.js          # UI yönetimi
│   └── app.js         # Ana uygulama
└── README.md          # Bu dosya
```

## Konfigürasyon

`js/config.js` dosyasında aşağıdaki ayarları değiştirebilirsiniz:

- `DEFAULT_SERVER_URL`: WebSocket sunucu URL'si
- `RTC_CONFIG`: WebRTC ICE sunucuları
- `APP_SETTINGS`: Uygulama ayarları
- `UI_SETTINGS`: UI ayarları

## Kullanım

### Web Versiyonu
1. `npm run web` komutunu çalıştırın
2. Tarayıcınızda `http://localhost:3000` adresini açın
3. Kullanıcı adınızı ve oda ID'sini girin
4. "Odaya Katıl" butonuna tıklayın
5. Mikrofon erişimi için izin verin

### Electron Versiyonu
1. `npm start` komutunu çalıştırın
2. Kullanıcı adınızı ve oda ID'sini girin
3. "Odaya Katıl" butonuna tıklayın
4. Mikrofon erişimi için izin verin

## Ses Kontrolleri

- **Sustur**: Mikrofonunuzu susturur/açar
- **Sesi Kapat**: Diğer kullanıcıların sesini kapatır/açar
- **Ses Seviyesi**: Ses seviyesini ayarlar

## Teknolojiler

- **Electron**: Desktop uygulama framework'ü
- **WebRTC**: Gerçek zamanlı ses iletişimi
- **WebSocket**: Sunucu iletişimi
- **HTML5/CSS3**: Modern arayüz
- **Vanilla JavaScript**: Temiz ve hızlı kod

## Geliştirme

### Yeni Özellik Ekleme

1. İlgili JavaScript dosyasını düzenleyin
2. CSS stillerini ekleyin (gerekirse)
3. HTML yapısını güncelleyin (gerekirse)
4. Test edin

### Hata Ayıklama

- **Electron**: Geliştirme modunda DevTools otomatik olarak açılır
- **Web**: Tarayıcının geliştirici araçlarını kullanın

## Dağıtım

### Web Versiyonu
Web versiyonunu herhangi bir web sunucusuna yükleyebilirsiniz:
- `web.html` dosyasını web sunucunuza yükleyin
- `js/`, `styles/` klasörlerini de yükleyin
- WebSocket sunucu URL'sini güncelleyin

### Electron Versiyonu
```bash
npm run build:win  # Windows için
npm run build:mac  # macOS için
npm run build:linux # Linux için
```

## Lisans

MIT License 
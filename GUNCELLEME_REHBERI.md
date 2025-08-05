# 🔄 Güncelleme Sistemi Kullanım Rehberi

## 📋 Adım Adım Kurulum

### 1. GitHub Repository Oluşturma

1. **GitHub'da yeni repository oluşturun:**
   - GitHub.com'a gidin
   - "New repository" tıklayın
   - Repository name: `sesli-sohbet`
   - Public seçin
   - "Create repository" tıklayın

2. **GitHub Personal Access Token oluşturun:**
   - GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - "Generate new token" → "Generate new token (classic)"
   - Note: `sesli-sohbet-updater`
   - Expiration: 90 days
   - Scopes: `repo` (tüm repo izinleri)
   - "Generate token" tıklayın
   - Token'ı kopyalayın ve güvenli bir yere kaydedin

### 2. Environment Variable Ayarlama

Windows PowerShell'de:
```powershell
$env:GH_TOKEN="your_github_token_here"
```

Veya kalıcı olarak:
```powershell
[Environment]::SetEnvironmentVariable("GH_TOKEN", "your_github_token_here", "User")
```

### 3. İlk Release Oluşturma

1. **Versiyon numarasını kontrol edin:**
   ```json
   // package.json
   {
     "version": "1.0.0"
   }
   ```

2. **Build alın:**
   ```bash
   npm run build:win
   ```

3. **GitHub'a publish edin:**
   ```bash
   npm run publish
   ```

## 🚀 Güncelleme Süreci

### Yeni Versiyon Yayınlama

1. **Versiyon numarasını artırın:**
   ```json
   // package.json
   {
     "version": "1.0.1"  // 1.0.0'dan 1.0.1'e
   }
   ```

2. **Değişiklikleri commit edin:**
   ```bash
   git add .
   git commit -m "v1.0.1: Yeni özellikler eklendi"
   git push origin main
   ```

3. **Build alın:**
   ```bash
   npm run build:win
   ```

4. **GitHub'a publish edin:**
   ```bash
   npm run publish
   ```

### Otomatik Release Oluşturma

`npm run publish` komutu çalıştırıldığında:
- GitHub'da otomatik olarak release oluşturulur
- Release tag'i: `v1.0.1` (package.json'daki versiyon)
- Release title: `Sesli Sohbet v1.0.1`
- Assets: Windows installer ve portable exe

## 🎯 Kullanıcı Deneyimi

### Güncelleme Kontrolü

1. **Otomatik kontrol:** Uygulama başladığında 3 saniye sonra otomatik kontrol
2. **Manuel kontrol:** Sağ üst köşedeki "Güncelle" butonu
3. **Durum gösterimi:** Header'da güncelleme durumu

### Güncelleme Süreci

1. **Kontrol:** "Güncelleme kontrol ediliyor..."
2. **Mevcut:** "Yeni güncelleme mevcut!" → Dialog açılır
3. **İndirme:** "İndirme hızı: X MB/s - İndirilen Y%"
4. **Hazır:** "Güncelleme indirildi. Uygulama yeniden başlatılacak..." → Dialog açılır

## 🔍 Test Etme

### 1. İlk Release Testi

1. **Build alın:**
   ```bash
   npm run build:win
   ```

2. **Publish edin:**
   ```bash
   npm run publish
   ```

3. **GitHub'da kontrol edin:**
   - Repository → Releases → v1.0.0
   - Assets'lerin yüklendiğini kontrol edin

### 2. Güncelleme Testi

1. **Versiyon artırın:**
   ```json
   "version": "1.0.1"
   ```

2. **Build ve publish:**
   ```bash
   npm run build:win
   npm run publish
   ```

3. **Uygulamayı test edin:**
   - v1.0.0 uygulamasını açın
   - Güncelleme kontrolünü bekleyin
   - "Güncelle" butonuna tıklayın
   - Güncelleme sürecini takip edin

## 🐛 Sorun Giderme

### Güncelleme Çalışmıyor

1. **GitHub Token kontrolü:**
   ```bash
   echo $env:GH_TOKEN
   ```

2. **Repository ayarları:**
   - Repository public mi?
   - Token doğru mu?

3. **Versiyon kontrolü:**
   - package.json'da versiyon artırıldı mı?
   - Git tag'leri doğru mu?

### Build Hatası

1. **Dependencies:**
   ```bash
   npm install
   ```

2. **Icon dosyası:**
   - `assets/icon.ico` mevcut mu?

3. **Permissions:**
   - GitHub token'ın repo izinleri var mı?

## 📝 Önemli Notlar

- **Güncelleme sistemi sadece Electron uygulamasında çalışır**
- **Web versiyonunda güncelleme sistemi yoktur**
- **Güncelleme sırasında uygulama kapanır ve yeniden başlar**
- **Kullanıcı güncellemeyi reddedebilir**
- **İlk kurulumda güncelleme sistemi çalışmaz (henüz release yok)**

## 🔗 Faydalı Komutlar

```bash
# Versiyon kontrolü
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Build komutları
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux

# Publish komutları
npm run publish     # GitHub'a publish
npm run dist        # Sadece build (publish yok)
``` 
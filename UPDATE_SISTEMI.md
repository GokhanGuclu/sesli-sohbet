# 🔄 Otomatik Güncelleme Sistemi

## 📋 Genel Bakış

Sesli Sohbet uygulaması artık otomatik güncelleme sistemi ile gelir. Bu sistem sayesinde kullanıcılar uygulamayı manuel olarak güncellemek zorunda kalmaz.

## 🚀 Özellikler

- **Otomatik Güncelleme Kontrolü**: Uygulama başladığında otomatik olarak güncelleme kontrolü yapar
- **Manuel Güncelleme**: Kullanıcılar istedikleri zaman güncelleme kontrolü yapabilir
- **Güncelleme Bildirimleri**: Güncelleme durumu hakkında kullanıcıya bilgi verir
- **Otomatik İndirme**: Güncelleme onaylandığında otomatik olarak indirir
- **Otomatik Kurulum**: İndirme tamamlandığında otomatik olarak kurar

## 🔧 Kurulum

### 1. GitHub Repository Ayarları

1. GitHub'da `sesli-sohbet` repository'si oluşturun
2. Repository'yi public yapın
3. GitHub Personal Access Token oluşturun

### 2. Environment Variables

```bash
# GitHub Personal Access Token
export GH_TOKEN=your_github_token_here
```

### 3. Build ve Publish

```bash
# Windows için build ve publish
npm run build:win
npm run publish

# macOS için build ve publish
npm run build:mac
npm run publish

# Linux için build ve publish
npm run build:linux
npm run publish
```

## 📦 Güncelleme Süreci

### 1. Versiyon Güncelleme

`package.json` dosyasında versiyon numarasını artırın:

```json
{
  "version": "1.0.1"
}
```

### 2. Build ve Publish

```bash
# Yeni versiyon için build al
npm run build:win

# GitHub'a publish et
npm run publish
```

### 3. GitHub Release

GitHub'da otomatik olarak release oluşturulur. Manuel olarak da oluşturabilirsiniz:

1. GitHub repository'de "Releases" sekmesine gidin
2. "Create a new release" tıklayın
3. Tag: `v1.0.1` (package.json'daki versiyon)
4. Title: `Sesli Sohbet v1.0.1`
5. Description: Değişiklikleri açıklayın
6. "Publish release" tıklayın

## 🎯 Kullanıcı Deneyimi

### Güncelleme Kontrolü

1. Uygulama başladığında otomatik kontrol
2. Sağ üst köşedeki "Güncelle" butonu ile manuel kontrol
3. Güncelleme durumu header'da gösterilir

### Güncelleme Süreci

1. **Kontrol**: "Güncelleme kontrol ediliyor..."
2. **Mevcut**: "Yeni güncelleme mevcut!"
3. **İndirme**: "İndirme hızı: X MB/s - İndirilen Y%"
4. **Hazır**: "Güncelleme indirildi. Uygulama yeniden başlatılacak..."

## 🔍 Sorun Giderme

### Güncelleme Çalışmıyor

1. **GitHub Token**: `GH_TOKEN` environment variable'ının doğru ayarlandığından emin olun
2. **Repository**: Repository'nin public olduğundan emin olun
3. **Versiyon**: Versiyon numarasının artırıldığından emin olun

### Build Hatası

1. **Dependencies**: `npm install` çalıştırın
2. **Icon**: `assets/icon.ico` dosyasının mevcut olduğundan emin olun
3. **Permissions**: GitHub token'ın yeterli izinlere sahip olduğundan emin olun

## 📝 Notlar

- Güncelleme sistemi sadece Electron uygulamasında çalışır
- Web versiyonunda güncelleme sistemi yoktur
- Güncelleme sırasında uygulama kapanır ve yeniden başlar
- Kullanıcı güncellemeyi reddedebilir

## 🔗 Faydalı Linkler

- [electron-updater](https://www.electron.build/auto-update)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Electron Builder](https://www.electron.build/) 
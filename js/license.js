// Lisans sistemi
class LicenseManager {
    constructor() {
        this.licenseKey = null;
        this.licenseData = null;
        this.isValid = false;
        this.expiryDate = null;
    }

    // Lisans anahtarını doğrula
    async validateLicense(licenseKey) {
        try {
            // Geliştirme modunda otomatik lisans ver
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
                console.log('Geliştirme modu: Otomatik lisans veriliyor');
                this.isValid = true;
                this.licenseData = {
                    userId: 'dev-user',
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    features: ['voice-chat', 'screen-sharing', 'file-transfer'],
                    version: '1.2.1'
                };
                this.saveLicenseToStorage();
                return {
                    valid: true,
                    data: this.licenseData
                };
            }

            // Lisans anahtarını hash'le
            const hashedKey = await this.hashLicenseKey(licenseKey);
            
            // Lisans verilerini çöz
            const licenseData = this.decodeLicenseData(hashedKey);
            
            if (!licenseData) {
                throw new Error('Geçersiz lisans anahtarı');
            }

            // Lisans süresini kontrol et
            if (licenseData.expiryDate && new Date() > new Date(licenseData.expiryDate)) {
                throw new Error('Lisans süresi dolmuş');
            }

            // Lisans verilerini kaydet
            this.licenseKey = licenseKey;
            this.licenseData = licenseData;
            this.isValid = true;
            this.expiryDate = licenseData.expiryDate;

            // Lisansı localStorage'a kaydet
            this.saveLicenseToStorage();

            return {
                valid: true,
                data: licenseData
            };

        } catch (error) {
            console.error('Lisans doğrulama hatası:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Lisans anahtarını hash'le
    async hashLicenseKey(licenseKey) {
        const encoder = new TextEncoder();
        const data = encoder.encode(licenseKey);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Lisans verilerini çöz
    decodeLicenseData(hashedKey) {
        try {
            // Basit bir lisans çözme algoritması (gerçek uygulamada daha güvenli olmalı)
            const decoded = atob(hashedKey.substring(0, 32));
            return JSON.parse(decoded);
        } catch (error) {
            return null;
        }
    }

    // Lisansı localStorage'a kaydet
    saveLicenseToStorage() {
        if (this.licenseData) {
            localStorage.setItem('app_license', JSON.stringify({
                key: this.licenseKey,
                data: this.licenseData,
                isValid: this.isValid,
                expiryDate: this.expiryDate,
                savedAt: new Date().toISOString()
            }));
        }
    }

    // Lisansı localStorage'dan yükle
    loadLicenseFromStorage() {
        try {
            const savedLicense = localStorage.getItem('app_license');
            if (savedLicense) {
                const license = JSON.parse(savedLicense);
                
                // Lisans süresini kontrol et
                if (license.expiryDate && new Date() > new Date(license.expiryDate)) {
                    this.clearLicense();
                    return false;
                }

                this.licenseKey = license.key;
                this.licenseData = license.data;
                this.isValid = license.isValid;
                this.expiryDate = license.expiryDate;

                return true;
            }
        } catch (error) {
            console.error('Lisans yükleme hatası:', error);
        }
        return false;
    }

    // Lisansı temizle
    clearLicense() {
        this.licenseKey = null;
        this.licenseData = null;
        this.isValid = false;
        this.expiryDate = null;
        localStorage.removeItem('app_license');
    }

    // Lisans durumunu kontrol et
    checkLicenseStatus() {
        // Geliştirme modunda otomatik lisans ver
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
            console.log('Geliştirme modu: Lisans geçerli');
            return {
                valid: true,
                message: 'Geliştirme modu - Lisans geçerli',
                data: {
                    userId: 'dev-user',
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    features: ['voice-chat', 'screen-sharing', 'file-transfer'],
                    version: '1.2.1'
                }
            };
        }

        if (!this.isValid) {
            return {
                valid: false,
                message: 'Lisans gerekli'
            };
        }

        if (this.expiryDate && new Date() > new Date(this.expiryDate)) {
            this.clearLicense();
            return {
                valid: false,
                message: 'Lisans süresi dolmuş'
            };
        }

        return {
            valid: true,
            message: 'Lisans geçerli',
            data: this.licenseData
        };
    }

    // Lisans bilgilerini al
    getLicenseInfo() {
        return {
            isValid: this.isValid,
            expiryDate: this.expiryDate,
            data: this.licenseData
        };
    }
}

// Global lisans yöneticisi
window.licenseManager = new LicenseManager();

// Lisans kontrolü
document.addEventListener('DOMContentLoaded', () => {
    // Geliştirme modunda otomatik lisans ver
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
        console.log('Geliştirme modu: Otomatik lisans veriliyor');
        window.licenseManager.isValid = true;
        window.licenseManager.licenseData = {
            userId: 'dev-user',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            features: ['voice-chat', 'screen-sharing', 'file-transfer'],
            version: '1.2.1'
        };
        window.licenseManager.saveLicenseToStorage();
        return;
    }

    // Kaydedilmiş lisansı yükle
    if (!window.licenseManager.loadLicenseFromStorage()) {
        // Lisans yoksa lisans ekranını göster
        showLicenseScreen();
    } else {
        // Lisans varsa durumunu kontrol et
        const status = window.licenseManager.checkLicenseStatus();
        if (!status.valid) {
            showLicenseScreen();
        }
    }
});

// Lisans ekranını göster
function showLicenseScreen() {
    const licenseHTML = `
        <div id="license-screen" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                width: 90%;
            ">
                <h2 style="color: #333; margin-bottom: 20px;">Lisans Gerekli</h2>
                <p style="color: #666; margin-bottom: 30px;">
                    Bu uygulamayı kullanmak için geçerli bir lisans anahtarı girmeniz gerekmektedir.
                </p>
                <input type="text" id="license-input" placeholder="Lisans anahtarınızı girin" style="
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                ">
                <button onclick="activateLicense()" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Lisansı Etkinleştir
                </button>
                <div id="license-error" style="color: red; margin-top: 10px; display: none;"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', licenseHTML);
}

// Lisansı etkinleştir
async function activateLicense() {
    const licenseInput = document.getElementById('license-input');
    const errorDiv = document.getElementById('license-error');
    const licenseKey = licenseInput.value.trim();

    if (!licenseKey) {
        errorDiv.textContent = 'Lütfen lisans anahtarını girin';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const result = await window.licenseManager.validateLicense(licenseKey);
        
        if (result.valid) {
            // Lisans ekranını kaldır
            const licenseScreen = document.getElementById('license-screen');
            if (licenseScreen) {
                licenseScreen.remove();
            }
            
            // Uygulamayı başlat
            initializeApp();
        } else {
            errorDiv.textContent = result.error || 'Geçersiz lisans anahtarı';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Lisans doğrulama hatası: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// Uygulamayı başlat
function initializeApp() {
    // Uygulama başlatma kodları buraya gelecek
    console.log('Uygulama lisans ile başlatıldı');
} 
// Lisans sistemi test dosyası
class LicenseTester {
    constructor() {
        this.testResults = [];
    }

    // Test lisans anahtarı oluştur
    generateTestLicense() {
        const testData = {
            userId: 'test-user-123',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl
            features: ['voice-chat', 'screen-sharing', 'file-transfer'],
            version: '1.2.1'
        };

        // Test lisans anahtarını oluştur
        const dataString = JSON.stringify(testData);
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        
        // Basit hash oluştur (gerçek uygulamada daha güvenli olmalı)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data[i];
            hash = hash & hash; // 32-bit integer
        }
        
        const hashString = hash.toString(16).padStart(8, '0');
        const licenseKey = Buffer.from(hashString + dataString).toString('base64');
        
        return {
            licenseKey,
            testData
        };
    }

    // Lisans doğrulama testi
    async testLicenseValidation() {
        console.log('🔍 Lisans doğrulama testi başlatılıyor...');
        
        const { licenseKey, testData } = this.generateTestLicense();
        
        try {
            // Lisans yöneticisini test et
            if (window.licenseManager) {
                const result = await window.licenseManager.validateLicense(licenseKey);
                
                if (result.valid) {
                    this.testResults.push({
                        test: 'Lisans Doğrulama',
                        status: '✅ BAŞARILI',
                        message: 'Lisans başarıyla doğrulandı'
                    });
                } else {
                    this.testResults.push({
                        test: 'Lisans Doğrulama',
                        status: '❌ BAŞARISIZ',
                        message: result.error || 'Lisans doğrulanamadı'
                    });
                }
            } else {
                this.testResults.push({
                    test: 'Lisans Yöneticisi',
                    status: '❌ BAŞARISIZ',
                    message: 'Lisans yöneticisi bulunamadı'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'Lisans Doğrulama',
                status: '❌ HATA',
                message: error.message
            });
        }
    }

    // Lisans durumu testi
    testLicenseStatus() {
        console.log('🔍 Lisans durumu testi başlatılıyor...');
        
        try {
            if (window.licenseManager) {
                const status = window.licenseManager.checkLicenseStatus();
                
                this.testResults.push({
                    test: 'Lisans Durumu',
                    status: status.valid ? '✅ GEÇERLİ' : '⚠️ GEÇERSİZ',
                    message: status.message
                });
            } else {
                this.testResults.push({
                    test: 'Lisans Durumu',
                    status: '❌ BAŞARISIZ',
                    message: 'Lisans yöneticisi bulunamadı'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'Lisans Durumu',
                status: '❌ HATA',
                message: error.message
            });
        }
    }

    // LocalStorage testi
    testLocalStorage() {
        console.log('🔍 LocalStorage testi başlatılıyor...');
        
        try {
            const testData = {
                key: 'test-license-key',
                data: { test: true },
                isValid: true,
                expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                savedAt: new Date().toISOString()
            };

            // Test verisi kaydet
            localStorage.setItem('app_license', JSON.stringify(testData));
            
            // Test verisi oku
            const savedData = localStorage.getItem('app_license');
            const parsedData = JSON.parse(savedData);
            
            if (parsedData && parsedData.key === testData.key) {
                this.testResults.push({
                    test: 'LocalStorage',
                    status: '✅ BAŞARILI',
                    message: 'LocalStorage çalışıyor'
                });
            } else {
                this.testResults.push({
                    test: 'LocalStorage',
                    status: '❌ BAŞARISIZ',
                    message: 'LocalStorage verisi okunamadı'
                });
            }
            
            // Test verisini temizle
            localStorage.removeItem('app_license');
            
        } catch (error) {
            this.testResults.push({
                test: 'LocalStorage',
                status: '❌ HATA',
                message: error.message
            });
        }
    }

    // Tüm testleri çalıştır
    async runAllTests() {
        console.log('🚀 Lisans sistemi testleri başlatılıyor...');
        
        this.testResults = [];
        
        // Testleri sırayla çalıştır
        await this.testLicenseValidation();
        this.testLicenseStatus();
        this.testLocalStorage();
        
        // Sonuçları göster
        this.showResults();
    }

    // Test sonuçlarını göster
    showResults() {
        console.log('\n📊 LİSANS SİSTEMİ TEST SONUÇLARI');
        console.log('=====================================');
        
        this.testResults.forEach(result => {
            console.log(`${result.status} ${result.test}: ${result.message}`);
        });
        
        const successCount = this.testResults.filter(r => r.status.includes('✅')).length;
        const totalCount = this.testResults.length;
        
        console.log(`\n📈 Özet: ${successCount}/${totalCount} test başarılı`);
        
        if (successCount === totalCount) {
            console.log('🎉 Tüm testler başarılı! Lisans sistemi hazır.');
        } else {
            console.log('⚠️ Bazı testler başarısız. Lütfen kontrol edin.');
        }
    }
}

// Test butonunu ekle
function addTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = '🧪 Lisans Testi';
    testButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    
    testButton.onclick = () => {
        const tester = new LicenseTester();
        tester.runAllTests();
    };
    
    document.body.appendChild(testButton);
}

// Sayfa yüklendiğinde test butonunu ekle
document.addEventListener('DOMContentLoaded', () => {
    // Sadece geliştirme modunda test butonunu göster
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(addTestButton, 2000);
    }
});

// Global test fonksiyonu
window.runLicenseTests = function() {
    const tester = new LicenseTester();
    tester.runAllTests();
}; 
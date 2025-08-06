const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Güvenli build başlatılıyor...');

// Güvenlik kontrolleri
function checkSecurity() {
    console.log('🔍 Güvenlik kontrolleri yapılıyor...');
    
    // Sertifika kontrolü
    const certPath = path.join(__dirname, '..', 'certs', 'certificate.p12');
    if (!fs.existsSync(certPath)) {
        console.error('❌ Sertifika dosyası bulunamadı!');
        console.log('💡 Sertifika oluşturmak için: npm run create-cert');
        process.exit(1);
    }
    
    // Ortam değişkeni kontrolü
    if (!process.env.CSC_KEY_PASSWORD) {
        console.error('❌ CSC_KEY_PASSWORD ortam değişkeni ayarlanmamış!');
        console.log('💡 Ayarlamak için: export CSC_KEY_PASSWORD=your_password');
        process.exit(1);
    }
    
    console.log('✅ Güvenlik kontrolleri tamamlandı');
}

// Build işlemi
function buildApp() {
    console.log('🏗️ Uygulama build ediliyor...');
    
    try {
        // Windows için güvenli build
        execSync('npm run build:win', { 
            stdio: 'inherit',
            env: {
                ...process.env,
                CSC_KEY_PASSWORD: process.env.CSC_KEY_PASSWORD
            }
        });
        
        console.log('✅ Build tamamlandı!');
        
    } catch (error) {
        console.error('❌ Build hatası:', error.message);
        process.exit(1);
    }
}

// Post-build işlemleri
function postBuild() {
    console.log('🔧 Post-build işlemleri...');
    
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        console.log('📁 Build dosyaları:');
        files.forEach(file => {
            console.log(`  - ${file}`);
        });
    }
    
    console.log('🎉 Güvenli build tamamlandı!');
    console.log('💡 SmartScreen uyarısı minimize edildi.');
}

// Ana işlem
function main() {
    console.log('🚀 SmartScreen Uyumlu Güvenli Build');
    console.log('=====================================');
    
    checkSecurity();
    buildApp();
    postBuild();
}

// Script çalıştır
if (require.main === module) {
    main();
}

module.exports = { checkSecurity, buildApp, postBuild }; 
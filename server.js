const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME türleri
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let filePath = '.' + req.url;
    
    // Varsayılan olarak web.html'i göster
    if (filePath === './' || filePath === './index.html') {
        filePath = './web.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Dosya bulunamadı
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - Sayfa Bulunamadı</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .error { color: #e74c3c; font-size: 72px; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="error">404</div>
                        <h1>Sayfa Bulunamadı</h1>
                        <p>Aradığınız sayfa mevcut değil.</p>
                        <a href="/">Ana Sayfaya Dön</a>
                    </body>
                    </html>
                `);
            } else {
                // Sunucu hatası
                res.writeHead(500);
                res.end(`Sunucu Hatası: ${error.code}`);
            }
        } else {
            // Başarılı
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Sesli Sohbet Web Sunucusu başlatıldı!`);
    console.log(`📱 Web versiyonu: http://localhost:${PORT}`);
    console.log(`💻 Electron versiyonu: npm start`);
    console.log(`🔧 Geliştirme modu: npm run dev`);
    console.log(`\n📋 Kullanım:`);
    console.log(`1. Tarayıcınızda http://localhost:${PORT} adresini açın`);
    console.log(`2. Kullanıcı adı ve oda ID girin`);
    console.log(`3. "Odaya Katıl" butonuna tıklayın`);
    console.log(`4. Mikrofon erişimi için izin verin`);
    console.log(`\n✨ Sesli sohbet başlayacak!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM sinyali alındı, sunucu kapatılıyor...');
    server.close(() => {
        console.log('Sunucu kapatıldı.');
        process.exit(0);
    });
}); 
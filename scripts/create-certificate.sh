#!/bin/bash

echo "========================================"
echo "   Self-Signed Sertifika Oluşturucu"
echo "========================================"
echo

# OpenSSL'in kurulu olup olmadığını kontrol et
if ! command -v openssl &> /dev/null; then
    echo "HATA: OpenSSL bulunamadı!"
    echo "Lütfen OpenSSL'i kurun:"
    echo "  macOS: brew install openssl"
    echo "  Ubuntu: sudo apt-get install openssl"
    exit 1
fi

# certs klasörünü oluştur
if [ ! -d "certs" ]; then
    echo "certs klasörü oluşturuluyor..."
    mkdir certs
fi

echo "Self-signed sertifika oluşturuluyor..."
echo

# Sertifika oluştur
openssl req -x509 -newkey rsa:4096 -keyout certs/private.key -out certs/certificate.crt -days 365 -nodes -subj "/C=TR/ST=Istanbul/L=Istanbul/O=SesliSohbet/OU=Development/CN=seslisohbet.local"

if [ $? -ne 0 ]; then
    echo "HATA: Sertifika oluşturulamadı!"
    exit 1
fi

echo
echo ".p12 formatına dönüştürülüyor..."
echo

# .p12 formatına dönüştür
openssl pkcs12 -export -out certs/certificate.p12 -inkey certs/private.key -in certs/certificate.crt -name "SesliSohbet" -passout pass:your_password

if [ $? -ne 0 ]; then
    echo "HATA: .p12 dosyası oluşturulamadı!"
    exit 1
fi

echo
echo "========================================"
echo "   Sertifika başarıyla oluşturuldu!"
echo "========================================"
echo
echo "Dosyalar:"
echo "- certs/private.key (Private key)"
echo "- certs/certificate.crt (Sertifika)"
echo "- certs/certificate.p12 (Code signing için)"
echo
echo "Ortam değişkeni ayarlayın:"
echo "export CSC_KEY_PASSWORD=your_password"
echo
echo "Test etmek için:"
echo "npm run sign:mac -- --publish=never"
echo 
@echo off
echo ========================================
echo    Self-Signed Sertifika Oluşturucu
echo ========================================
echo.

REM Git Bash'in kurulu olup olmadığını kontrol et
where bash >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: Git Bash bulunamadı!
    echo Lütfen Git for Windows'u kurun: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM certs klasörünü oluştur
if not exist "certs" (
    echo certs klasörü oluşturuluyor...
    mkdir certs
)

echo Self-signed sertifika oluşturuluyor...
echo.

REM Sertifika oluştur
bash -c "openssl req -x509 -newkey rsa:4096 -keyout certs/private.key -out certs/certificate.crt -days 365 -nodes -subj '/C=TR/ST=Istanbul/L=Istanbul/O=SesliSohbet/OU=Development/CN=seslisohbet.local'"

if %errorlevel% neq 0 (
    echo HATA: Sertifika oluşturulamadı!
    pause
    exit /b 1
)

echo.
echo .p12 formatına dönüştürülüyor...
echo.

REM .p12 formatına dönüştür
bash -c "openssl pkcs12 -export -out certs/certificate.p12 -inkey certs/private.key -in certs/certificate.crt -name 'SesliSohbet' -passout pass:your_password"

if %errorlevel% neq 0 (
    echo HATA: .p12 dosyası oluşturulamadı!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Sertifika başarıyla oluşturuldu!
echo ========================================
echo.
echo Dosyalar:
echo - certs/private.key (Private key)
echo - certs/certificate.crt (Sertifika)
echo - certs/certificate.p12 (Code signing için)
echo.
echo Ortam değişkeni ayarlayın:
echo set CSC_KEY_PASSWORD=your_password
echo.
echo Test etmek için:
echo npm run sign:win -- --publish=never
echo.
pause 
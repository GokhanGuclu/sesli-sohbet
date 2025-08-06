// macOS için notarization script - Windows'ta çalışmaz
module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  
  // Sadece macOS'ta çalıştır
  if (electronPlatformName !== 'darwin') {
    console.log('Notarization skipped - not macOS');
    return;
  }

  // electron-notarize modülünü kontrol et
  let notarize;
  try {
    notarize = require('electron-notarize');
  } catch (error) {
    console.log('electron-notarize not found, skipping notarization');
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.gokhanguclu.seslisohbet',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    ascProvider: process.env.ASC_PROVIDER
  });
}; 
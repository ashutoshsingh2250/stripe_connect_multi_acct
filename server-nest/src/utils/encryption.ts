const ENCRYPTION_KEY = 'stripe-connect-2025';

function simpleDecrypt(encryptedText: string, key: string): string {
  if (!encryptedText) return '';

  try {
    console.log('Decrypting:', encryptedText.substring(0, 20) + '...');
    const decodedText = Buffer.from(encryptedText, 'base64').toString();
    console.log('Base64 decoded length:', decodedText.length);

    let result = '';

    for (let i = 0; i < decodedText.length; i++) {
      const keyChar = key.charAt(i % key.length);
      const shift = keyChar.charCodeAt(0) % 10;

      const charCode = decodedText.charCodeAt(i);
      const shiftedCode = charCode - shift;
      result += String.fromCharCode(shiftedCode);
    }

    console.log(
      'Decrypted result starts with:',
      result.substring(0, 10) + '...',
    );
    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original if decryption fails
  }
}

export const decryptSecretKey = (encryptedSecretKey: string): string => {
  if (!encryptedSecretKey) return '';
  console.log(
    'Attempting to decrypt secret key, length:',
    encryptedSecretKey.length,
  );
  const result = simpleDecrypt(encryptedSecretKey, ENCRYPTION_KEY);
  console.log('Decryption result length:', result.length);
  return result;
};

export const decryptPublicKey = (encryptedPublicKey: string): string => {
  if (!encryptedPublicKey) return '';
  return simpleDecrypt(encryptedPublicKey, ENCRYPTION_KEY);
};

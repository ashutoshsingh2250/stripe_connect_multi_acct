// Backend encryption utility for API keys
// Using a reliable character shift that preserves all characters

const ENCRYPTION_KEY = 'stripe-connect-2025'; // This should be stored securely in production

// Simple character shift - preserves all characters including special ones
function simpleDecrypt(encryptedText: string, key: string): string {
    try {
        if (!encryptedText) return '';

        // First, decode from base64 using Buffer (more compatible with Node.js)
        let decoded: string;
        try {
            decoded = Buffer.from(encryptedText, 'base64').toString('binary');
        } catch (error) {
            // Fallback to utf8 if binary fails
            decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
        }

        // Then apply character shift decryption
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const keyChar = key.charAt(i % key.length);
            const shift = keyChar.charCodeAt(0) % 10; // Use modulo 10 for smaller shifts

            // Reverse the shift
            const charCode = decoded.charCodeAt(i);
            const shiftedCode = charCode - shift;
            result += String.fromCharCode(shiftedCode);
        }

        return result;
    } catch (error) {
        console.error('Decryption failed:', error);
        return '';
    }
}

// Decrypt API keys received from frontend
export const decryptApiKey = (encryptedApiKey: string): string => {
    if (!encryptedApiKey) return '';
    return simpleDecrypt(encryptedApiKey, ENCRYPTION_KEY);
};

// Decrypt public key received from frontend
export const decryptPublicKey = (encryptedPublicKey: string): string => {
    if (!encryptedPublicKey) return '';
    return simpleDecrypt(encryptedPublicKey, ENCRYPTION_KEY);
};

// Simple encryption utility for API keys
// Using a reliable character shift that preserves all characters

const ENCRYPTION_KEY = 'stripe-connect-2025'; // This should be stored securely in production

// Simple character shift - preserves all characters including special ones
function simpleEncrypt(text, key) {
    if (!text) return '';

    let result = '';
    for (let i = 0; i < text.length; i++) {
        const keyChar = key.charAt(i % key.length);
        const shift = keyChar.charCodeAt(0) % 10; // Use modulo 10 for smaller shifts

        // Shift all characters by the key value
        const charCode = text.charCodeAt(i);
        const shiftedCode = charCode + shift;
        result += String.fromCharCode(shiftedCode);
    }
    return btoa(result); // Base64 encode
}

function simpleDecrypt(encryptedText, key) {
    try {
        if (!encryptedText) return '';

        const decoded = atob(encryptedText); // Base64 decode
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

// Encrypt API keys before sending
export const encryptApiKey = apiKey => {
    if (!apiKey) return '';
    return simpleEncrypt(apiKey, ENCRYPTION_KEY);
};

// Encrypt public key
export const encryptPublicKey = publicKey => {
    if (!publicKey) return '';
    return simpleEncrypt(publicKey, ENCRYPTION_KEY);
};

// Decrypt API keys (for backend use)
export const decryptApiKey = encryptedApiKey => {
    if (!encryptedApiKey) return '';
    return simpleDecrypt(encryptedApiKey, ENCRYPTION_KEY);
};

// Decrypt public key (for backend use)
export const decryptPublicKey = encryptedPublicKey => {
    if (!encryptedPublicKey) return '';
    return simpleDecrypt(encryptedPublicKey, ENCRYPTION_KEY);
};

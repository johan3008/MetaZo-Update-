
import copy from 'copy-to-clipboard';

/**
 * Unsurpassed clipboard utility that works across secure (HTTPS) and non-secure contexts
 * by falling back to the legacy document.execCommand('copy') when necessary.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    // 1. Primordial Attempt: Navigator Clipboard API (Secure Context only)
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch(e) {
        console.warn('Navigator clipboard failed, falling back to copy-to-clipboard', e);
    }

    try {
        const success = copy(text, {
            debug: process.env.NODE_ENV !== 'production',
            message: 'Press #{key} to copy',
        });
        
        if (success) return true;
        
        return false;
    } catch (err) {
        console.error('[Clipboard] Robust copy failed:', err);
        return false;
    }
};

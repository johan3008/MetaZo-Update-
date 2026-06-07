
import copy from 'copy-to-clipboard';

/**
 * Unsurpassed clipboard utility that works across secure (HTTPS) and non-secure contexts
 * by falling back to the legacy document.execCommand('copy') when necessary.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    try {
        const success = copy(text, {
            debug: process.env.NODE_ENV !== 'production',
            message: 'Press #{key} to copy',
        });
        
        if (success) return true;
        
        // If copy-to-clipboard fails to return true, try navigator directly as extreme fallback
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        return false;
    } catch (err) {
        console.error('[Clipboard] Robust copy failed:', err);
        return false;
    }
};

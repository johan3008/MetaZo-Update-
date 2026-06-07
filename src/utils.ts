
/**
 * Unsurpassed clipboard utility that works across secure (HTTPS) and non-secure contexts
 * by falling back to the legacy document.execCommand('copy') when necessary.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    
    try {
        // 1. Primordial Attempt: Navigator Clipboard API (Secure Context only)
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // 2. Legacy Fallback: document.execCommand('copy')
        // Create a transient textarea element to hold the text
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure the element is part of the DOM but completely invisible
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";
        
        document.body.appendChild(textArea);
        
        // Select the text content
        textArea.focus();
        textArea.select();
        
        // Execute the copy command
        const successful = document.execCommand('copy');
        
        // Cleanup the transient element
        document.body.removeChild(textArea);
        
        return successful;
    } catch (err) {
        console.error('[Clipboard] Robust copy failed:', err);
        
        // Final desperate attempt using prompts if all else fails (rare window/iframe constraint)
        try {
            // Note: window.prompt might be blocked in some iframes, but it's a last resort
            // However, our instructions say to avoid window.alert/prompt in iframes.
            // So we'll just return false here and log it.
            return false;
        } catch (e) {
            return false;
        }
    }
};

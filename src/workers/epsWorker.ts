import * as pdfjsLib from 'pdfjs-dist';
import UTIF from 'utif';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

self.onmessage = async (e: MessageEvent) => {
    const { file } = e.data;
    
    try {
        // Read first 20MB to save RAM but catch deep PDFs
        const CHUNK_SIZE = 20 * 1024 * 1024;
        const slice = file.slice(0, Math.min(file.size, CHUNK_SIZE));
        const buffer = await slice.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // 1. Search for embedded PDF
        const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2D]; // "%PDF-"
        let pdfStartIndex = -1;
        
        for (let i = 0; i < uint8Array.length - 5; i++) {
            if (uint8Array[i] === pdfSignature[0] &&
                uint8Array[i+1] === pdfSignature[1] &&
                uint8Array[i+2] === pdfSignature[2] &&
                uint8Array[i+3] === pdfSignature[3] &&
                uint8Array[i+4] === pdfSignature[4]) {
                pdfStartIndex = i;
                break;
            }
        }
        
        if (pdfStartIndex !== -1) {
            const pdfBlob = file.slice(pdfStartIndex, file.size, 'application/pdf');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            let pdf: any = null;
            try {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                
                // 72 dpi is scale 1.0
                const viewport = page.getViewport({ scale: 1.0 });
                
                if (typeof OffscreenCanvas !== 'undefined') {
                    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#FFFFFF'; // White background instead of gray to prevent color distortion
                        ctx.fillRect(0, 0, viewport.width, viewport.height);
                    }
                    
                    await page.render({ canvasContext: ctx as any, viewport: viewport }).promise;
                    
                    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
                    
                    page.cleanup();
                    await pdf.destroy();
                    URL.revokeObjectURL(pdfUrl);
                    
                    self.postMessage({ success: true, blob: blob });
                    return;
                }
            } catch (err) {
                console.warn("PDF extraction in EPS failed", err);
            }
        }
        
        // DOS EPS TIFF extraction removed because embedded TIFF previews
        // in old EPS files are typically low-resolution, dithered (halftones),
        // and cause the AI to hallucinate "dots" and "textures".
        // Instead, let it fall through to XMP JPEG or hit the server's Ghostscript
        // which renders actual vectors to a clean image.

        // 3.5 Look for XMP Base64 JPEG Thumbnail (often found in AI files that aren't PDF compatible)
        const decoder = new TextDecoder('ascii');
        // Scan first 1MB for XMP metadata (thumbnails are usually early in the file)
        const xmpRange = uint8Array.slice(0, Math.min(uint8Array.length, 1024 * 1024));
        const textChunk = decoder.decode(xmpRange);
        const xmpMatch = textChunk.match(/<xmpGImg:image>([^<]+)<\/xmpGImg:image>/);
        if (xmpMatch && xmpMatch[1]) {
            try {
                // The match is a base64 string, convert it to a Blob
                const base64Str = xmpMatch[1].replace(/\s/g, ''); // remove any newlines
                const raw = atob(base64Str);
                const rawLength = raw.length;
                const array = new Uint8Array(new ArrayBuffer(rawLength));
                for(let i = 0; i < rawLength; i++) {
                    array[i] = raw.charCodeAt(i);
                }
                const blob = new Blob([array], { type: 'image/jpeg' });
                self.postMessage({ success: true, blob: blob });
                return;
            } catch(e) {
                console.warn("Failed to decode XMP base64", e);
            }
        }

        // 3. Fallback: Search for JPEG inside the EPS
        let start = -1;
        let end = -1;
        for (let i = 0; i < uint8Array.length - 2; i++) {
            if (uint8Array[i] === 0xFF && uint8Array[i+1] === 0xD8 && uint8Array[i+2] === 0xFF) {
                start = i;
                break;
            }
        }
        if (start !== -1) {
            for (let i = start; i < uint8Array.length - 1; i++) {
                if (uint8Array[i] === 0xFF && uint8Array[i+1] === 0xD9) {
                    end = i + 2;
                    break;
                }
            }
        }

        if (start !== -1 && end !== -1 && end > start) {
            const jpegBuffer = buffer.slice(start, end);
            const blob = new Blob([jpegBuffer], { type: 'image/jpeg' });
            self.postMessage({ success: true, blob: blob });
            return;
        }
        
        // If nothing found, return null to fallback to server
        self.postMessage({ success: false, error: 'No embedded preview found' });
        
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message });
    }
};

import fs from 'fs';

let code = fs.readFileSync('src/components/ImageQualityCheck.tsx', 'utf8');

const oldExtraction = `      if (file.type.startsWith('video/') || file.name.match(/\\.(mp4|mov)$/i)) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        const timeoutId = setTimeout(() => {
          URL.revokeObjectURL(url);
          reject(new Error("Video frame extraction timed out"));
        }, 15000);

        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration / 2 || 1);
        };

        video.onseeked = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                  // convert blob to file
                  const frameFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                  resolve(frameFile);
                } else {
                  reject(new Error("Failed to generate blob from video frame"));
                }
              }, 'image/jpeg', 0.85);
            } else {
              URL.revokeObjectURL(url);
              reject(new Error("Canvas context failed"));
            }
          } catch(e) {
            URL.revokeObjectURL(url);
            reject(e);
          }
        };
        video.onerror = (e) => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          reject(new Error("Error loading video"));
        };
      }`;

const newExtraction = `      if (file.type.startsWith('video/') || file.name.match(/\\.(mp4|mov)$/i)) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.preload = 'auto'; // Force load

        const timeoutId = setTimeout(() => {
          if (video.parentNode) video.parentNode.removeChild(video);
          URL.revokeObjectURL(url);
          reject(new Error("Video frame extraction timed out"));
        }, 25000);

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2 || 1);
        };

        video.onseeked = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (video.parentNode) video.parentNode.removeChild(video);
                URL.revokeObjectURL(url);
                if (blob) {
                  const frameFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                  resolve(frameFile);
                } else {
                  reject(new Error("Failed to generate blob from video frame"));
                }
              }, 'image/jpeg', 0.85);
            } else {
              if (video.parentNode) video.parentNode.removeChild(video);
              URL.revokeObjectURL(url);
              reject(new Error("Canvas context failed"));
            }
          } catch(e) {
            if (video.parentNode) video.parentNode.removeChild(video);
            URL.revokeObjectURL(url);
            reject(e);
          }
        };
        video.onerror = (e) => {
          clearTimeout(timeoutId);
          if (video.parentNode) video.parentNode.removeChild(video);
          URL.revokeObjectURL(url);
          reject(new Error("Error loading video"));
        };
        video.load();
      }`;

if (code.includes('Video frame extraction timed out')) {
    code = code.replace(oldExtraction, newExtraction);
    fs.writeFileSync('src/components/ImageQualityCheck.tsx', code);
    console.log("Patched ImageQualityCheck.tsx");
} else {
    console.log("Could not find extraction code in ImageQualityCheck.tsx");
}

export const extractVideoFrames = (file, numFrames = 12) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const frames = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let currentFrame = 0;
      
      const captureFrame = () => {
        if (currentFrame >= numFrames) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        
        const segmentDuration = duration / numFrames;
        const targetTime = (currentFrame * segmentDuration) + (Math.random() * (segmentDuration - 0.1));
        video.currentTime = Math.max(0, targetTime);
      };

      video.onseeked = () => {
        if (!ctx) return;
        const videoRatio = video.videoWidth / video.videoHeight;
        let drawWidth = 1280;
        let drawHeight = 1280 / videoRatio;
        if (drawHeight > 720) {
            drawHeight = 720;
            drawWidth = 720 * videoRatio;
        }
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]); // Only base64 part
        currentFrame++;
        captureFrame();
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video"));
      };
      
      captureFrame();
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
  });
};

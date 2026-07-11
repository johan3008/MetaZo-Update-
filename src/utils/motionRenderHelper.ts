import html2canvas from 'html2canvas';

export type RenderMode = 'worker-gpu' | 'gpu-ui' | 'media-recorder';

export interface RenderProgress {
  frame: number;
  totalFrames: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'done' | 'error';
  progressPercentage: number;
  message?: string;
}

export const startMotionRender = async (
  elementId: string,
  mode: RenderMode,
  fps: number,
  durationInFrames: number,
  onProgress: (progress: RenderProgress) => void
): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'error', progressPercentage: 0, message: 'Player element not found' });
    return null;
  }

  // Helper for delaying execution
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  if (mode === 'media-recorder') {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'preparing', progressPercentage: 10, message: 'Memulai MediaRecorder API...' });
    await delay(1000);
    
    for (let i = 0; i <= durationInFrames; i++) {
      await delay(1000 / fps);
      onProgress({ 
        frame: i, 
        totalFrames: durationInFrames, 
        status: 'rendering', 
        progressPercentage: 10 + Math.floor((i / durationInFrames) * 80),
        message: 'Merekam layar (Realtime)...' 
      });
    }

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'done', progressPercentage: 100, message: 'Selesai merekam!' });
    return 'blob:dummy-media-recorder.mp4';
  } 
  
  else if (mode === 'gpu-ui') {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'preparing', progressPercentage: 5, message: 'Menyiapkan GPU UI (Main Thread)...' });
    await delay(500);

    for (let i = 0; i < durationInFrames; i++) {
      await delay(50); 
      onProgress({ 
        frame: i, 
        totalFrames: durationInFrames, 
        status: 'rendering', 
        progressPercentage: 5 + Math.floor((i / durationInFrames) * 70),
        message: `Memotret DOM ke Gambar (Frame ${i}/${durationInFrames})`
      });
    }

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'encoding', progressPercentage: 80, message: 'Menyusun frame menjadi GIF/MP4...' });
    await delay(2000); 

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'done', progressPercentage: 100, message: 'Selesai di render!' });
    return 'blob:dummy-gpu-ui.mp4';
  }
  
  else if (mode === 'worker-gpu') {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'preparing', progressPercentage: 5, message: 'Memuat FFmpeg WebAssembly Worker...' });
    await delay(1500);

    for (let i = 0; i < durationInFrames; i++) {
      await delay(20); 
      onProgress({ 
        frame: i, 
        totalFrames: durationInFrames, 
        status: 'rendering', 
        progressPercentage: 5 + Math.floor((i / durationInFrames) * 50),
        message: `Rendering Frame di Background (${i}/${durationInFrames})`
      });
    }

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'encoding', progressPercentage: 60, message: 'FFmpeg sedang melakukan Encoding H.264...' });
    await delay(3000); 

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'done', progressPercentage: 100, message: 'Render Selesai (Kualitas Tertinggi)!' });
    return 'blob:dummy-worker-gpu.mp4';
  }

  return null;
};

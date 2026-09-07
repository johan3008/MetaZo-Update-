import html2canvas from 'html2canvas';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export type RenderMode = 'worker-gpu' | 'gpu-ui' | 'media-recorder';

export interface RenderProgress {
  frame: number;
  totalFrames: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'done' | 'error';
  progressPercentage: number;
  message?: string;
}

let ffmpeg: FFmpeg | null = null;
const loadFFmpeg = async (onLog: (msg: string) => void) => {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => onLog(message));
    // Load ffmpeg. We will use the default core URLs.
    await ffmpeg.load();
    return ffmpeg;
};

// Helper for delaying execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startMotionRender = async (
  elementId: string,
  mode: RenderMode,
  fps: number,
  durationInFrames: number,
  onProgress: (progress: RenderProgress) => void
): Promise<string | null> => {
  const container = document.getElementById(elementId);
  if (!container) {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'error', progressPercentage: 0, message: 'Container tidak ditemukan' });
    return null;
  }
  
  // Find the exact Remotion player container to screenshot.
  const targetElement = container.querySelector('.bg-black') as HTMLElement;
  
  if (!targetElement) {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'error', progressPercentage: 0, message: 'Elemen Remotion Player tidak ditemukan' });
    return null;
  }

  try {
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'preparing', progressPercentage: 5, message: 'Menyiapkan FFmpeg Engine...' });
    
    const ff = await loadFFmpeg((msg) => {
       console.log('[FFmpeg]', msg);
    });

    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'preparing', progressPercentage: 10, message: 'Mengekstrak frame...' });

    const frameDelayMs = 1000 / fps;
    const canvasImages: string[] = [];
    
    for (let i = 0; i < durationInFrames; i++) {
        const start = performance.now();
        
        // Memotret DOM menjadi gambar (canvas)
        const canvas = await html2canvas(targetElement, {
            scale: 1, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#000000'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        canvasImages.push(imgData);
        
        // Simpan gambar ke virtual file system FFmpeg
        const imgBlob = await fetch(imgData).then(r => r.blob());
        const frameFileName = `frame_${String(i).padStart(4, '0')}.jpg`;
        await ff.writeFile(frameFileName, await fetchFile(imgBlob));

        const end = performance.now();
        const elapsed = end - start;
        
        // Jika capture cepat, tunggu sisa waktu untuk mensimulasikan realtime
        if (elapsed < frameDelayMs) {
           await delay(frameDelayMs - elapsed);
        }

        onProgress({ 
            frame: i, 
            totalFrames: durationInFrames, 
            status: 'rendering', 
            progressPercentage: 10 + Math.floor((i / durationInFrames) * 60),
            message: `Memproses Frame ${i+1}/${durationInFrames}...`
        });
    }

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'encoding', progressPercentage: 75, message: 'Encoding MP4 dengan libx264...' });
    
    // Jalankan perintah FFmpeg
    await ff.exec([
        '-framerate', String(fps),
        '-i', 'frame_%04d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
    ]);

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'encoding', progressPercentage: 95, message: 'Menyimpan video...' });

    // Baca hasilnya
    const data = await ff.readFile('output.mp4');
    const videoBlob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(videoBlob);
    
    // Bersihkan file sementara
    for (let i = 0; i < durationInFrames; i++) {
        const frameFileName = `frame_${String(i).padStart(4, '0')}.jpg`;
        await ff.deleteFile(frameFileName);
    }
    await ff.deleteFile('output.mp4');

    onProgress({ frame: durationInFrames, totalFrames: durationInFrames, status: 'done', progressPercentage: 100, message: 'Render Selesai!' });
    
    return videoUrl;

  } catch (error: any) {
    console.error('Render Error:', error);
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'error', progressPercentage: 0, message: `Error: ${error.message}` });
    return null;
  }
};

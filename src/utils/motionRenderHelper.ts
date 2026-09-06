import html2canvas from 'html2canvas';
import * as MP4Box from 'mp4box';

export type RenderMode = 'deterministic-worker' | 'realtime-stream' | 'universal-mp4';
export type VideoFormat = 'mp4' | 'mov';

export interface RenderProgress {
  frame: number;
  totalFrames: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'done' | 'error';
  progressPercentage: number;
  message?: string;
}

export interface MotionRenderConfig {
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  scale?: number;           // 0.75, 1.0, 1.25, 1.5, 2.0
  format?: VideoFormat;     // 'mp4' | 'mov'
  bitrate?: number;         // 8M, 25M, 45M, 80M
  minSizePadMb?: number;    // 0 (Off), 50, 100, 200, 500
  onProgress: (progress: RenderProgress) => void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to get best supported MIME type for MediaRecorder
 */
function getSupportedMimeType(format: VideoFormat = 'mp4'): string {
  const mimeTypes = format === 'mov'
    ? [
        'video/quicktime',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ]
    : [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
  return mimeTypes.find(m => typeof window !== 'undefined' && (window as any).MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
}

/**
 * Apply PRE-PAD minimum file size padding for microstock/contributor requirements
 */
function applyPrePad(blob: Blob, minSizePadMb: number = 0, format: VideoFormat = 'mp4'): Blob {
  if (!minSizePadMb || minSizePadMb <= 0) return blob;

  const targetBytes = minSizePadMb * 1024 * 1024;
  if (blob.size >= targetBytes) return blob;

  const padLength = targetBytes - blob.size;
  const padding = new Uint8Array(padLength);
  const mimeType = format === 'mov' ? 'video/quicktime' : (blob.type || 'video/mp4');
  return new Blob([blob, padding], { type: mimeType });
}

/**
 * Wait for Remotion DOM to update to specified frame
 */
async function waitForFrameRender(frame: number): Promise<void> {
  const setRenderFrame = (window as any).__setRemotionRenderFrame;
  const player = (window as any).__remotionPlayerRef;

  if (typeof setRenderFrame === 'function') {
    setRenderFrame(frame);
  }
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(frame);
  }
  // Allow React and DOM to commit the frame update
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await delay(35);
}

/**
 * Capture clean frame from pure offscreen stage
 */
async function captureFrameToCanvas(
  targetElement: HTMLElement,
  recordCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  renderWidth: number,
  renderHeight: number,
  scale: number
): Promise<void> {
  try {
    const frameCanvas = await html2canvas(targetElement, {
      scale: scale,
      width: width,
      height: height,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#000000',
      logging: false,
      ignoreElements: (element) => {
        // Exclude any extraneous controls if present
        return element.classList?.contains('remotion-player-controls') || false;
      }
    });

    recordCtx.drawImage(frameCanvas, 0, 0, renderWidth, renderHeight);
  } catch (err) {
    console.warn('[Frame Capture Fallback]', err);
  }
}

/**
 * METHOD 1: Deterministik WebCodecs GPU + MP4Box (Master Quality, Frame-Perfect)
 * Exact Duration to the microsecond, exact resolution, exact bitrate.
 */
const renderDeterministicMaster = async (
  config: MotionRenderConfig
): Promise<string | null> => {
  const { fps, durationInFrames, width, height, scale = 1.0, format = 'mp4', bitrate: customBitrate, minSizePadMb = 0, onProgress } = config;

  const renderWidth = Math.round(width * scale);
  const renderHeight = Math.round(height * scale);

  // Even dimension constraint required by H.264 encoders
  const cleanWidth = renderWidth % 2 === 0 ? renderWidth : renderWidth + 1;
  const cleanHeight = renderHeight % 2 === 0 ? renderHeight : renderHeight + 1;

  let bitrate = customBitrate;
  if (!bitrate) {
    const totalPixels = cleanWidth * cleanHeight;
    if (totalPixels >= 3840 * 2160) bitrate = 80_000_000;
    else if (totalPixels >= 2560 * 1440) bitrate = 45_000_000;
    else if (totalPixels >= 1920 * 1080) bitrate = 25_000_000;
    else bitrate = 8_000_000;
  }

  const isWebCodecsSupported = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (!isWebCodecsSupported) {
    console.log('[RenderEngine] WebCodecs not supported, using high-precision MediaRecorder fallback');
    return renderUniversalEncoder(config);
  }

  return new Promise(async (resolve, reject) => {
    const player = (window as any).__remotionPlayerRef;
    const setRenderFrame = (window as any).__setRemotionRenderFrame;

    let encoder: VideoEncoder | null = null;

    try {
      onProgress({
        frame: 0,
        totalFrames: durationInFrames,
        status: 'preparing',
        progressPercentage: 5,
        message: `Menyiapkan WebCodecs GPU Master (${cleanWidth}×${cleanHeight} • ${scale}x • ${Math.round(bitrate / 1_000_000)}Mbps • ${format.toUpperCase()})...`
      });

      if (player && typeof player.pause === 'function') player.pause();

      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = cleanWidth;
      recordCanvas.height = cleanHeight;
      const ctx = recordCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!ctx) throw new Error('Gagal inisialisasi context Canvas 2D');

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, cleanWidth, cleanHeight);

      const createFileFn = (MP4Box as any).createFile || (MP4Box as any).default?.createFile || (window as any).MP4Box?.createFile;
      if (!createFileFn) throw new Error('MP4Box createFile tidak ditemukan');
      const mp4file = createFileFn();
      let trackId: number | null = null;
      let encodedFramesCount = 0;

      // Find supported AVC codec
      let chosenCodec = 'avc1.640028';
      try {
        const testRes = await VideoEncoder.isConfigSupported({
          codec: chosenCodec,
          width: cleanWidth,
          height: cleanHeight,
          bitrate: bitrate,
          framerate: fps
        });
        if (!testRes.supported) chosenCodec = 'avc1.4d002a';
      } catch {
        chosenCodec = 'avc1.42001f';
      }

      encoder = new VideoEncoder({
        output: (chunk, meta) => {
          const buffer = new ArrayBuffer(chunk.byteLength);
          chunk.copyTo(buffer);

          if (trackId === null) {
            const desc = meta?.decoderConfig?.description;
            trackId = mp4file.addTrack({
              timescale: 1000000,
              width: cleanWidth,
              height: cleanHeight,
              nb_samples: durationInFrames,
              avcDecoderConfigRecord: desc
            });
          }

          mp4file.addSample(trackId, buffer, {
            duration: Math.round(1000000 / fps),
            dts: chunk.timestamp,
            cts: chunk.timestamp,
            is_sync: chunk.type === 'key'
          });

          encodedFramesCount++;
        },
        error: (err) => {
          console.error('[WebCodecs Encoder Error]', err);
        }
      });

      encoder.configure({
        codec: chosenCodec,
        width: cleanWidth,
        height: cleanHeight,
        bitrate: bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware'
      });

      // Prepare target rendering stage
      const offscreenStage = document.getElementById('remotion-pure-render-stage');
      const targetElement = offscreenStage || (player && player.getContainerNode ? player.getContainerNode() : document.body);

      // Deterministic frame loop
      for (let i = 0; i < durationInFrames; i++) {
        await waitForFrameRender(i);

        const currentTarget = document.getElementById('remotion-pure-render-stage')
          || (player && typeof player.getContainerNode === 'function' ? player.getContainerNode() : null)
          || document.body;

        await captureFrameToCanvas(
          currentTarget,
          ctx,
          width,
          height,
          cleanWidth,
          cleanHeight,
          scale
        );

        // Exact timestamp in microseconds
        const frameTimestampUs = Math.round((i / fps) * 1000000);
        const frameDurationUs = Math.round((1 / fps) * 1000000);

        const videoFrame = new VideoFrame(recordCanvas, {
          timestamp: frameTimestampUs,
          duration: frameDurationUs
        });

        encoder.encode(videoFrame, { keyFrame: i % (fps * 2) === 0 });
        videoFrame.close();

        const pct = 10 + Math.floor(((i + 1) / durationInFrames) * 82);
        onProgress({
          frame: i + 1,
          totalFrames: durationInFrames,
          status: 'rendering',
          progressPercentage: pct,
          message: `[GPU WebCodecs] Frame ${i + 1}/${durationInFrames} (${Math.round(((i + 1) / durationInFrames) * 100)}%)...`
        });
      }

      onProgress({
        frame: durationInFrames,
        totalFrames: durationInFrames,
        status: 'encoding',
        progressPercentage: 95,
        message: 'Finalisasi Multiplexer MP4Box & Metadata...'
      });

      await encoder.flush();
      encoder.close();
      encoder = null;

      // Extract MP4 buffer
      const mp4Buffer = mp4file.getBuffer();
      let videoBlob = new Blob([mp4Buffer], { type: format === 'mov' ? 'video/quicktime' : 'video/mp4' });

      // Apply PRE-PAD minimum size if selected
      if (minSizePadMb > 0) {
        videoBlob = applyPrePad(videoBlob, minSizePadMb, format);
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      if (typeof setRenderFrame === 'function') setRenderFrame(null);
      if (player && typeof player.play === 'function') player.play();

      onProgress({
        frame: durationInFrames,
        totalFrames: durationInFrames,
        status: 'done',
        progressPercentage: 100,
        message: `Render Sukses! (${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB)`
      });

      resolve(videoUrl);
    } catch (err: any) {
      console.error('[WebCodecs Master Render Error]', err);
      if (encoder) {
        try { encoder.close(); } catch {}
      }
      if (typeof setRenderFrame === 'function') setRenderFrame(null);
      if (player && typeof player.play === 'function') player.play();
      // Fallback to universal encoder
      console.log('[RenderEngine] Falling back to universal MediaRecorder encoder...');
      renderUniversalEncoder(config).then(resolve).catch(reject);
    }
  });
};

/**
 * METHOD 2: Canvas captureStream Langsung (Real-Time Playback Sync)
 */
const renderRealtimeDirectStream = async (
  config: MotionRenderConfig
): Promise<string | null> => {
  const { fps, durationInFrames, width, height, scale = 1.0, format = 'mp4', bitrate: customBitrate, minSizePadMb = 0, onProgress } = config;

  return new Promise(async (resolve, reject) => {
    const player = (window as any).__remotionPlayerRef;
    const setRenderFrame = (window as any).__setRemotionRenderFrame;

    try {
      const renderWidth = Math.round(width * scale);
      const renderHeight = Math.round(height * scale);
      const cleanWidth = renderWidth % 2 === 0 ? renderWidth : renderWidth + 1;
      const cleanHeight = renderHeight % 2 === 0 ? renderHeight : renderHeight + 1;

      const bitrate = customBitrate || 25_000_000;

      onProgress({
        frame: 0,
        totalFrames: durationInFrames,
        status: 'preparing',
        progressPercentage: 5,
        message: `Menyiapkan Real-Time Playback Stream (${cleanWidth}×${cleanHeight} • ${Math.round(bitrate / 1000000)}Mbps)...`
      });

      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = cleanWidth;
      recordCanvas.height = cleanHeight;
      const ctx = recordCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!ctx) throw new Error('Gagal inisialisasi context Canvas 2D');

      const stream = recordCanvas.captureStream(fps);
      const selectedMime = getSupportedMimeType(format);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: bitrate
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        let videoBlob = new Blob(chunks, { type: selectedMime });
        if (minSizePadMb > 0) {
          videoBlob = applyPrePad(videoBlob, minSizePadMb, format);
        }

        const videoUrl = URL.createObjectURL(videoBlob);
        if (typeof setRenderFrame === 'function') setRenderFrame(null);
        if (player && typeof player.play === 'function') player.play();

        onProgress({
          frame: durationInFrames,
          totalFrames: durationInFrames,
          status: 'done',
          progressPercentage: 100,
          message: `Real-Time Render Selesai! (${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB)`
        });
        resolve(videoUrl);
      };

      mediaRecorder.start();

      const offscreenStage = document.getElementById('remotion-pure-render-stage');
      const targetElement = offscreenStage || (player && player.getContainerNode ? player.getContainerNode() : document.body);

      const frameIntervalMs = 1000 / fps;

      for (let i = 0; i < durationInFrames; i++) {
        const frameStart = performance.now();

        await waitForFrameRender(i);

        const currentTarget = document.getElementById('remotion-pure-render-stage')
          || (player && typeof player.getContainerNode === 'function' ? player.getContainerNode() : null)
          || document.body;

        await captureFrameToCanvas(
          currentTarget,
          ctx,
          width,
          height,
          cleanWidth,
          cleanHeight,
          scale
        );

        const track = stream.getVideoTracks()[0];
        if (track && (track as any).requestFrame) {
          (track as any).requestFrame();
        }

        const elapsed = performance.now() - frameStart;
        if (elapsed < frameIntervalMs) {
          await delay(frameIntervalMs - elapsed);
        }

        onProgress({
          frame: i + 1,
          totalFrames: durationInFrames,
          status: 'rendering',
          progressPercentage: 10 + Math.floor(((i + 1) / durationInFrames) * 85),
          message: `[Real-Time Stream] Frame ${i + 1}/${durationInFrames}...`
        });
      }

      onProgress({
        frame: durationInFrames,
        totalFrames: durationInFrames,
        status: 'encoding',
        progressPercentage: 98,
        message: 'Mengemas Video Output...'
      });

      await delay(150);
      mediaRecorder.stop();
    } catch (err: any) {
      console.error('[Realtime Render Error]', err);
      if (typeof setRenderFrame === 'function') setRenderFrame(null);
      if (player && typeof player.play === 'function') player.play();
      reject(err);
    }
  });
};

/**
 * METHOD 3: Universal MediaRecorder MP4 / WebM (Universal Fallback, Exact Duration Paced)
 */
const renderUniversalEncoder = async (
  config: MotionRenderConfig
): Promise<string | null> => {
  const { fps, durationInFrames, width, height, scale = 1.0, format = 'mp4', bitrate: customBitrate, minSizePadMb = 0, onProgress } = config;

  return new Promise(async (resolve, reject) => {
    const player = (window as any).__remotionPlayerRef;
    const setRenderFrame = (window as any).__setRemotionRenderFrame;

    try {
      const renderWidth = Math.round(width * scale);
      const renderHeight = Math.round(height * scale);
      const cleanWidth = renderWidth % 2 === 0 ? renderWidth : renderWidth + 1;
      const cleanHeight = renderHeight % 2 === 0 ? renderHeight : renderHeight + 1;

      const bitrate = customBitrate || 20_000_000;

      onProgress({
        frame: 0,
        totalFrames: durationInFrames,
        status: 'preparing',
        progressPercentage: 5,
        message: `Menyiapkan Universal Encoder (${cleanWidth}×${cleanHeight} • ${Math.round(bitrate / 1000000)}Mbps)...`
      });

      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = cleanWidth;
      recordCanvas.height = cleanHeight;
      const ctx = recordCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!ctx) throw new Error('Gagal inisialisasi context Canvas 2D');

      const stream = recordCanvas.captureStream(fps);
      const selectedMime = getSupportedMimeType(format);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: bitrate
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        let videoBlob = new Blob(chunks, { type: selectedMime });
        if (minSizePadMb > 0) {
          videoBlob = applyPrePad(videoBlob, minSizePadMb, format);
        }

        const videoUrl = URL.createObjectURL(videoBlob);
        if (typeof setRenderFrame === 'function') setRenderFrame(null);
        if (player && typeof player.play === 'function') player.play();

        onProgress({
          frame: durationInFrames,
          totalFrames: durationInFrames,
          status: 'done',
          progressPercentage: 100,
          message: `Universal Render Selesai! (${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB)`
        });
        resolve(videoUrl);
      };

      mediaRecorder.start();

      const offscreenStage = document.getElementById('remotion-pure-render-stage');
      const targetElement = offscreenStage || (player && player.getContainerNode ? player.getContainerNode() : document.body);

      const frameIntervalMs = 1000 / fps;

      for (let i = 0; i < durationInFrames; i++) {
        const frameStart = performance.now();

        await waitForFrameRender(i);

        const currentTarget = document.getElementById('remotion-pure-render-stage')
          || (player && typeof player.getContainerNode === 'function' ? player.getContainerNode() : null)
          || document.body;

        await captureFrameToCanvas(
          currentTarget,
          ctx,
          width,
          height,
          cleanWidth,
          cleanHeight,
          scale
        );

        const track = stream.getVideoTracks()[0];
        if (track && (track as any).requestFrame) {
          (track as any).requestFrame();
        }

        const elapsed = performance.now() - frameStart;
        if (elapsed < frameIntervalMs) {
          await delay(frameIntervalMs - elapsed);
        }

        onProgress({
          frame: i + 1,
          totalFrames: durationInFrames,
          status: 'rendering',
          progressPercentage: 10 + Math.floor(((i + 1) / durationInFrames) * 85),
          message: `[Universal MP4] Frame ${i + 1}/${durationInFrames}...`
        });
      }

      onProgress({
        frame: durationInFrames,
        totalFrames: durationInFrames,
        status: 'encoding',
        progressPercentage: 98,
        message: 'Mengemas Video Output...'
      });

      await delay(150);
      mediaRecorder.stop();
    } catch (err: any) {
      console.error('[Universal Render Error]', err);
      if (typeof setRenderFrame === 'function') setRenderFrame(null);
      if (player && typeof player.play === 'function') player.play();
      reject(err);
    }
  });
};

/**
 * Main Motion Render Dispatcher
 */
export const startMotionRender = async (
  elementId: string,
  mode: RenderMode,
  fps: number,
  durationInFrames: number,
  width: number,
  height: number,
  onProgress: (progress: RenderProgress) => void,
  options?: {
    scale?: number;
    format?: VideoFormat;
    bitrate?: number;
    minSizePadMb?: number;
  }
): Promise<string | null> => {
  const config: MotionRenderConfig = {
    fps,
    durationInFrames,
    width,
    height,
    scale: options?.scale ?? 1.0,
    format: options?.format ?? 'mp4',
    bitrate: options?.bitrate,
    minSizePadMb: options?.minSizePadMb ?? 0,
    onProgress
  };

  try {
    if (mode === 'realtime-stream') {
      return await renderRealtimeDirectStream(config);
    } else if (mode === 'universal-mp4') {
      return await renderUniversalEncoder(config);
    } else {
      // Default: deterministic-worker (Master Quality WebCodecs + MP4Box)
      return await renderDeterministicMaster(config);
    }
  } catch (error: any) {
    console.error('Render Error:', error);
    onProgress({ frame: 0, totalFrames: durationInFrames, status: 'error', progressPercentage: 0, message: `Error: ${error.message || 'Render gagal'}` });
    return null;
  }
};





import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import jpeg from 'jpeg-js';

const execPromise = util.promisify(exec);

export interface VideoTechnicalReport {
  ffprobe: {
    duration: number;
    size: number;
    bitrate: number;
    video: {
      codec: string;
      profile: string;
      width: number;
      height: number;
      fps: number;
      avg_fps: number;
      color_range: string;
      color_space: string;
      color_transfer: string;
      color_primaries: string;
    };
    audio?: {
      codec: string;
      sample_rate: number;
      channels: number;
    };
  };
  filters: {
    black_frames_detected: boolean;
    black_frames: Array<{ start: number; end: number; duration: number }>;
    frozen_frames_detected: boolean;
    frozen_frames: Array<{ start: number; duration: number }>;
    audio_silence_detected?: boolean;
  };
  scene_detection?: {
    scene_changes_detected: boolean;
    scene_changes: Array<{ timestamp: number }>;
    scenes: Array<{ scene_number: number; start: number; end: number; duration: number }>;
  };
  frameAnalysis: Array<{
    frameIndex: number;
    sharpness: number; // Laplacian variance
    blurStatus: 'SHARP' | 'SOFT' | 'BLURRED';
    overexposurePercent: number; // % pixels > 245
    underexposurePercent: number; // % pixels < 10
    averageLuminance: number; // 0-255
    averageColor: { r: number; g: number; b: number };
  }>;
  stabilityIndex: number; // Average frame-to-frame luminance difference
  stabilityStatus: 'STABLE' | 'UNSTABLE' | 'FLICKERING';
}

/**
 * Extracts comprehensive technical details using ffprobe.
 */
async function runFfprobe(videoPath: string, ffprobePath: string): Promise<any> {
  const cmd = `"${ffprobePath}" -v error -show_format -show_streams -of json "${videoPath}"`;
  const { stdout } = await execPromise(cmd);
  const data = JSON.parse(stdout);
  
  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video') || {};
  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
  const format = data.format || {};

  const parseFps = (fpsStr: string) => {
    if (!fpsStr || !fpsStr.includes('/')) return parseFloat(fpsStr) || 0;
    const parts = fpsStr.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    return den !== 0 ? num / den : 0;
  };

  return {
    duration: parseFloat(format.duration) || parseFloat(videoStream.duration) || 0,
    size: parseInt(format.size, 10) || 0,
    bitrate: parseInt(format.bit_rate, 10) || parseInt(videoStream.bit_rate, 10) || 0,
    video: {
      codec: videoStream.codec_name || 'unknown',
      profile: videoStream.profile || 'unknown',
      width: parseInt(videoStream.width, 10) || 0,
      height: parseInt(videoStream.height, 10) || 0,
      fps: parseFps(videoStream.r_frame_rate),
      avg_fps: parseFps(videoStream.avg_frame_rate),
      color_range: videoStream.color_range || 'unknown',
      color_space: videoStream.color_space || 'unknown',
      color_transfer: videoStream.color_transfer || 'unknown',
      color_primaries: videoStream.color_primaries || 'unknown'
    },
    audio: audioStream ? {
      codec: audioStream.codec_name || 'unknown',
      sample_rate: parseInt(audioStream.sample_rate, 10) || 0,
      channels: parseInt(audioStream.channels, 10) || 0
    } : undefined
  };
}

/**
 * Runs FFmpeg filters for black frame and freeze detection.
 */
async function runFfmpegFilters(videoPath: string, ffmpegPath: string): Promise<any> {
  const black_frames: Array<{ start: number; end: number; duration: number }> = [];
  const frozen_frames: Array<{ start: number; duration: number }> = [];
  
  try {
    // Run blackdetect and freezedetect filters
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "blackdetect=d=0.1:pix_th=0.10,freezedetect=d=0.3:noise=0.005" -an -f null -`;
    const { stderr } = await execPromise(cmd);
    
    // Parse stderr for blackdetect outputs: [blackdetect @ 0x...] black_start:1.2 black_end:3.4 black_duration:2.2
    const blackRegex = /black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g;
    let match;
    while ((match = blackRegex.exec(stderr)) !== null) {
      black_frames.push({
        start: parseFloat(match[1]),
        end: parseFloat(match[2]),
        duration: parseFloat(match[3])
      });
    }

    // Parse stderr for freezedetect outputs: [freezedetect @ 0x...] freeze_start: 4.5 freeze_duration: 1.2
    const freezeRegex = /freeze_start:\s*([\d.]+)\s+freeze_duration:\s*([\d.]+)/g;
    while ((match = freezeRegex.exec(stderr)) !== null) {
      frozen_frames.push({
        start: parseFloat(match[1]),
        duration: parseFloat(match[2])
      });
    }
  } catch (err) {
    console.warn('[videoAnalyzer] FFmpeg filter analysis had errors or warnings:', err);
  }

  return {
    black_frames_detected: black_frames.length > 0,
    black_frames,
    frozen_frames_detected: frozen_frames.length > 0,
    frozen_frames
  };
}

/**
 * Runs FFmpeg scene-detection select filter to locate cuts and boundaries.
 */
async function runSceneDetection(videoPath: string, ffmpegPath: string, duration: number): Promise<any> {
  const scene_changes: Array<{ timestamp: number }> = [];
  const scenes: Array<{ scene_number: number; start: number; end: number; duration: number }> = [];

  try {
    // Run select filter for scene detection with typical threshold of 0.35 (similar to PySceneDetect standard)
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.35)',showinfo" -f null -`;
    const { stderr } = await execPromise(cmd);

    const ptsRegex = /pts_time:([\d.]+)/g;
    let match;
    const detectedTimestamps: number[] = [];

    while ((match = ptsRegex.exec(stderr)) !== null) {
      const ts = parseFloat(match[1]);
      // Avoid duplicate timestamps
      if (!detectedTimestamps.includes(ts)) {
        detectedTimestamps.push(ts);
      }
    }

    // Sort detected timestamps ascending
    detectedTimestamps.sort((a, b) => a - b);

    // Build scene changes list
    for (const ts of detectedTimestamps) {
      scene_changes.push({ timestamp: ts });
    }

    // Build the scene segments list
    let currentStart = 0;
    let sceneCount = 1;

    for (const ts of detectedTimestamps) {
      // Avoid scenes that are too short (e.g., < 0.1s)
      if (ts - currentStart > 0.1) {
        scenes.push({
          scene_number: sceneCount++,
          start: currentStart,
          end: ts,
          duration: ts - currentStart
        });
        currentStart = ts;
      }
    }

    // Add final scene to end of video
    if (duration - currentStart > 0.1) {
      scenes.push({
        scene_number: sceneCount,
        start: currentStart,
        end: duration,
        duration: duration - currentStart
      });
    }
  } catch (err) {
    console.warn('[videoAnalyzer] Scene detection failed or had warnings:', err);
  }

  return {
    scene_changes_detected: scene_changes.length > 0,
    scene_changes,
    scenes
  };
}

/**
 * Perform pixel-level analysis on JPEG image data.
 * Mimics OpenCV sharpness (Laplacian variance), exposure histograms, and average color properties.
 */
function analyzeFramePixelData(jpegBuffer: Buffer, index: number): VideoTechnicalReport['frameAnalysis'][0] {
  try {
    const rawData = jpeg.decode(jpegBuffer, { useTarray: false });
    const width = rawData.width;
    const height = rawData.height;
    const data = rawData.data; // Flat buffer of RGBA bytes: [R, G, B, A, R, G, B, A, ...]

    // We will build a grayscale 2D array of the pixels.
    // To keep it super fast and memory safe, we can downsample or sample at regular intervals,
    // but with 800x450 frames, a single loop is extremely fast in Node.js (approx 1-2 ms).
    const gray = new Float32Array(width * height);
    let rSum = 0, gSum = 0, bSum = 0;
    let overexposedCount = 0;
    let underexposedCount = 0;
    
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      rSum += r;
      gSum += g;
      bSum += b;

      // Grayscale conversion (Luminance)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = lum;

      if (lum > 245) overexposedCount++;
      if (lum < 10) underexposedCount++;
    }

    const avgColor = {
      r: Math.round(rSum / totalPixels),
      g: Math.round(gSum / totalPixels),
      b: Math.round(bSum / totalPixels)
    };
    const averageLuminance = 0.299 * avgColor.r + 0.587 * avgColor.g + 0.114 * avgColor.b;

    // Laplacian Filter convolution for sharpness calculation
    // Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    // We compute the laplacian values only for interior pixels to avoid boundary checks.
    const laplacianValues: number[] = [];
    let laplacianSum = 0;

    // To speed up computation and avoid overhead, sample pixels on a step grid
    const step = 2; // Check every 2nd pixel
    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = y * width + x;
        const up = (y - 1) * width + x;
        const down = (y + 1) * width + x;
        const left = idx - 1;
        const right = idx + 1;

        // Laplacian value
        const lap = gray[left] + gray[right] + gray[up] + gray[down] - 4 * gray[idx];
        laplacianValues.push(lap);
        laplacianSum += lap;
      }
    }

    const N = laplacianValues.length;
    const mean = laplacianSum / N;
    let varianceSum = 0;
    for (let i = 0; i < N; i++) {
      const diff = laplacianValues[i] - mean;
      varianceSum += diff * diff;
    }

    const variance = N > 0 ? varianceSum / N : 0;
    
    // Scale or adjust standard sharpness status threshold
    let blurStatus: 'SHARP' | 'SOFT' | 'BLURRED' = 'SHARP';
    if (variance < 15) {
      blurStatus = 'BLURRED';
    } else if (variance < 40) {
      blurStatus = 'SOFT';
    }

    return {
      frameIndex: index,
      sharpness: Math.round(variance * 100) / 100,
      blurStatus,
      overexposurePercent: Math.round((overexposedCount / totalPixels) * 1000) / 10,
      underexposurePercent: Math.round((underexposedCount / totalPixels) * 1000) / 10,
      averageLuminance: Math.round(averageLuminance * 10) / 10,
      averageColor
    };
  } catch (err) {
    console.error(`[videoAnalyzer] Pixel analysis failed for frame ${index}:`, err);
    // Safe fallback values
    return {
      frameIndex: index,
      sharpness: 50.0,
      blurStatus: 'SHARP',
      overexposurePercent: 0.0,
      underexposurePercent: 0.0,
      averageLuminance: 120.0,
      averageColor: { r: 120, g: 120, b: 120 }
    };
  }
}

/**
 * Runs the full technical analysis on a local video file.
 */
export async function analyzeVideoTechnically(videoPath: string, framesBase64: string[]): Promise<VideoTechnicalReport> {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;

  // 1. Run ffprobe technical extraction
  console.log('[videoAnalyzer] Extracting technical metadata with ffprobe...');
  const probeData = await runFfprobe(videoPath, ffprobePath);

  // 2. Run FFmpeg filters (blackdetect, freezedetect)
  console.log('[videoAnalyzer] Running FFmpeg filters for anomaly detection...');
  const filterData = await runFfmpegFilters(videoPath, ffmpegPath);

  // 3. Pixel level frame analysis using jpeg-js
  console.log('[videoAnalyzer] Conducting pixel-level analysis for extracted frames...');
  const frameAnalysis: VideoTechnicalReport['frameAnalysis'] = [];
  
  for (let i = 0; i < framesBase64.length; i++) {
    const base64Str = framesBase64[i];
    // Remove data URI header if present
    const cleanBase64 = base64Str.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const analysis = analyzeFramePixelData(buffer, i + 1);
    frameAnalysis.push(analysis);
  }

  // 4. Calculate stability index (difference in luminance between consecutive frames)
  let stabilityIndex = 0;
  if (frameAnalysis.length > 1) {
    let diffSum = 0;
    for (let i = 1; i < frameAnalysis.length; i++) {
      diffSum += Math.abs(frameAnalysis[i].averageLuminance - frameAnalysis[i - 1].averageLuminance);
    }
    stabilityIndex = diffSum / (frameAnalysis.length - 1);
  }

  let stabilityStatus: 'STABLE' | 'UNSTABLE' | 'FLICKERING' = 'STABLE';
  if (stabilityIndex > 45) {
    stabilityStatus = 'FLICKERING';
  } else if (stabilityIndex > 20) {
    stabilityStatus = 'UNSTABLE';
  }

  // 5. Run scene change detection using select filter
  console.log('[videoAnalyzer] Running scene detection...');
  const sceneData = await runSceneDetection(videoPath, ffmpegPath, probeData.duration);

  return {
    ffprobe: probeData,
    filters: filterData,
    scene_detection: sceneData,
    frameAnalysis,
    stabilityIndex: Math.round(stabilityIndex * 10) / 10,
    stabilityStatus
  };
}

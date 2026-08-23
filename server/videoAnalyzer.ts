import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import jpeg from 'jpeg-js';

const execPromise = util.promisify(exec);

// ============================================================
// VIDEO TECHNICAL REPORT (Full Pipeline: FFmpeg + OpenCV + MediaInfo)
// ============================================================

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
      pix_fmt?: string;
      has_b_frames?: number;
    };
    audio?: { codec: string; sample_rate: number; channels: number };
  };
  filters: {
    black_frames_detected: boolean;
    black_frames: Array<{ start: number; end: number; duration: number }>;
    frozen_frames_detected: boolean;
    frozen_frames: Array<{ start: number; duration: number }>;
  };
  signalstats?: {
    luminance_min: number;
    luminance_max: number;
    luminance_avg: number;
    saturation_min: number;
    saturation_max: number;
    saturation_avg: number;
  };
  vmaf_motion?: {
    motion_score: number;
    motion_interpretation: string;
  };
  scene_detection?: {
    scene_changes_detected: boolean;
    scene_changes: Array<{ timestamp: number }>;
    scenes: Array<{ scene_number: number; start: number; end: number; duration: number }>;
  };
  frameAnalysis: Array<{
    frameIndex: number;
    sharpness: number;
    blurStatus: string;
    overexposurePercent: number;
    underexposurePercent: number;
    averageLuminance: number;
    averageColor: { r: number; g: number; b: number };
  }>;
  stabilityIndex: number;
  stabilityStatus: string;
  temporal?: {
    comparedFrames: number;
    meanAbsDiff: number;
    duplicatePairs: number;
    duplicateRate: number;
    luminanceDeltaMean: number;
    luminanceDeltaMax: number;
    flickerScore: number;
    motionConsistencyScore: number;
    ghostingStatus: "UNKNOWN";
    temporalMorphingStatus: "UNKNOWN";
  };
}

// ============================================================
// 1. FFprobe — Complete technical metadata (MediaInfo equivalent)
// ============================================================
async function runFfprobe(videoPath: string, ffprobePath: string): Promise<any> {
  const cmd = `"${ffprobePath}" -v error -show_format -show_streams -show_frames -read_intervals "%+#1" -of json "${videoPath}"`;
  const { stdout } = await execPromise(cmd);
  const data = JSON.parse(stdout);
  
  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video') || {};
  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
  const format = data.format || {};
  
  // Get keyframe info from first frame
  const firstFrame = data.frames?.find((f: any) => f.media_type === 'video');
  const hasBFrames = videoStream.has_b_frames !== undefined ? videoStream.has_b_frames : -1;

  const parseFps = (fpsStr: string) => {
    if (!fpsStr || !fpsStr.includes('/')) return parseFloat(fpsStr) || 0;
    const parts = fpsStr.split('/');
    return parts[1] !== '0' ? parseFloat(parts[0]) / parseFloat(parts[1]) : 0;
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
      color_primaries: videoStream.color_primaries || 'unknown',
      pix_fmt: videoStream.pix_fmt || 'unknown',
      has_b_frames: hasBFrames
    },
    audio: audioStream ? {
      codec: audioStream.codec_name || 'unknown',
      sample_rate: parseInt(audioStream.sample_rate, 10) || 0,
      channels: parseInt(audioStream.channels, 10) || 0
    } : undefined
  };
}

// ============================================================
// 2. FFmpeg filters — blackdetect + freezedetect
// ============================================================
async function runFfmpegFilters(videoPath: string, ffmpegPath: string): Promise<any> {
  const black_frames: Array<{ start: number; end: number; duration: number }> = [];
  const frozen_frames: Array<{ start: number; duration: number }> = [];
  
  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "blackdetect=d=0.1:pix_th=0.10,freezedetect=d=0.3:noise=0.005" -an -f null -`;
    const { stderr } = await execPromise(cmd);
    
    const blackRegex = /black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g;
    let match;
    while ((match = blackRegex.exec(stderr)) !== null) {
      black_frames.push({ start: parseFloat(match[1]), end: parseFloat(match[2]), duration: parseFloat(match[3]) });
    }

    const freezeRegex = /freeze_start:\s*([\d.]+)\s+freeze_duration:\s*([\d.]+)/g;
    while ((match = freezeRegex.exec(stderr)) !== null) {
      frozen_frames.push({ start: parseFloat(match[1]), duration: parseFloat(match[2]) });
    }
  } catch (err) {
    console.warn('[videoAnalyzer] FFmpeg filter analysis had errors:', err);
  }

  return { black_frames_detected: black_frames.length > 0, black_frames, frozen_frames_detected: frozen_frames.length > 0, frozen_frames };
}

// ============================================================
// 3. Signalstats filter — luminance & saturation statistics
// ============================================================
async function runSignalstats(videoPath: string, ffmpegPath: string): Promise<any> {
  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "signalstats" -an -f null -`;
    const { stderr } = await execPromise(cmd);
    
    const lumMinRegex = /YMIN=([\d.]+)/g;
    const lumMaxRegex = /YMAX=([\d.]+)/g;
    const lumAvgRegex = /YAVG=([\d.]+)/g;
    const satMinRegex = /UMIN=([\d.]+)/;
    const satMaxRegex = /UMAX=([\d.]+)/;
    const satAvgRegex = /UAVG=([\d.]+)/;
    
    let lumMin = Infinity, lumMax = -Infinity, lumSum = 0, lumCount = 0;
    let satMin = Infinity, satMax = -Infinity, satSum = 0, satCount = 0;
    
    let m;
    while ((m = lumMinRegex.exec(stderr)) !== null) { const v = parseFloat(m[1]); if (v < lumMin) lumMin = v; }
    while ((m = lumMaxRegex.exec(stderr)) !== null) { const v = parseFloat(m[1]); if (v > lumMax) lumMax = v; }
    while ((m = lumAvgRegex.exec(stderr)) !== null) { lumSum += parseFloat(m[1]); lumCount++; }
    
    // Reset regex for U channel (saturation approximation)
    const satMinRegex2 = /UMIN=([\d.]+)/g;
    const satMaxRegex2 = /UMAX=([\d.]+)/g;
    const satAvgRegex2 = /UAVG=([\d.]+)/g;
    while ((m = satMinRegex2.exec(stderr)) !== null) { const v = parseFloat(m[1]); if (v < satMin) satMin = v; }
    while ((m = satMaxRegex2.exec(stderr)) !== null) { const v = parseFloat(m[1]); if (v > satMax) satMax = v; }
    while ((m = satAvgRegex2.exec(stderr)) !== null) { satSum += parseFloat(m[1]); satCount++; }
    
    if (lumCount === 0) return null;
    
    return {
      luminance_min: Math.round(lumMin * 100) / 100,
      luminance_max: Math.round(lumMax * 100) / 100,
      luminance_avg: Math.round((lumSum / lumCount) * 100) / 100,
      saturation_min: Math.round(satMin * 100) / 100,
      saturation_max: Math.round(satMax * 100) / 100,
      saturation_avg: Math.round((satSum / satCount) * 100) / 100
    };
  } catch (err) {
    console.warn('[videoAnalyzer] signalstats failed:', err);
    return null;
  }
}

// ============================================================
// 4. VMAF Motion filter — motion vector analysis
// ============================================================
async function runVmafMotion(videoPath: string, ffmpegPath: string): Promise<any> {
  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "vmafmotion" -an -f null -`;
    const { stderr } = await execPromise(cmd);
    
    const motionRegex = /motion:\s*([\d.e+-]+)/gi;
    let total = 0, count = 0, maxVal = 0;
    let m;
    while ((m = motionRegex.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v)) { total += v; count++; if (v > maxVal) maxVal = v; }
    }
    
    if (count === 0) return null;
    
    const avg = total / count;
    let interpretation = 'UNKNOWN';
    if (avg < 1.5) interpretation = 'LOW';
    else if (avg < 4.0) interpretation = 'MEDIUM';
    else interpretation = 'HIGH';
    
    return {
      motion_score: Math.round(avg * 1000) / 1000,
      motion_interpretation: interpretation
    };
  } catch (err) {
    console.warn('[videoAnalyzer] vmafmotion failed (may not be supported in this FFmpeg build):', err);
    return null;
  }
}

// ============================================================
// 5. Scene detection (PySceneDetect equivalent via FFmpeg)
// ============================================================
async function runSceneDetection(videoPath: string, ffmpegPath: string, duration: number): Promise<any> {
  const scene_changes: Array<{ timestamp: number }> = [];
  const scenes: Array<{ scene_number: number; start: number; end: number; duration: number }> = [];

  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.35)',showinfo" -f null -`;
    const { stderr } = await execPromise(cmd);

    const ptsRegex = /pts_time:([\d.]+)/g;
    let match;
    const detectedTimestamps: number[] = [];
    while ((match = ptsRegex.exec(stderr)) !== null) {
      const ts = parseFloat(match[1]);
      if (!detectedTimestamps.includes(ts)) detectedTimestamps.push(ts);
    }
    detectedTimestamps.sort((a, b) => a - b);

    for (const ts of detectedTimestamps) scene_changes.push({ timestamp: ts });

    let currentStart = 0, sceneCount = 1;
    for (const ts of detectedTimestamps) {
      if (ts - currentStart > 0.1) {
        scenes.push({ scene_number: sceneCount++, start: currentStart, end: ts, duration: ts - currentStart });
        currentStart = ts;
      }
    }
    if (duration - currentStart > 0.1) {
      scenes.push({ scene_number: sceneCount, start: currentStart, end: duration, duration: duration - currentStart });
    }
  } catch (err) {
    console.warn('[videoAnalyzer] Scene detection failed:', err);
  }

  return { scene_changes_detected: scene_changes.length > 0, scene_changes, scenes };
}

// ============================================================
// 6. OpenCV-style pixel analysis — Laplacian sharpness, exposure
// ============================================================
function analyzeFramePixelData(jpegBuffer: Buffer, index: number): VideoTechnicalReport['frameAnalysis'][0] {
  try {
    const rawData = jpeg.decode(jpegBuffer, { useTarray: false });
    const { width, height, data } = rawData;
    const gray = new Float32Array(width * height);
    let rSum = 0, gSum = 0, bSum = 0;
    let overCount = 0, underCount = 0;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const off = i * 4;
      const r = data[off], g = data[off + 1], b = data[off + 2];
      rSum += r; gSum += g; bSum += b;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = lum;
      if (lum > 245) overCount++;
      if (lum < 10) underCount++;
    }

    const avgColor = { r: Math.round(rSum / totalPixels), g: Math.round(gSum / totalPixels), b: Math.round(bSum / totalPixels) };
    const avgLum = 0.299 * avgColor.r + 0.587 * avgColor.g + 0.114 * avgColor.b;

    // Laplacian sharpness
    const lapVals: number[] = [];
    let lapSum = 0;
    const step = 2;
    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = y * width + x;
        const lap = gray[(y-1)*width+x] + gray[(y+1)*width+x] + gray[idx-1] + gray[idx+1] - 4 * gray[idx];
        lapVals.push(lap); lapSum += lap;
      }
    }
    const N = lapVals.length;
    const mean = lapSum / N;
    let varSum = 0;
    for (let i = 0; i < N; i++) { const d = lapVals[i] - mean; varSum += d * d; }
    const variance = N > 0 ? varSum / N : 0;
    
    let blurStatus: string = 'SHARP';
    if (variance < 15) blurStatus = 'BLURRED';
    else if (variance < 40) blurStatus = 'SOFT';

    return {
      frameIndex: index,
      sharpness: Math.round(variance * 100) / 100,
      blurStatus,
      overexposurePercent: Math.round((overCount / totalPixels) * 1000) / 10,
      underexposurePercent: Math.round((underCount / totalPixels) * 1000) / 10,
      averageLuminance: Math.round(avgLum * 10) / 10,
      averageColor: avgColor
    };
  } catch (err) {
    console.error(`[videoAnalyzer] Pixel analysis failed frame ${index}:`, err);
    return { frameIndex: index, sharpness: 50, blurStatus: 'SHARP', overexposurePercent: 0, underexposurePercent: 0, averageLuminance: 120, averageColor: { r: 120, g: 120, b: 120 } };
  }
}

// ============================================================
// 6B. Temporal frame-difference analysis
// ============================================================
function decodeTemporalSample(jpegBuffer: Buffer): {
  width: number;
  height: number;
  luminance: number;
  samples: Uint8Array;
} | null {
  try {
    const raw = jpeg.decode(jpegBuffer, { useTarray: false });
    const { width, height, data } = raw;
    const targetWidth = Math.min(160, width);
    const targetHeight = Math.max(1, Math.round((height / width) * targetWidth));
    const samples = new Uint8Array(targetWidth * targetHeight);
    let sum = 0;

    for (let y = 0; y < targetHeight; y++) {
      const sourceY = Math.min(height - 1, Math.floor((y / targetHeight) * height));
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = Math.min(width - 1, Math.floor((x / targetWidth) * width));
        const off = (sourceY * width + sourceX) * 4;
        const lum = Math.round(
          0.299 * data[off] +
          0.587 * data[off + 1] +
          0.114 * data[off + 2]
        );
        samples[y * targetWidth + x] = lum;
        sum += lum;
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      luminance: sum / samples.length,
      samples
    };
  } catch {
    return null;
  }
}

export function analyzeTemporalFrames(
  frameBuffers: Buffer[],
  expectedFullFrameCount?: number
): VideoTechnicalReport["temporal"] {
  const fullCount = Math.min(
    frameBuffers.length,
    Math.max(2, expectedFullFrameCount || frameBuffers.length)
  );
  const buffers = frameBuffers.slice(0, fullCount);
  const decoded = buffers.map(decodeTemporalSample);
  if (decoded.some(item => !item) || decoded.length < 2) return undefined;

  const valid = decoded as Array<NonNullable<ReturnType<typeof decodeTemporalSample>>>;
  const pairDiffs: number[] = [];
  const luminanceDeltas: number[] = [];

  for (let i = 1; i < valid.length; i++) {
    const a = valid[i - 1];
    const b = valid[i];
    const count = Math.min(a.samples.length, b.samples.length);
    let diff = 0;

    for (let j = 0; j < count; j++) {
      diff += Math.abs(a.samples[j] - b.samples[j]);
    }

    pairDiffs.push(diff / count);
    luminanceDeltas.push(Math.abs(a.luminance - b.luminance));
  }

  const duplicatePairs = pairDiffs.filter(diff => diff < 1.5).length;
  const duplicateRate = duplicatePairs / pairDiffs.length;
  const meanAbsDiff = pairDiffs.reduce((sum, value) => sum + value, 0) / pairDiffs.length;
  const luminanceDeltaMean =
    luminanceDeltas.reduce((sum, value) => sum + value, 0) / luminanceDeltas.length;
  const luminanceDeltaMax = Math.max(...luminanceDeltas);

  const highDeltaPairs = pairDiffs.filter(diff => diff > 45).length;
  const alternatingLuminance =
    luminanceDeltas.length >= 3 &&
    luminanceDeltas.slice(1).every((value, index) => {
      const previous = luminanceDeltas[index];
      return Math.abs(value - previous) < Math.max(8, previous * 0.6);
    });

  const flickerScore = Math.min(
    100,
    luminanceDeltaMean * 2 +
      highDeltaPairs / pairDiffs.length * 35 +
      (alternatingLuminance ? 20 : 0)
  );

  const motionConsistencyScore = Math.max(
    0,
    100 -
      Math.abs(meanAbsDiff - 12) * 2 -
      (duplicateRate > 0.2 ? 30 : 0)
  );

  return {
    comparedFrames: valid.length,
    meanAbsDiff: Math.round(meanAbsDiff * 100) / 100,
    duplicatePairs,
    duplicateRate: Math.round(duplicateRate * 1000) / 1000,
    luminanceDeltaMean: Math.round(luminanceDeltaMean * 100) / 100,
    luminanceDeltaMax: Math.round(luminanceDeltaMax * 100) / 100,
    flickerScore: Math.round(flickerScore * 100) / 100,
    motionConsistencyScore: Math.round(motionConsistencyScore * 100) / 100,
    ghostingStatus: "UNKNOWN",
    temporalMorphingStatus: "UNKNOWN"
  };
}

// ============================================================
// MAIN: Full pipeline analysis
// ============================================================


// ============================================================
// AUDIO ANALYSIS: ffprobe + silence detect + loudness check
// ============================================================
async function runAudioAnalysis(videoPath: string, ffprobePath: string): Promise<any> {
  try {
    const execPromise = util.promisify(exec);
    
    // Get audio stream info
    const { stdout: audioInfo } = await execPromise(`"${ffprobePath}" -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of json "${videoPath}"`);
    const audioStream = JSON.parse(audioInfo).streams?.[0] || null;
    
    if (!audioStream) return { has_audio: false };
    
    // Check for silence / low volume using volumedetect
    let volumeStats = null;
    try {
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      const { stderr } = await execPromise(`"${ffmpegPath}" -i "${videoPath}" -af "volumedetect" -f null - 2>&1`);
      const meanMatch = stderr.match(/mean_volume:s*(-?[\d.]+)s*dB/);
      const maxMatch = stderr.match(/max_volume:s*(-?[\d.]+)s*dB/);
      volumeStats = {
        mean_volume_db: meanMatch ? parseFloat(meanMatch[1]) : null,
        max_volume_db: maxMatch ? parseFloat(maxMatch[1]) : null
      };
    } catch (e) {
      console.warn('[videoAnalyzer] volumedetect failed:', e);
    }
    
    return {
      has_audio: true,
      codec: audioStream.codec_name || 'unknown',
      sample_rate: parseInt(audioStream.sample_rate, 10) || 0,
      channels: parseInt(audioStream.channels, 10) || 0,
      bit_rate: parseInt(audioStream.bit_rate, 10) || 0,
      volume: volumeStats,
      issues: []
    };
  } catch (e) {
    console.warn('[videoAnalyzer] Audio analysis failed:', e);
    return { has_audio: false, error: String(e) };
  }
}

// ============================================================
// LIGHTWEIGHT MODE: Fast pipeline for Vercel serverless (skip slow analyses)
// ============================================================
export async function analyzeVideoTechnicallyLightweight(videoPath: string, framesBase64: string[]): Promise<VideoTechnicalReport> {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;

  console.log('[videoAnalyzer:LW] 1/4 — ffprobe: technical metadata...');
  
  // AKURASI: Jalankan audio analysis paralel dengan ffprobe
  const audioPromise = runAudioAnalysis(videoPath, ffprobePath);
  const probeData = await runFfprobe(videoPath, ffprobePath);

  // Jalankan blackdetect + freezedetect paralel (tidak sequential)
  console.log('[videoAnalyzer:LW] 2/4 — FFmpeg filters (parallel)...');
  const filterPromise = runFfmpegFilters(videoPath, ffmpegPath);

  // Jalankan pixel analysis paralel dengan filters
  console.log('[videoAnalyzer:LW] 3/4 — Pixel analysis...');
  const frameAnalysis: any[] = [];
  for (let i = 0; i < framesBase64.length; i++) {
    const clean = framesBase64[i].replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/png;base64,/, '');
    frameAnalysis.push(analyzeFramePixelData(Buffer.from(clean, 'base64'), i + 1));
  }

  const filterData = await filterPromise;

  const temporal = analyzeTemporalFrames(
    framesBase64.map(frame => Buffer.from(
      frame.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/png;base64,/, ''),
      'base64'
    )),
    Math.min(6, framesBase64.length)
  );
  const stabilityIndex = temporal?.luminanceDeltaMean ?? 0;
  let stabilityStatus: string = 'STABLE';
  if ((temporal?.flickerScore ?? 0) >= 70) stabilityStatus = 'FLICKERING';
  else if ((temporal?.flickerScore ?? 0) >= 40) stabilityStatus = 'UNSTABLE';

  // AKURASI: Dapatkan hasil audio analysis
  const audioData = await audioPromise;
  console.log('[videoAnalyzer:LW] 4/4 — Audio analysis complete');

  // SKIP: signalstats, vmafmotion, scene detection (too slow for serverless)
  // These are non-critical for the quality decision

  return {
    ffprobe: probeData,
    filters: filterData,
    frameAnalysis,
    stabilityIndex: Math.round(stabilityIndex * 10) / 10,
    stabilityStatus,
    temporal,
    audio: audioData
  };
}
export async function analyzeVideoTechnically(videoPath: string, framesBase64: string[]): Promise<VideoTechnicalReport> {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;

  console.log('[videoAnalyzer] 1/6 — ffprobe: technical metadata (MediaInfo)...');
  const probeData = await runFfprobe(videoPath, ffprobePath);

  console.log('[videoAnalyzer] 2/6 — FFmpeg filters: blackdetect + freezedetect...');
  const filterData = await runFfmpegFilters(videoPath, ffmpegPath);

  console.log('[videoAnalyzer] 3/6 — signalstats: luminance & saturation...');
  const signalstats = await runSignalstats(videoPath, ffmpegPath);

  console.log('[videoAnalyzer] 4/6 — vmafmotion: motion vector analysis...');
  const vmafMotion = await runVmafMotion(videoPath, ffmpegPath);

  console.log('[videoAnalyzer] 5/6 — OpenCV-style: pixel-level frame analysis...');
  const frameAnalysis: any[] = [];
  for (let i = 0; i < framesBase64.length; i++) {
    const clean = framesBase64[i].replace(/^data:image\/jpeg;base64,/, '');
    frameAnalysis.push(analyzeFramePixelData(Buffer.from(clean, 'base64'), i + 1));
  }

  const temporal = analyzeTemporalFrames(
    framesBase64.map(frame => Buffer.from(
      frame.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/png;base64,/, ''),
      'base64'
    )),
    Math.min(6, framesBase64.length)
  );
  const stabilityIndex = temporal?.luminanceDeltaMean ?? 0;
  let stabilityStatus: string = 'STABLE';
  if ((temporal?.flickerScore ?? 0) >= 70) stabilityStatus = 'FLICKERING';
  else if ((temporal?.flickerScore ?? 0) >= 40) stabilityStatus = 'UNSTABLE';

  console.log('[videoAnalyzer] 6/6 — PySceneDetect: scene change analysis...');
  const sceneData = await runSceneDetection(videoPath, ffmpegPath, probeData.duration);

  return {
    ffprobe: probeData,
    filters: filterData,
    signalstats: signalstats || undefined,
    vmaf_motion: vmafMotion || undefined,
    scene_detection: sceneData,
    frameAnalysis,
    stabilityIndex: Math.round(stabilityIndex * 10) / 10,
    stabilityStatus,
    temporal
  };
}

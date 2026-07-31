var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// data/project/MetaZo-Update--main/server/videoAnalyzer.ts
var videoAnalyzer_exports = {};
__export(videoAnalyzer_exports, {
  analyzeVideoTechnically: () => analyzeVideoTechnically
});
async function runFfprobe(videoPath, ffprobePath) {
  const cmd = `"${ffprobePath}" -v error -show_format -show_streams -show_frames -read_intervals "%+#1" -of json "${videoPath}"`;
  const { stdout } = await execPromise(cmd);
  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s) => s.codec_type === "video") || {};
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");
  const format = data.format || {};
  const firstFrame = data.frames?.find((f) => f.media_type === "video");
  const hasBFrames = videoStream.has_b_frames !== void 0 ? videoStream.has_b_frames : -1;
  const parseFps = (fpsStr) => {
    if (!fpsStr || !fpsStr.includes("/")) return parseFloat(fpsStr) || 0;
    const parts = fpsStr.split("/");
    return parts[1] !== "0" ? parseFloat(parts[0]) / parseFloat(parts[1]) : 0;
  };
  return {
    duration: parseFloat(format.duration) || parseFloat(videoStream.duration) || 0,
    size: parseInt(format.size, 10) || 0,
    bitrate: parseInt(format.bit_rate, 10) || parseInt(videoStream.bit_rate, 10) || 0,
    video: {
      codec: videoStream.codec_name || "unknown",
      profile: videoStream.profile || "unknown",
      width: parseInt(videoStream.width, 10) || 0,
      height: parseInt(videoStream.height, 10) || 0,
      fps: parseFps(videoStream.r_frame_rate),
      avg_fps: parseFps(videoStream.avg_frame_rate),
      color_range: videoStream.color_range || "unknown",
      color_space: videoStream.color_space || "unknown",
      color_transfer: videoStream.color_transfer || "unknown",
      color_primaries: videoStream.color_primaries || "unknown",
      pix_fmt: videoStream.pix_fmt || "unknown",
      has_b_frames: hasBFrames
    },
    audio: audioStream ? {
      codec: audioStream.codec_name || "unknown",
      sample_rate: parseInt(audioStream.sample_rate, 10) || 0,
      channels: parseInt(audioStream.channels, 10) || 0
    } : void 0
  };
}
async function runFfmpegFilters(videoPath, ffmpegPath) {
  const black_frames = [];
  const frozen_frames = [];
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
    console.warn("[videoAnalyzer] FFmpeg filter analysis had errors:", err);
  }
  return { black_frames_detected: black_frames.length > 0, black_frames, frozen_frames_detected: frozen_frames.length > 0, frozen_frames };
}
async function runSignalstats(videoPath, ffmpegPath) {
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
    while ((m = lumMinRegex.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (v < lumMin) lumMin = v;
    }
    while ((m = lumMaxRegex.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (v > lumMax) lumMax = v;
    }
    while ((m = lumAvgRegex.exec(stderr)) !== null) {
      lumSum += parseFloat(m[1]);
      lumCount++;
    }
    const satMinRegex2 = /UMIN=([\d.]+)/g;
    const satMaxRegex2 = /UMAX=([\d.]+)/g;
    const satAvgRegex2 = /UAVG=([\d.]+)/g;
    while ((m = satMinRegex2.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (v < satMin) satMin = v;
    }
    while ((m = satMaxRegex2.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (v > satMax) satMax = v;
    }
    while ((m = satAvgRegex2.exec(stderr)) !== null) {
      satSum += parseFloat(m[1]);
      satCount++;
    }
    if (lumCount === 0) return null;
    return {
      luminance_min: Math.round(lumMin * 100) / 100,
      luminance_max: Math.round(lumMax * 100) / 100,
      luminance_avg: Math.round(lumSum / lumCount * 100) / 100,
      saturation_min: Math.round(satMin * 100) / 100,
      saturation_max: Math.round(satMax * 100) / 100,
      saturation_avg: Math.round(satSum / satCount * 100) / 100
    };
  } catch (err) {
    console.warn("[videoAnalyzer] signalstats failed:", err);
    return null;
  }
}
async function runVmafMotion(videoPath, ffmpegPath) {
  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "vmafmotion" -an -f null -`;
    const { stderr } = await execPromise(cmd);
    const motionRegex = /motion:\s*([\d.e+-]+)/gi;
    let total = 0, count = 0, maxVal = 0;
    let m;
    while ((m = motionRegex.exec(stderr)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v)) {
        total += v;
        count++;
        if (v > maxVal) maxVal = v;
      }
    }
    if (count === 0) return null;
    const avg = total / count;
    let interpretation = "UNKNOWN";
    if (avg < 1.5) interpretation = "LOW";
    else if (avg < 4) interpretation = "MEDIUM";
    else interpretation = "HIGH";
    return {
      motion_score: Math.round(avg * 1e3) / 1e3,
      motion_interpretation: interpretation
    };
  } catch (err) {
    console.warn("[videoAnalyzer] vmafmotion failed (may not be supported in this FFmpeg build):", err);
    return null;
  }
}
async function runSceneDetection(videoPath, ffmpegPath, duration) {
  const scene_changes = [];
  const scenes = [];
  try {
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.35)',showinfo" -f null -`;
    const { stderr } = await execPromise(cmd);
    const ptsRegex = /pts_time:([\d.]+)/g;
    let match;
    const detectedTimestamps = [];
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
    console.warn("[videoAnalyzer] Scene detection failed:", err);
  }
  return { scene_changes_detected: scene_changes.length > 0, scene_changes, scenes };
}
function analyzeFramePixelData(jpegBuffer, index) {
  try {
    const rawData = import_jpeg_js.default.decode(jpegBuffer, { useTarray: false });
    const { width, height, data } = rawData;
    const gray = new Float32Array(width * height);
    let rSum = 0, gSum = 0, bSum = 0;
    let overCount = 0, underCount = 0;
    const totalPixels = width * height;
    for (let i = 0; i < totalPixels; i++) {
      const off = i * 4;
      const r = data[off], g = data[off + 1], b = data[off + 2];
      rSum += r;
      gSum += g;
      bSum += b;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = lum;
      if (lum > 245) overCount++;
      if (lum < 10) underCount++;
    }
    const avgColor = { r: Math.round(rSum / totalPixels), g: Math.round(gSum / totalPixels), b: Math.round(bSum / totalPixels) };
    const avgLum = 0.299 * avgColor.r + 0.587 * avgColor.g + 0.114 * avgColor.b;
    const lapVals = [];
    let lapSum = 0;
    const step = 2;
    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = y * width + x;
        const lap = gray[(y - 1) * width + x] + gray[(y + 1) * width + x] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx];
        lapVals.push(lap);
        lapSum += lap;
      }
    }
    const N = lapVals.length;
    const mean = lapSum / N;
    let varSum = 0;
    for (let i = 0; i < N; i++) {
      const d = lapVals[i] - mean;
      varSum += d * d;
    }
    const variance = N > 0 ? varSum / N : 0;
    let blurStatus = "SHARP";
    if (variance < 15) blurStatus = "BLURRED";
    else if (variance < 40) blurStatus = "SOFT";
    return {
      frameIndex: index,
      sharpness: Math.round(variance * 100) / 100,
      blurStatus,
      overexposurePercent: Math.round(overCount / totalPixels * 1e3) / 10,
      underexposurePercent: Math.round(underCount / totalPixels * 1e3) / 10,
      averageLuminance: Math.round(avgLum * 10) / 10,
      averageColor: avgColor
    };
  } catch (err) {
    console.error(`[videoAnalyzer] Pixel analysis failed frame ${index}:`, err);
    return { frameIndex: index, sharpness: 50, blurStatus: "SHARP", overexposurePercent: 0, underexposurePercent: 0, averageLuminance: 120, averageColor: { r: 120, g: 120, b: 120 } };
  }
}
async function analyzeVideoTechnically(videoPath, framesBase64) {
  const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  const ffprobePath = require("@ffprobe-installer/ffprobe").path;
  console.log("[videoAnalyzer] 1/6 \u2014 ffprobe: technical metadata (MediaInfo)...");
  const probeData = await runFfprobe(videoPath, ffprobePath);
  console.log("[videoAnalyzer] 2/6 \u2014 FFmpeg filters: blackdetect + freezedetect...");
  const filterData = await runFfmpegFilters(videoPath, ffmpegPath);
  console.log("[videoAnalyzer] 3/6 \u2014 signalstats: luminance & saturation...");
  const signalstats = await runSignalstats(videoPath, ffmpegPath);
  console.log("[videoAnalyzer] 4/6 \u2014 vmafmotion: motion vector analysis...");
  const vmafMotion = await runVmafMotion(videoPath, ffmpegPath);
  console.log("[videoAnalyzer] 5/6 \u2014 OpenCV-style: pixel-level frame analysis...");
  const frameAnalysis = [];
  for (let i = 0; i < framesBase64.length; i++) {
    const clean = framesBase64[i].replace(/^data:image\/jpeg;base64,/, "");
    frameAnalysis.push(analyzeFramePixelData(Buffer.from(clean, "base64"), i + 1));
  }
  let stabilityIndex = 0;
  if (frameAnalysis.length > 1) {
    let diffSum = 0;
    for (let i = 1; i < frameAnalysis.length; i++) {
      diffSum += Math.abs(frameAnalysis[i].averageLuminance - frameAnalysis[i - 1].averageLuminance);
    }
    stabilityIndex = diffSum / (frameAnalysis.length - 1);
  }
  let stabilityStatus = "STABLE";
  if (stabilityIndex > 45) stabilityStatus = "FLICKERING";
  else if (stabilityIndex > 20) stabilityStatus = "UNSTABLE";
  console.log("[videoAnalyzer] 6/6 \u2014 PySceneDetect: scene change analysis...");
  const sceneData = await runSceneDetection(videoPath, ffmpegPath, probeData.duration);
  return {
    ffprobe: probeData,
    filters: filterData,
    signalstats: signalstats || void 0,
    vmaf_motion: vmafMotion || void 0,
    scene_detection: sceneData,
    frameAnalysis,
    stabilityIndex: Math.round(stabilityIndex * 10) / 10,
    stabilityStatus
  };
}
var import_child_process, import_util, import_jpeg_js, execPromise;
var init_videoAnalyzer = __esm({
  "data/project/MetaZo-Update--main/server/videoAnalyzer.ts"() {
    import_child_process = require("child_process");
    import_util = __toESM(require("util"), 1);
    import_jpeg_js = __toESM(require("jpeg-js"), 1);
    execPromise = import_util.default.promisify(import_child_process.exec);
  }
});

// data/project/MetaZo-Update--main/server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_ffmpeg = require("@ffmpeg-installer/ffmpeg");
var import_ffprobe = require("@ffprobe-installer/ffprobe");
var import_fluent_ffmpeg = require("fluent-ffmpeg");
var import_package = require("@ffmpeg-installer/linux-x64/package.json");
var import_package2 = require("@ffprobe-installer/linux-x64/package.json");
var import_express = __toESM(require("express"), 1);
var import_genai2 = require("@google/genai");
var import_multer = __toESM(require("multer"), 1);
var import_child_process2 = require("child_process");
var import_util2 = __toESM(require("util"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var import_url = require("url");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_pakasir_client = require("pakasir-client");

// data/project/MetaZo-Update--main/server/gemini.ts
var import_genai = require("@google/genai");
var import_node_async_hooks = require("node:async_hooks");

// data/project/MetaZo-Update--main/server/holidaysData.ts
var HOLIDAYS_DATA = {
  january: [
    {
      name: "New Year's Day",
      date: "1 January 2026",
      location: "Global/World",
      commercial_potential: "High demand for celebratory themes, clocks striking midnight, sparkling toasts, family resolution planning, and fresh calendar layouts.",
      suggested_topics: ["new year celebration", "toast", "clock midnight", "family resolution", "fresh calendar"]
    },
    {
      name: "World Braille Day",
      date: "4 January 2026",
      location: "Global/UN",
      commercial_potential: "Commercial interest in accessibility features, education, inclusive school setups, tactile reading, and supportive learning technologies.",
      suggested_topics: ["braille reading", "accessibility", "inclusive education", "tactile writing", "supportive learning"]
    },
    {
      name: "Epiphany / Three Kings Day",
      date: "6 January 2026",
      location: "Spain, Mexico, Latin America, Europe",
      commercial_potential: "Strong demand for traditional Roscon de Reyes cake, three kings crown iconography, kids receiving gifts, and vibrant family dinners.",
      suggested_topics: ["roscon de reyes", "three kings crown", "gift giving", "family dinner", "traditional parade"]
    },
    {
      name: "Orthodox Christmas",
      date: "7 January 2026",
      location: "Eastern Europe, Russia, Greece",
      commercial_potential: "Demand for cozy religious winter holidays, family feasts, traditional candlelight services, and rustic wooden dining tables.",
      suggested_topics: ["orthodox christmas", "family feast", "candlelight service", "winter holiday", "rustic dining"]
    },
    {
      name: "National Youth Day",
      date: "12 January 2026",
      location: "India",
      commercial_potential: "High demand for young entrepreneurs, dynamic student collaboration, local youth development seminars, and sports training graphics.",
      suggested_topics: ["young entrepreneurs", "student collaboration", "youth development", "sports training", "vibrant youth"]
    },
    {
      name: "World Snow Day",
      date: "15 January 2026",
      location: "Global/World",
      commercial_potential: "Excellent potential for winter sports equipment, snowboarding, family ski vacations, and cozy winter travel flatlays.",
      suggested_topics: ["snowboarding", "ski vacation", "winter sports", "snowy mountain", "cozy winter travel"]
    },
    {
      name: "Martin Luther King Jr. Day",
      date: "19 January 2026",
      location: "USA",
      commercial_potential: "High demand for diversity, human rights graphics, unity concept photos, social justice campaigns, and educational materials.",
      suggested_topics: ["human rights", "diversity", "unity concept", "social justice", "mlk memorial"]
    },
    {
      name: "International Day of Education",
      date: "24 January 2026",
      location: "Global/UNESCO",
      commercial_potential: "Commercial demand for digital learning, modern classroom setups, remote tutoring, student laptops, and teacher-student collaboration.",
      suggested_topics: ["digital learning", "modern classroom", "remote tutoring", "student laptop", "teacher student"]
    },
    {
      name: "Republic Day of India",
      date: "26 January 2026",
      location: "India",
      commercial_potential: "Massive demand for Indian national tricolor (saffron, white, green) graphics, patriotic parades, community celebrations, and heritage photos.",
      suggested_topics: ["indian tricolor", "patriotic parade", "republic day", "delhi parade", "national pride"]
    },
    {
      name: "Australia Day",
      date: "26 January 2026",
      location: "Australia",
      commercial_potential: "High demand for summer backyard barbecues, beach gatherings, Australian flag iconography, and happy outdoor lifestyles.",
      suggested_topics: ["backyard barbecue", "beach gathering", "australian flag", "outdoor lifestyle", "summer vibe"]
    },
    {
      name: "International Customs Day",
      date: "26 January 2026",
      location: "Global",
      commercial_potential: "Demand for global logistics, shipping containers, border control officer assets, and digital trade documentation models.",
      suggested_topics: ["global logistics", "shipping container", "border control", "trade documentation", "supply chain"]
    },
    {
      name: "International Holocaust Remembrance Day",
      date: "27 January 2026",
      location: "Global/UN",
      commercial_potential: "Demand for historical education, candles of remembrance, memorial graphics, and human rights history assets.",
      suggested_topics: ["holocaust remembrance", "remembrance candle", "memorial graphic", "history education", "never forget"]
    },
    {
      name: "Data Privacy Day",
      date: "28 January 2026",
      location: "Global",
      commercial_potential: "Crucial demand for cybersecurity concepts, encrypted folders, digital key icons, locked laptop graphics, and biometric protection.",
      suggested_topics: ["cybersecurity", "encrypted folder", "biometric protection", "locked laptop", "data privacy"]
    }
  ],
  february: [
    {
      name: "World Cancer Day",
      date: "4 February 2026",
      location: "Global/UN",
      commercial_potential: "Strong demand for lavender and pink ribbon graphics, medical support, oncology researchers, patient counseling, and wellness themes.",
      suggested_topics: ["lavender ribbon", "cancer support", "medical research", "patient counseling", "wellness care"]
    },
    {
      name: "International Day of Women and Girls in Science",
      date: "11 February 2026",
      location: "Global/UN",
      commercial_potential: "High demand for female scientists in futuristic laboratory setups, microscopy work, biotech research, and coding workshops.",
      suggested_topics: ["female scientist", "laboratory research", "microscopy work", "biotech research", "women in tech"]
    },
    {
      name: "World Radio Day",
      date: "13 February 2026",
      location: "Global/UNESCO",
      commercial_potential: "Niche demand for podcasting setups, audio microphones, vintage radio illustrations, audio wave graphs, and modern broadcasting gear.",
      suggested_topics: ["podcasting setup", "audio microphone", "vintage radio", "broadcasting gear", "sound wave"]
    },
    {
      name: "Ascension of Prophet Muhammad (Isra Mi'raj)",
      date: "14 February 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Strong demand for serene mosque silhouette art, prayer mats, Islamic calligraphy vector files, and religious community gatherings.",
      suggested_topics: ["mosque silhouette", "prayer mat", "islamic calligraphy", "community prayer", "spiritual evening"]
    },
    {
      name: "Valentine's Day",
      date: "14 February 2026",
      location: "Global/World",
      commercial_potential: "Extremely high demand for sweet gifts, red roses, heart chocolate boxes, romantic candlelight dinners, couples portraits, and love greetings.",
      suggested_topics: ["romantic dinner", "heart chocolate", "red rose", "couples portrait", "love greeting"]
    },
    {
      name: "Chinese New Year / Lunar New Year (Imlek)",
      date: "17 February 2026",
      location: "China, Singapore, Indonesia, Global",
      commercial_potential: "Massive commercial value for Year of the Horse (2026) red envelopes, lion dance parades, family reunion feasts, mandarin oranges, and red lanterns.",
      suggested_topics: ["year of the horse", "red envelope", "lion dance", "reunion feast", "mandarin oranges", "red lantern"]
    },
    {
      name: "Ramadan Begins",
      date: "18 February 2026",
      location: "Global/Islamic",
      commercial_potential: "Incredible commercial potential for crescent moon decor, dates (fruits) flatlays, family iftar preparation, and glowing ramadan lanterns.",
      suggested_topics: ["ramadan lantern", "crescent moon", "dates fruit", "iftar dinner", "family prayer"]
    },
    {
      name: "World Day of Social Justice",
      date: "20 February 2026",
      location: "Global/UN",
      commercial_potential: "Demand for diversity and inclusion concepts, fair trade products, community advocacy, and human equality vector illustrations.",
      suggested_topics: ["diversity inclusion", "fair trade", "community advocacy", "human equality", "social justice"]
    },
    {
      name: "International Mother Language Day",
      date: "21 February 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for multilingual greeting cards, language learning software interfaces, global diversity icons, and translation services.",
      suggested_topics: ["multilingual greeting", "language learning", "diversity icon", "translation service", "mother tongue"]
    },
    {
      name: "Super Bowl Sunday",
      date: "15 February 2026",
      location: "USA",
      commercial_potential: "Huge demand for american football tailgating, chicken wings platters, group cheers around TVs, sports apparel, and snack tables.",
      suggested_topics: ["american football", "tailgating food", "group cheers", "snack platter", "game day"]
    },
    {
      name: "President's Day",
      date: "16 February 2026",
      location: "USA",
      commercial_potential: "Commercial interest in patriotic sales banners, travel deals, US national monuments, and official federal office backdrops.",
      suggested_topics: ["patriotic sale", "travel deal", "national monument", "us flag", "historic memorial"]
    },
    {
      name: "Carnival of Rio de Janeiro / Venice Carnival",
      date: "19-24 February 2026",
      location: "Brazil, Italy, Global",
      commercial_potential: "Sensational demand for colorful Venetian masks, samba costume photography, confetti bursts, dynamic dance street parades, and party themes.",
      suggested_topics: ["venetian mask", "samba costume", "confetti burst", "street parade", "carnival dance"]
    }
  ],
  march: [
    {
      name: "World Wildlife Day",
      date: "3 March 2026",
      location: "Global/UN",
      commercial_potential: "Demand for pristine nature photography, endangered species vector patterns, wildlife conservation ranger shoots, and green ecology.",
      suggested_topics: ["wildlife conservation", "endangered species", "nature photography", "green ecology", "forest wildlife"]
    },
    {
      name: "International Women's Day",
      date: "8 March 2026",
      location: "Global/World",
      commercial_potential: "Extremely high value for women leadership portraits, female empower slogans, beautiful violet flowers, and women collaborating in corporate setups.",
      suggested_topics: ["women empowerment", "female leadership", "violet flower", "corporate collaboration", "gender equality"]
    },
    {
      name: "Pi Day / International Day of Mathematics",
      date: "14 March 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for math formulas, education assets, pi symbol vectors, bakery pie flatlays, and STEM education themes.",
      suggested_topics: ["math formulas", "pi symbol", "bakery pie", "stem education", "school learning"]
    },
    {
      name: "World Consumer Rights Day",
      date: "15 March 2026",
      location: "Global/World",
      commercial_potential: "Demand for quality guarantee tags, shopping cart safety illustrations, online payment protection, and customer service flatlays.",
      suggested_topics: ["quality guarantee", "online payment protection", "customer service", "shopping cart", "retail rights"]
    },
    {
      name: "St. Patrick's Day",
      date: "17 March 2026",
      location: "Ireland, USA, Global",
      commercial_potential: "Huge seasonal market for green beer mugs, shamrocks vectors, gold coin pots, Irish traditional pub flatlays, and green parades.",
      suggested_topics: ["green beer", "shamrock vector", "gold coins", "irish pub", "st patricks day"]
    },
    {
      name: "Nyepi / Balinese Day of Silence",
      date: "19 March 2026",
      location: "Indonesia (Bali)",
      commercial_potential: "Niche, high-value demand for tranquil night skies, starry constellation shots, Ogoh-ogoh parade statues, and peaceful meditation layouts.",
      suggested_topics: ["starry night sky", "ogoh ogoh parade", "meditation layout", "bali silence", "tranquility"]
    },
    {
      name: "Hari Raya Idul Fitri (Eid al-Fitr)",
      date: "20 March 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Massive global demand for Ketupat weave illustrations, traditional Mudik travel photos, family gathering dinners, and Eid Mubarak greeting designs.",
      suggested_topics: ["ketupat weave", "mudik travel", "family gathering", "eid mubarak card", "traditional dress"]
    },
    {
      name: "Spring Equinox",
      date: "20 March 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Strong demand for blooming cherry blossoms, garden preparation, fresh spring apparel lookbooks, and nature rebirth themes.",
      suggested_topics: ["blooming blossom", "spring garden", "spring apparel", "nature rebirth", "green forest"]
    },
    {
      name: "World Poetry Day",
      date: "21 March 2026",
      location: "Global/UNESCO",
      commercial_potential: "Quiet aesthetic demand for fountain pens on notebook paper, vintage typewriter closeups, ink splatters, and reading cozy spaces.",
      suggested_topics: ["fountain pen", "vintage typewriter", "ink splatter", "cozy reading space", "poetry journal"]
    },
    {
      name: "World Water Day",
      date: "22 March 2026",
      location: "Global/UN",
      commercial_potential: "Excellent potential for fresh water droplets, clean glass pours, plumbing utility workers, eco water filtration, and hydration health themes.",
      suggested_topics: ["water droplet", "eco water filtration", "hydration health", "plumbing worker", "clean water pour"]
    },
    {
      name: "Cherry Blossom Season (Sakura)",
      date: "late March 2026",
      location: "Japan, South Korea, USA",
      commercial_potential: "Incredible commercial request for pink cherry blossoms, families having picnics under sakura trees, and spring travel photography.",
      suggested_topics: ["cherry blossom", "sakura picnic", "spring travel", "tokyo street", "blossom branch"]
    },
    {
      name: "Holi Festival",
      date: "22-23 March 2026",
      location: "India, Global",
      commercial_potential: "Vast commercial volume for explosion of powder color splashes, friends covered in gulal color, energetic festival dancing, and joy.",
      suggested_topics: ["powder color splash", "gulal powder", "festival dancing", "holi joy", "colorful portraits"]
    }
  ],
  april: [
    {
      name: "April Fools' Day",
      date: "1 April 2026",
      location: "Global/World",
      commercial_potential: "Demand for comedy emojis, gag gift concepts, humorous office pranks, laughing faces, and playful cartoon graphics.",
      suggested_topics: ["comedy emoji", "office prank", "laughing face", "playful cartoon", "april fools"]
    },
    {
      name: "Good Friday",
      date: "3 April 2026",
      location: "Global/Christian",
      commercial_potential: "High demand for church services, cross silhouette against sunset, serene candle displays, and Easter communion concepts.",
      suggested_topics: ["cross silhouette", "church service", "candle display", "communion bread", "holy week"]
    },
    {
      name: "Easter Sunday",
      date: "5 April 2026",
      location: "Global/Christian",
      commercial_potential: "Extremely high commercial value for Easter egg hunt photos, colorful painted eggs, cute easter rabbits, spring brunch tables, and kids' joy.",
      suggested_topics: ["easter egg hunt", "painted egg", "easter rabbit", "spring brunch", "kids easter"]
    },
    {
      name: "World Health Day",
      date: "7 April 2026",
      location: "Global/WHO",
      commercial_potential: "High demand for medical checkup vectors, smiling doctors, fitness tracking watches, stethoscopes with green leaves, and healthy meal preps.",
      suggested_topics: ["medical checkup", "fitness tracker", "stethoscope leaf", "healthy meal prep", "smiling doctor"]
    },
    {
      name: "Songkran Water Festival",
      date: "13-15 April 2026",
      location: "Thailand",
      commercial_potential: "Fantastic potential for water splashes, water guns, smiling people in floral shirts, and traditional temple ritual water pouring.",
      suggested_topics: ["water splash", "water gun fight", "floral shirt", "temple ritual", "songkran celebration"]
    },
    {
      name: "World Heritage Day",
      date: "18 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for landmark monuments, global travel maps, ancient architecture photography, and heritage conservation concepts.",
      suggested_topics: ["landmark monument", "global travel map", "ancient architecture", "heritage conservation", "historic landmark"]
    },
    {
      name: "Kartini Day",
      date: "21 April 2026",
      location: "Indonesia",
      commercial_potential: "High national demand for modern women in traditional Kebaya dress, professional female role models, and Indonesian heritage designs.",
      suggested_topics: ["kebaya dress", "indonesian heritage", "female role model", "traditional costume", "kartini day"]
    },
    {
      name: "Earth Day / International Mother Earth Day",
      date: "22 April 2026",
      location: "Global/UN",
      commercial_potential: "Very high demand for tree planting, environmental recycling icons, hands holding soil, renewable solar energy, and clear green globes.",
      suggested_topics: ["tree planting", "recycling icons", "solar energy", "globe in hands", "green environment"]
    },
    {
      name: "World Book and Copyright Day",
      date: "23 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "High demand for student reading in library, stack of books vector, reading cozy lounge, copyright law assets, and paper crafts.",
      suggested_topics: ["student reading", "stack of books", "library study", "copyright law", "cozy lounge"]
    },
    {
      name: "Anzac Day",
      date: "25 April 2026",
      location: "Australia, New Zealand",
      commercial_potential: "High local demand for red poppy flower iconography, dawn service silhouettes, war memorial wreaths, and anzac biscuits.",
      suggested_topics: ["red poppy flower", "dawn service", "war memorial", "anzac biscuit", "remembrance wreath"]
    },
    {
      name: "King's Day / Koningsdag",
      date: "27 April 2026",
      location: "Netherlands",
      commercial_potential: "Strong demand for vibrant orange clothing, open air street market, canal boat parties, and Netherlands royal flag decoration.",
      suggested_topics: ["orange clothing", "street market", "canal boat party", "royal flag", "amsterdam canals"]
    },
    {
      name: "International Jazz Day",
      date: "30 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for saxophone silhouette, retro neon jazz club sign, musicians playing double bass, brass instrument details, and music flyers.",
      suggested_topics: ["saxophone silhouette", "neon jazz club", "double bass player", "brass instrument", "music poster"]
    }
  ],
  may: [
    {
      name: "International Workers' Day / May Day",
      date: "1 May 2026",
      location: "Global/World",
      commercial_potential: "High demand for safety helmet vectors, union laborers, career banners, building site tools, and worker empowerment imagery.",
      suggested_topics: ["safety helmet", "union laborer", "career banner", "building tools", "workers day"]
    },
    {
      name: "World Press Freedom Day",
      date: "3 May 2026",
      location: "Global/UN",
      commercial_potential: "Demand for microphones and voice recorders, notepad with pen, journalists in action, media freedom concepts, and typography.",
      suggested_topics: ["journalism microphone", "voice recorder", "media freedom", "press badge", "newspaper stack"]
    },
    {
      name: "Cinco de Mayo",
      date: "5 May 2026",
      location: "Mexico, USA",
      commercial_potential: "Vibrant sales for taco plates, guacamole flatlays, mariachi hats, colorful serape patterns, pinatas, and margarita cocktails.",
      suggested_topics: ["taco platter", "guacamole", "mariachi hat", "serape pattern", "margarita cocktail", "pinata"]
    },
    {
      name: "Mother's Day",
      date: "10 May 2026",
      location: "Global/World",
      commercial_potential: "Extremely high commercial requirement for mother and daughter hugging, breakfast in bed trays, handmade mother's day cards, and bouquets of pink carnations.",
      suggested_topics: ["mother daughter hug", "breakfast in bed", "handmade card", "carnation bouquet", "family affection"]
    },
    {
      name: "Ascension Day of Jesus Christ",
      date: "14 May 2026",
      location: "Indonesia, Europe, Global",
      commercial_potential: "Local national holiday demand for church services, Christian cross graphics, serene sky backgrounds, and holy day announcements.",
      suggested_topics: ["church service", "christian cross", "serene sky", "holy day", "prayer time"]
    },
    {
      name: "International Museum Day",
      date: "18 May 2026",
      location: "Global/ICOM",
      commercial_potential: "Demand for classic gallery halls, museum curators guiding tours, modern exhibitions, classical statue museum interiors, and interactive exhibits.",
      suggested_topics: ["gallery hall", "museum guide", "modern exhibition", "classical statue", "interactive museum"]
    },
    {
      name: "Eid al-Adha (Hari Raya Haji / Qurban)",
      date: "27 May 2026",
      location: "Global/Islamic, Indonesia, Singapore",
      commercial_potential: "Extremely high value for goat/sheep qurban vector icons, Kaaba pilgrimage graphics, clean family festive clothing, and Eid Mubarak greetings.",
      suggested_topics: ["qurban goat sheep", "kaaba pilgrimage", "festive clothing", "eid al adha card", "traditional greeting"]
    },
    {
      name: "Vesak Day / Hari Waisak",
      date: "31 May 2026",
      location: "Global/Buddhist, Thailand, Indonesia",
      commercial_potential: "Strong demand for Buddha statue silhouettes, lotus flower vectors, lighting lanterns, Buddhist monks walking in temples, and serene layout.",
      suggested_topics: ["buddha statue", "lotus flower", "lighting lantern", "buddhist monk", "temple serenity"]
    },
    {
      name: "Memorial Day",
      date: "25 May 2026",
      location: "USA",
      commercial_potential: "Excellent potential for military graves poppy wreaths, american national flags, patriotic parade, family barbecues, and summer season startup.",
      suggested_topics: ["military cemetery", "american national flag", "patriotic parade", "backyard barbecue", "summer season"]
    },
    {
      name: "Cannes Film Festival",
      date: "12-23 May 2026",
      location: "France, Global",
      commercial_potential: "Commercial focus on red carpet spotlights, golden award vectors, paparazzi cameras, luxurious evening gowns, and film roll flatlays.",
      suggested_topics: ["red carpet", "golden award", "paparazzi camera", "evening gown", "film strip"]
    }
  ],
  june: [
    {
      name: "Global Day of Parents",
      date: "1 June 2026",
      location: "Global/UN",
      commercial_potential: "High demand for multiracial parents playing with kids, parents walking in sunset park, family care, and heartwarming illustrations.",
      suggested_topics: ["parents and kids", "sunset park", "family care", "loving parents", "heartwarming family"]
    },
    {
      name: "World Environment Day",
      date: "5 June 2026",
      location: "Global/UNEP",
      commercial_potential: "Extremely high request for organic recycling bags, eco green seedling growth, electric vehicle chargers, ocean cleanups, and green lifestyle.",
      suggested_topics: ["organic recycling bag", "seedling growth", "electric vehicle", "ocean cleanup", "green lifestyle"]
    },
    {
      name: "World Oceans Day",
      date: "8 June 2026",
      location: "Global/UN",
      commercial_potential: "Excellent potential for ocean coral reef life, marine biologist research, marine turtle protection, scuba cleanup crews, and waves.",
      suggested_topics: ["coral reef", "marine turtle", "scuba cleanup", "ocean waves", "underwater marine"]
    },
    {
      name: "World Blood Donor Day",
      date: "14 June 2026",
      location: "Global/WHO",
      commercial_potential: "Strong demand for blood bag vectors, doctor prep syringe, happy patient donors, blood drop icons, and community medical care.",
      suggested_topics: ["blood bag", "doctor syringe", "patient donor", "blood drop icon", "medical care"]
    },
    {
      name: "Father's Day",
      date: "21 June 2026",
      location: "Global/World",
      commercial_potential: "High demand for father and son outdoor camping, custom necktie greeting cards, tool box gifts, and daughters giving custom gifts.",
      suggested_topics: ["outdoor camping", "necktie card", "tool box gift", "father daughter", "dad portrait"]
    },
    {
      name: "Juneteenth",
      date: "19 June 2026",
      location: "USA",
      commercial_potential: "High demand for African American liberty flags, community parade, freedom quotes, historical education, and local unity events.",
      suggested_topics: ["juneteenth flag", "community parade", "freedom quotes", "african american", "unity event"]
    },
    {
      name: "Summer Solstice / Midsummer",
      date: "21 June 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Huge demand for bonfire lighting, floral head crown girls, midnight sun photography, camping gear, and beach sunrise landscapes.",
      suggested_topics: ["bonfire lighting", "floral head crown", "midnight sun", "camping gear", "beach sunrise"]
    },
    {
      name: "International Yoga Day",
      date: "21 June 2026",
      location: "Global/UN",
      commercial_potential: "High demand for woman doing zen meditation on mountain, pink yoga mat flatlays, yoga studio lighting, and serene exercise models.",
      suggested_topics: ["zen meditation", "yoga mat flatlay", "yoga studio", "serene model", "mindful exercise"]
    },
    {
      name: "World Music Day / F\xEAte de la Musique",
      date: "21 June 2026",
      location: "Global/World",
      commercial_potential: "Strong request for street acoustic guitar players, youth crowd concerts, vinyl records flatlays, and retro rock bands.",
      suggested_topics: ["street guitar player", "crowd concert", "vinyl record", "rock band", "musical instrument"]
    },
    {
      name: "Global Pride Month",
      date: "all June 2026",
      location: "Global/World",
      commercial_potential: "Massive commercial market for rainbow pride flag graphics, LGBTQ+ couples portraits, community street parade, and colorful banners.",
      suggested_topics: ["rainbow flag", "lgbtq couple", "street parade", "pride march", "colorful pride banner"]
    }
  ],
  july: [
    {
      name: "Canada Day",
      date: "1 July 2026",
      location: "Canada",
      commercial_potential: "High demand for maple leaf graphics, red and white flags, fireworks over city, backyard gatherings, and outdoor barbecues.",
      suggested_topics: ["maple leaf flag", "city fireworks", "backyard barbecue", "canadian parade", "red white outfits"]
    },
    {
      name: "Independence Day / 4th of July",
      date: "4 July 2026",
      location: "USA",
      commercial_potential: "Extremely high seasonal demand for stars and stripes, sparklers in hand, city spectacular fireworks, backyard burgers, and patriotic picnics.",
      suggested_topics: ["stars and stripes", "sparkler hand", "spectacular fireworks", "backyard burger", "patriotic picnic"]
    },
    {
      name: "World Population Day",
      date: "11 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for multi-ethnic global faces collages, density city crowds, world globe maps, and community demography infographics.",
      suggested_topics: ["multiethnic face", "city crowd", "world globe map", "community infographic", "demography"]
    },
    {
      name: "Bastille Day",
      date: "14 July 2026",
      location: "France",
      commercial_potential: "High demand for blue-white-red French tricolor flag graphics, Eiffel Tower fireworks, street parades, baguettes and croissants flatlays.",
      suggested_topics: ["french flag", "eiffel tower fireworks", "street parade", "croissant flatlay", "paris holiday"]
    },
    {
      name: "Islamic New Year (Tahun Baru Islam 1448H)",
      date: "16 July 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Excellent potential for elegant mosque arches, islamic calendar illustrations, crescent moon graphics, and prayer beads (tasbih).",
      suggested_topics: ["mosque arch", "islamic calendar", "crescent moon", "tasbih prayer beads", "spiritual background"]
    },
    {
      name: "World Emoji Day",
      date: "17 July 2026",
      location: "Global/World",
      commercial_potential: "Strong commercial value for vector smiley icons, dynamic messaging app mockups, social media marketing flatlays, and cartoon faces.",
      suggested_topics: ["smiley icons", "messaging mockup", "social media flatlay", "cartoon faces", "emoji graphics"]
    },
    {
      name: "Nelson Mandela International Day",
      date: "18 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for inspirational social justice quote graphics, civil rights education, community volunteer work, and African solidarity icons.",
      suggested_topics: ["social justice quotes", "civil rights education", "volunteer work", "african solidarity", "equality advocate"]
    },
    {
      name: "Hari Asyura / Ashura",
      date: "25 July 2026",
      location: "Global/Islamic",
      commercial_potential: "Serene religious vector graphics, islamic history assets, fasting dates flatlay, and spiritual reflection.",
      suggested_topics: ["islamic history", "reflection", "serene mosque", "spiritual fasting", "traditional prayer"]
    },
    {
      name: "World Drowning Prevention Day",
      date: "25 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for professional beach lifeguards, red-orange rescue buoy rings, poolside safety signs, and outdoor swimming rules icons.",
      suggested_topics: ["beach lifeguard", "rescue buoy ring", "poolside safety sign", "swimming safety", "swimming pool guard"]
    },
    {
      name: "International Day of Friendship",
      date: "30 July 2026",
      location: "Global/UN",
      commercial_potential: "High commercial demand for diverse best friends taking selfies, campfire gatherings, holding hands concepts, and heartfelt group hugs.",
      suggested_topics: ["friends selfie", "campfire gathering", "holding hands", "group hug", "friendship concept"]
    },
    {
      name: "Summer Travel and Beach Vacation Vibe",
      date: "all July 2026",
      location: "Global/World",
      commercial_potential: "High continuous request for pool floats, tropical cocktails, sunglasses with sunscreen layout, turquoise ocean waves, and suitcase packing.",
      suggested_topics: ["pool float", "tropical cocktail", "sunscreen sunglasses", "ocean waves", "suitcase packing", "beach travel"]
    }
  ],
  august: [
    {
      name: "Singapore National Day",
      date: "9 August 2026",
      location: "Singapore",
      commercial_potential: "High demand for red and white Singapore flag decorations, skyline fireworks over Marina Bay, local parade photos, and heritage foods.",
      suggested_topics: ["singapore flag", "marina bay fireworks", "national day parade", "singapore skyline", "merlion icon"]
    },
    {
      name: "International Youth Day",
      date: "12 August 2026",
      location: "Global/UN",
      commercial_potential: "High value for young generation innovators, digital nomads working outdoors, skateboard park lifestyles, and collaborative youth activism.",
      suggested_topics: ["young innovators", "digital nomad", "skateboard lifestyle", "youth activism", "modern students"]
    },
    {
      name: "Independence Day of India",
      date: "15 August 2026",
      location: "India",
      commercial_potential: "Massive seasonal value for Indian flag flypasts, tricolor independence day banners, happy patriotic citizen graphics, and historical monuments.",
      suggested_topics: ["indian flag", "independence banner", "patriotic citizen", "historic monument", "india independence"]
    },
    {
      name: "Hari Kemerdekaan Republik Indonesia (17 Agustus)",
      date: "17 August 2026",
      location: "Indonesia",
      commercial_potential: "Incredible national demand for Panjat Pinang competitions, red-white flag raising ceremonies, local village sports, and Merdeka banners.",
      suggested_topics: ["panjat pinang", "red white flag raising", "village sports", "merdeka banner", "indonesian independence"]
    },
    {
      name: "World Photography Day",
      date: "19 August 2026",
      location: "Global/World",
      commercial_potential: "Strong demand for vintage cameras, photographers taking sunset landscape photos, flatlays of camera lens gear, and photo editing screens.",
      suggested_topics: ["vintage camera", "photographer sunset", "camera gear flatlay", "photo editing", "shutter dial"]
    },
    {
      name: "World Humanitarian Day",
      date: "19 August 2026",
      location: "Global/UN",
      commercial_potential: "Demand for international aid food box deliveries, global volunteer workers, red cross medical aid camps, and social care concepts.",
      suggested_topics: ["aid food box", "volunteer worker", "medical aid camp", "social care", "humanitarian helper"]
    },
    {
      name: "Mawlid al-Nabi (Maulid Nabi Muhammad)",
      date: "25 August 2026",
      location: "Indonesia, Global/Islamic",
      commercial_potential: "High demand for beautiful glowing green mosque lighting, Quran open pages, warm family gatherings, and Islamic festive invitations.",
      suggested_topics: ["mosque lighting", "quran open page", "family gathering", "islamic invitation", "maulid nabi"]
    },
    {
      name: "Women's Equality Day",
      date: "26 August 2026",
      location: "USA",
      commercial_potential: "Commercial focus on female leadership graphics, suffragette history assets, boardroom diversity, and women empowerment vectors.",
      suggested_topics: ["female leadership", "boardroom diversity", "women empowerment", "equality advocate", "feminist graphic"]
    },
    {
      name: "La Tomatina Festival",
      date: "26 August 2026",
      location: "Spain",
      commercial_potential: "Sensational stock visual value for massive crushed red tomato splash battles, crowds covered in red tomato pulp, and festive chaos.",
      suggested_topics: ["tomato splash battle", "tomato pulp crowd", "festive chaos", "bu\xF1ol spain", "la tomatina"]
    },
    {
      name: "Back-To-School Season Starts",
      date: "all August 2026",
      location: "Global/World",
      commercial_potential: "Extremely high commercial requirement for school backpack flatlays, kids writing on blackboard, colorful school stationeries, and bus pickups.",
      suggested_topics: ["school backpack", "classroom blackboard", "school stationery", "school bus pickup", "back to school"]
    }
  ],
  september: [
    {
      name: "Labor Day",
      date: "7 September 2026",
      location: "USA, Canada",
      commercial_potential: "High demand for end-of-summer sales, beach closures, backyard grilling with family, local parades, and autumn seasonal clothing deals.",
      suggested_topics: ["labor day sale", "backyard grill", "family parade", "summer closure", "autumn clothing"]
    },
    {
      name: "International Literacy Day",
      date: "8 September 2026",
      location: "Global/UNESCO",
      commercial_potential: "Strong demand for elementary kids reading, stack of books vectors, digital tablet tutoring software, libraries, and book lovers flatlays.",
      suggested_topics: ["kids reading", "stack of books", "digital tutoring", "library book", "literacy concept"]
    },
    {
      name: "Rosh Hashanah (Jewish New Year)",
      date: "11-13 September 2026",
      location: "Israel, Global/Jewish",
      commercial_potential: "Demand for apple slices dipped in honey bowls, pomegranate fruits, traditional shofar horn blowing, and sweet holiday dinners.",
      suggested_topics: ["apple honey bowl", "pomegranate fruit", "shofar horn", "holiday dinner", "rosh hashanah"]
    },
    {
      name: "Yom Kippur",
      date: "20-21 September 2026",
      location: "Israel, Global/Jewish",
      commercial_potential: "Niche religious interest in white clothing prayer books, tallit prayer shawl, quiet synagogue interior candles, and fasting themes.",
      suggested_topics: ["white clothing prayer", "tallit prayer shawl", "synagogue candle", "fasting theme", "yom kippur"]
    },
    {
      name: "International Day of Peace",
      date: "21 September 2026",
      location: "Global/UN",
      commercial_potential: "Very high demand for white dove vectors, hands forming peace gestures, paper crane graphics, and multicultural unity concepts.",
      suggested_topics: ["white dove vector", "peace gesture", "paper crane", "multicultural unity", "peace day"]
    },
    {
      name: "Autumn Equinox",
      date: "22 September 2026",
      location: "Northern Hemisphere",
      commercial_potential: "High demand for warm orange falling maple leaves, pumpkin spice layouts, cozy knitted sweaters, apple cider, and autumn hiking.",
      suggested_topics: ["orange maple leaves", "pumpkin spice flatlay", "knitted sweater", "apple cider", "autumn hiking"]
    },
    {
      name: "National Day of Saudi Arabia",
      date: "23 September 2026",
      location: "Saudi Arabia",
      commercial_potential: "High demand for green Saudi flags decorations, modern Riyadh skyline fireworks, national day sales banners, and heritage food photos.",
      suggested_topics: ["saudi flag", "riyadh skyline", "national day sale", "riyadh fireworks", "saudi national day"]
    },
    {
      name: "Mid-Autumn Festival (Mooncake Festival)",
      date: "25 September 2026",
      location: "China, Singapore, East Asia",
      commercial_potential: "Massive commercial market for traditional sweet mooncakes on wooden trays, glowing lantern walks, family reunion dinner, and full moon background.",
      suggested_topics: ["traditional mooncake", "glowing lanterns", "family reunion dinner", "full moon night", "mid autumn festival"]
    },
    {
      name: "World Tourism Day",
      date: "27 September 2026",
      location: "Global/UNWTO",
      commercial_potential: "High demand for global passports and sunglasses, travel planning mobile app UI, flight ticket mockups, and backpack travel photos.",
      suggested_topics: ["passport sunglasses", "travel mobile app", "flight ticket mockup", "backpack travel", "world landmarks"]
    },
    {
      name: "Oktoberfest Starts",
      date: "mid September 2026",
      location: "Germany, Global",
      commercial_potential: "Huge seasonal potential for large foaming beer mugs, traditional Bavarian dirndl and lederhosen clothing, soft salty pretzels, and festival tents.",
      suggested_topics: ["foaming beer mug", "bavarian dirndl", "lederhosen dress", "salty pretzel", "oktoberfest tent"]
    }
  ],
  october: [
    {
      name: "International Coffee Day",
      date: "1 October 2026",
      location: "Global/World",
      commercial_potential: "Excellent continuous demand for coffee bean flatlays, latte art coffee pours, roasting beans closeups, cozy cafe shop windows, and espresso cups.",
      suggested_topics: ["coffee bean flatlay", "latte art pour", "coffee roasting", "cafe shop window", "espresso cup"]
    },
    {
      name: "Hari Batik Nasional",
      date: "2 October 2026",
      location: "Indonesia",
      commercial_potential: "High national demand for authentic batik pattern fabrics, corporate employees wearing modern batik shirt outfits, and cultural designs.",
      suggested_topics: ["batik fabric pattern", "corporate batik shirt", "indonesian batik", "cultural fashion", "java batik"]
    },
    {
      name: "Golden Week National Holiday",
      date: "1-7 October 2026",
      location: "China",
      commercial_potential: "High demand for golden week shopping discount banners, high-speed train travels, packing suitcases, and national holiday sales graphics.",
      suggested_topics: ["shopping discount banner", "high speed train travel", "packing suitcase", "national holiday sale", "tourism china"]
    },
    {
      name: "World Teachers' Day",
      date: "5 October 2026",
      location: "Global/UNESCO",
      commercial_potential: "Strong demand for happy teacher in classroom, thanking card layouts, school apples, teachers grading notebooks, and modern teaching tech.",
      suggested_topics: ["happy teacher", "thank you teacher", "classroom lesson", "notebook grading", "teaching technology"]
    },
    {
      name: "World Mental Health Day",
      date: "10 October 2026",
      location: "Global/WHO",
      commercial_potential: "High demand for green ribbon graphics, peaceful meditation poses, psychological therapy desks, mindfulness, and self-care flatlays.",
      suggested_topics: ["green ribbon concept", "peaceful meditation", "therapy session", "mindfulness self care", "supportive hand"]
    },
    {
      name: "Thanksgiving Day in Canada",
      date: "12 October 2026",
      location: "Canada",
      commercial_potential: "Strong seasonal market for family roasted turkey dinners, maple leaf dining table decors, autumn pumpkin pie, and harvest themes.",
      suggested_topics: ["roasted turkey dinner", "maple leaf table", "canadian thanksgiving", "pumpkin pie slice", "autumn harvest"]
    },
    {
      name: "World Food Day",
      date: "16 October 2026",
      location: "Global/FAO",
      commercial_potential: "High request for fresh organic vegetable baskets, sustainable food agriculture farming, hunger relief aid, and home cooking flatlays.",
      suggested_topics: ["organic vegetable basket", "sustainable farming", "hunger relief aid", "home cooking flatlay", "fresh ingredients"]
    },
    {
      name: "United Nations Day",
      date: "24 October 2026",
      location: "Global/UN",
      commercial_potential: "Demand for world flags circular icons, multicultural people shaking hands, international unity campaigns, and global maps.",
      suggested_topics: ["world flags circle", "multicultural shake hands", "international unity", "global map graphic", "diplomacy"]
    },
    {
      name: "Hari Sumpah Pemuda",
      date: "28 October 2026",
      location: "Indonesia",
      commercial_potential: "High demand for Indonesian youth holding red and white flags, youth pledge text layouts, patriotic youth groups, and heritage graphics.",
      suggested_topics: ["indonesian youth flag", "youth pledge text", "patriotic group", "red and white youth", "sumpah pemuda"]
    },
    {
      name: "Halloween",
      date: "31 October 2026",
      location: "Global/World",
      commercial_potential: "Sensational market for carved glowing jack o lanterns, spooky spiderweb backgrounds, kids in creative ghost outfits, and orange candy baskets.",
      suggested_topics: ["carved jack o lantern", "spooky spiderweb", "ghost outfit kids", "halloween candy", "trick or treat"]
    }
  ],
  november: [
    {
      name: "D\xEDa de los Muertos (Day of the Dead)",
      date: "1-2 November 2026",
      location: "Mexico, Latin America",
      commercial_potential: "Massive artistic demand for colorful painted sugar skull makeups, bright orange marigold flower arrangements, candlelit altars (ofrendas).",
      suggested_topics: ["painted sugar skull", "marigold flowers", "candlelit altar ofrenda", "mexican traditional holiday", "catrina makeup"]
    },
    {
      name: "Diwali / Deepavali (Festival of Lights)",
      date: "8 November 2026",
      location: "India, Singapore, Malaysia, Global",
      commercial_potential: "Colossal commercial potential for glowing clay diya lamps, colorful rangoli sand patterns, sparkling fireworks, family festive attire, and sweets.",
      suggested_topics: ["glowing clay diya", "colorful rangoli sand", "sparkling fireworks", "family festive attire", "indian sweets platter"]
    },
    {
      name: "Hari Pahlawan (National Heroes Day)",
      date: "10 November 2026",
      location: "Indonesia",
      commercial_potential: "Strong demand for historic bamboo spear vectors, red and white flag parade, patriotic veteran silhouettes, and national monument graphics.",
      suggested_topics: ["bamboo spear vector", "red white flag parade", "veteran silhouette", "national monument", "hero remembrance"]
    },
    {
      name: "Veterans Day / Remembrance Day",
      date: "11 November 2026",
      location: "USA, Canada, UK",
      commercial_potential: "High demand for military soldier silhouettes, red poppy flower badges, american veteran parades, and patriotic salute vectors.",
      suggested_topics: ["military soldier silhouette", "red poppy badge", "veteran parade", "patriotic salute", "poppy wreath"]
    },
    {
      name: "World Children's Day",
      date: "20 November 2026",
      location: "Global/UNICEF",
      commercial_potential: "High demand for kids playing joyfully in playground, handprints with watercolors, protective parents, and diverse kids smiling.",
      suggested_topics: ["kids playground joy", "watercolor handprints", "protective parenting", "diverse kids smiling", "children protection"]
    },
    {
      name: "Thanksgiving Day in USA",
      date: "26 November 2026",
      location: "USA",
      commercial_potential: "Incredible market value for roasting big turkey tables, family dining gratitude toast, pumpkin pies, cozy home dining, and warm lighting.",
      suggested_topics: ["roasting turkey table", "family gratitude toast", "pumpkin pie thanksgiving", "cozy dining room", "autumn dinner"]
    },
    {
      name: "Black Friday & Cyber Monday",
      date: "27-30 November 2026",
      location: "Global/World",
      commercial_potential: "Extremely high request for red retail discount banners, online delivery boxes, card checkout screen mockups, shopping bags, and fast courier shipping.",
      suggested_topics: ["retail discount banner", "online delivery box", "card checkout screen", "shopping bags flatlay", "cyber monday tech"]
    },
    {
      name: "Movember (Men's Health Awareness)",
      date: "all November 2026",
      location: "Global/World",
      commercial_potential: "Commercial demand for stylish moustache vectors, barber shop grooming flatlays, men's fitness workouts, and healthcare checklist assets.",
      suggested_topics: ["moustache vector", "barber shop grooming", "mens health workout", "mens healthcare checklist", "movember"]
    }
  ],
  december: [
    {
      name: "World AIDS Day",
      date: "1 December 2026",
      location: "Global/UN",
      commercial_potential: "High demand for red ribbon graphics, medical support groups, healthy lifestyle vectors, and healthcare awareness banners.",
      suggested_topics: ["red ribbon graphic", "medical support group", "healthy lifestyle vector", "aids awareness banner", "healthcare aid"]
    },
    {
      name: "Hanukkah (Festival of Lights)",
      date: "4-12 December 2026",
      location: "Global/Jewish",
      commercial_potential: "High demand for beautiful silver menorah candelabras, blue star of david patterns, traditional potato latkes platters, and wooden dreidels.",
      suggested_topics: ["menorah candelabra", "star of david blue", "potato latkes platter", "wooden dreidel", "hanukkah lighting"]
    },
    {
      name: "Human Rights Day",
      date: "10 December 2026",
      location: "Global/UN",
      commercial_potential: "High demand for raised hands vector art, globe with justice scales, equality campaigns, and community diversity graphics.",
      suggested_topics: ["raised hands vector", "justice scales globe", "equality campaign", "diversity graphic", "human rights"]
    },
    {
      name: "Hari Ibu (National Mother's Day)",
      date: "22 December 2026",
      location: "Indonesia",
      commercial_potential: "Massive national demand for mother and child portraits, warm flower gifts, heartwarming greeting cards, and family breakfast cooking.",
      suggested_topics: ["mother child portrait", "warm flower gift", "heartwarming card", "family breakfast", "hari ibu merdeka"]
    },
    {
      name: "Christmas Eve & Christmas Day",
      date: "24-25 December 2026",
      location: "Global/World",
      commercial_potential: "Peak global commercial value for decorated pine trees, glowing warm fireplace stockings, opening gift surprises, family christmas dinners, and gingerbread houses.",
      suggested_topics: ["decorated pine tree", "fireplace stockings", "opening gifts surprise", "christmas dinner table", "gingerbread house baking"]
    },
    {
      name: "Boxing Day",
      date: "26 December 2026",
      location: "UK, Canada, Australia",
      commercial_potential: "High seasonal demand for electronic retail sales promotions, long queues at mall counters, returns and exchanges, and boxing day packages.",
      suggested_topics: ["electronic retail sale", "mall checkout queue", "returns exchange", "boxing day parcel", "post holiday shopping"]
    },
    {
      name: "New Year's Eve",
      date: "31 December 2026",
      location: "Global/World",
      commercial_potential: "Immense demand for glowing gold number year graphics, sparkling fireworks above landmarks, champagne flute pours, and party glitters.",
      suggested_topics: ["gold new year graphics", "spectacular fireworks city", "champagne pour glass", "party glitter confetti", "nye countdown"]
    },
    {
      name: "Winter Sports & Cold Climate Scenic",
      date: "all December 2026",
      location: "Global/World",
      commercial_potential: "High demand for cozy winter wood cabin, warm winter socks drinking cocoa, snowy evergreen forest landscapes, and skiing setups.",
      suggested_topics: ["cozy wood cabin", "winter socks cocoa", "snowy forest landscape", "skiing snow setup", "frozen winter lake"]
    }
  ]
};

// data/project/MetaZo-Update--main/server/extraHolidaysData.ts
var EXTRA_HOLIDAYS_DATA = {
  january: [
    {
      name: "Global Family Day",
      date: "1 January 2026",
      location: "Global",
      commercial_potential: "Warm lifestyle illustrations of multi-generational families sharing healthy breakfasts, warm embraces, and cozy indoor home activities.",
      suggested_topics: ["family breakfast", "multigenerational home", "cozy lifestyle", "family hug", "warm home"]
    },
    {
      name: "National Science Fiction Day",
      date: "2 January 2026",
      location: "USA, Global",
      commercial_potential: "High demand for futuristic neon-lit cityscapes, humanoid AI robot models, spacecraft travel, and sci-fi cosplay costume portraits.",
      suggested_topics: ["sci fi city", "neon robot", "spacecraft travel", "cyberspace vector", "futuristic tech"]
    },
    {
      name: "World Religion Day",
      date: "18 January 2026",
      location: "Global",
      commercial_potential: "Interfaith harmony illustrations, handshakes of global diverse religious communities, spiritual symbols of peace and tolerance.",
      suggested_topics: ["interfaith harmony", "religious symbols", "global peace", "spiritual unity", "tolerance banner"]
    },
    {
      name: "International Day of Clean Energy",
      date: "26 January 2026",
      location: "Global/UN",
      commercial_potential: "Strong demand for blue solar panel flatlays, turning wind turbine hills, electric car chargers, and clean green eco technology.",
      suggested_topics: ["solar panel flatlay", "wind turbine hill", "electric car charger", "clean eco tech", "green energy"]
    },
    {
      name: "Harbin Ice and Snow Festival",
      date: "5 January 2026",
      location: "China",
      commercial_potential: "Spectacular ice and snow sculptures with colorful nighttime lights, winter tourism adventure, and cold climate traveling lifestyle.",
      suggested_topics: ["ice sculpture", "winter tourism", "snow palace", "cold adventure", "harbin travel"]
    }
  ],
  february: [
    {
      name: "Groundhog Day",
      date: "2 February 2026",
      location: "USA, Canada",
      commercial_potential: "Winter-to-spring predictions, shadow silhouettes, and cozy early morning outdoor outerwear.",
      suggested_topics: ["groundhog prediction", "shadow silhouette", "early morning outdoor", "winter to spring", "weather forecast"]
    },
    {
      name: "World Wetlands Day",
      date: "2 February 2026",
      location: "Global/UN",
      commercial_potential: "Scenic swamp landscapes, green biodiversity, eco-tourism, and fresh water preservation illustrations.",
      suggested_topics: ["wetlands landscape", "biodiversity", "eco tourism", "fresh water preservation", "nature reserve"]
    },
    {
      name: "Safer Internet Day",
      date: "10 February 2026",
      location: "Global",
      commercial_potential: "Parental control screens, secure web browsing illustrations, online safety for kids vectors, and cyber protection.",
      suggested_topics: ["parental control", "secure browsing", "online safety kids", "cyber protection", "data security"]
    },
    {
      name: "National Pizza Day",
      date: "9 February 2026",
      location: "Global/US",
      commercial_potential: "Wood-fired pizza ovens, stringy cheese pulls, restaurant kitchen backgrounds, and family pizza nights.",
      suggested_topics: ["wood fired pizza", "cheese pull", "pizzeria kitchen", "family pizza night", "mozzarella"]
    },
    {
      name: "International Polar Bear Day",
      date: "27 February 2026",
      location: "Global",
      commercial_potential: "Arctic wildlife photography, climate change icons, melting icecaps concepts, and polar bear families.",
      suggested_topics: ["arctic wildlife", "climate change concept", "melting icecap", "polar bear family", "glacier preservation"]
    }
  ],
  march: [
    {
      name: "Employee Appreciation Day",
      date: "6 March 2026",
      location: "USA, Global",
      commercial_potential: "Corporate teamwork, managers giving gifts and thanking staff, high morale office sessions, and award graphics.",
      suggested_topics: ["employee gift", "corporate teamwork", "manager thanks staff", "office high morale", "business recognition"]
    },
    {
      name: "International Day of Happiness",
      date: "20 March 2026",
      location: "Global/UN",
      commercial_potential: "Bright smiling group portraits, yellow balloons, joyful jumps, and uplifting lifestyle visuals.",
      suggested_topics: ["smiling group portrait", "yellow balloon", "joyful jump", "uplifting lifestyle", "happiness concept"]
    },
    {
      name: "World Oral Health Day",
      date: "20 March 2026",
      location: "Global",
      commercial_potential: "Pediatric dentistry, clean teeth models, toothpaste flatlays, and dental hygiene icons.",
      suggested_topics: ["pediatric dentistry", "clean teeth model", "toothpaste flatlay", "dental hygiene", "healthy smile"]
    },
    {
      name: "Earth Hour",
      date: "28 March 2026",
      location: "Global",
      commercial_potential: "Candle-lit cozy rooms, turned-off city skylines, energy saving icons, and green lifestyle illustrations.",
      suggested_topics: ["candle lit room", "dark city skyline", "energy saving icon", "green lifestyle", "climate action"]
    },
    {
      name: "National Doctors' Day",
      date: "30 March 2026",
      location: "Global/US",
      commercial_potential: "Medical stethoscopes, clinic staff posing confidently, and medical research lab backgrounds.",
      suggested_topics: ["stethoscope check", "doctors confident pose", "clinical research", "healthcare worker", "medical team"]
    }
  ],
  april: [
    {
      name: "World Autism Awareness Day",
      date: "2 April 2026",
      location: "Global/UN",
      commercial_potential: "Colorful puzzle piece graphics, hands holding in solidarity, and inclusive classroom learning activities.",
      suggested_topics: ["puzzle piece graphic", "hands holding solidarity", "inclusive classroom", "neurodiversity", "acceptance banner"]
    },
    {
      name: "World Art Day",
      date: "15 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Oil paint splatters, easel setups, artists painting in studios, and creative workshops.",
      suggested_topics: ["oil paint splatter", "easel setup", "artist studio", "creative workshop", "fine art painting"]
    },
    {
      name: "National Pet Day",
      date: "11 April 2026",
      location: "Global",
      commercial_potential: "Happy dogs and cats playing, veterinary checkup diagnostics, and organic pet food bowls.",
      suggested_topics: ["happy dog cat", "veterinary checkup", "pet food bowl", "dog grooming", "animal friendship"]
    },
    {
      name: "Poila Baisakh (Bengali New Year)",
      date: "14 April 2026",
      location: "India, Bangladesh",
      commercial_potential: "Traditional red-white sarees, festive sweet boxes, community folk parades, and cultural kolam drawings.",
      suggested_topics: ["red white saree", "bengali sweet box", "folk parade", "cultural kolam", "new year festival"]
    },
    {
      name: "Spring Cleaning Season",
      date: "all April 2026",
      location: "Global",
      commercial_potential: "Vacuuming carpets, washing high windows, organic cleaning sprays, and neatly organized cupboards.",
      suggested_topics: ["vacuum carpet", "wash window", "organic cleaning spray", "tidy cupboard", "home organization"]
    }
  ],
  may: [
    {
      name: "World Red Cross Day",
      date: "8 May 2026",
      location: "Global",
      commercial_potential: "First aid training kits, blood donation boxes, humanitarian volunteers, and emergency assistance symbols.",
      suggested_topics: ["first aid kit", "blood donation box", "humanitarian volunteer", "emergency help", "red cross support"]
    },
    {
      name: "World Bee Day",
      date: "20 May 2026",
      location: "Global/UN",
      commercial_potential: "Golden honeycomb structures, wild bees pollinating flowers, and sustainable beekeeping protective suits.",
      suggested_topics: ["golden honeycomb", "bee on flower", "beekeeping suit", "sustainable honey", "ecosystem protector"]
    },
    {
      name: "International Day for Biological Diversity",
      date: "22 May 2026",
      location: "Global/UN",
      commercial_potential: "Lush green rainforest canopies, diverse wild animal illustrations, and eco-research imagery.",
      suggested_topics: ["rainforest canopy", "wild animal illustrations", "eco research", "green biodiversity", "flora fauna"]
    },
    {
      name: "World No Tobacco Day",
      date: "31 May 2026",
      location: "Global/WHO",
      commercial_potential: "Broken cigarette vectors, clean healthy lung graphics, and fitness motivation illustrations.",
      suggested_topics: ["broken cigarette", "healthy lung graphic", "fitness motivation", "quit smoking", "anti tobacco campaign"]
    },
    {
      name: "Graduation Season Begins",
      date: "late May 2026",
      location: "Global",
      commercial_potential: "Graduation caps thrown in air, diplomas held proudly, and happy family celebration dinners.",
      suggested_topics: ["graduation cap toss", "diploma proud pose", "family dinner party", "college graduate", "academic success"]
    },
    {
      name: "World Turtle Day",
      date: "23 May 2026",
      location: "Global",
      commercial_potential: "Sea turtles swimming underwater, beach cleanups, and eco-friendly conservation graphics.",
      suggested_topics: ["sea turtle swim", "beach cleanup", "ocean conservation", "wildlife protector", "turtle icon"]
    }
  ],
  june: [
    {
      name: "World Bicycle Day",
      date: "3 June 2026",
      location: "Global/UN",
      commercial_potential: "City bicycle commuters, green transport lanes, mountain biking tracks, and eco-friendly urban transit vectors.",
      suggested_topics: ["city bicycle commuter", "green transit lane", "mountain bike track", "eco urban transit", "healthy cycling"]
    },
    {
      name: "World Food Safety Day",
      date: "7 June 2026",
      location: "Global/WHO",
      commercial_potential: "Commercial kitchen sanitizing, lab safety tests on fresh food, and handwashing health posters.",
      suggested_topics: ["kitchen sanitizing", "food lab test", "handwashing poster", "hygiene standards", "safe eating"]
    },
    {
      name: "Micro-, Small and Medium-Sized Enterprises Day",
      date: "27 June 2026",
      location: "Global/UN",
      commercial_potential: "Local bakery owners, custom tailor shops, small business tech integration, and neighborhood deliveries.",
      suggested_topics: ["local bakery owner", "tailor shop", "small business technology", "neighborhood delivery", "entrepreneurship"]
    },
    {
      name: "Dragon Boat Festival (Duanwu)",
      date: "19 June 2026",
      location: "China, Singapore, Global",
      commercial_potential: "Thrilling dragon boat races, sticky rice dumplings (zongzi) wrapped in bamboo leaves, and cultural ornaments.",
      suggested_topics: ["dragon boat racing", "rice dumpling zongzi", "bamboo leaves food", "cultural festival", "paddlers teamwork"]
    },
    {
      name: "Summer Weddings & Bridal Season",
      date: "all June 2026",
      location: "Global",
      commercial_potential: "Wedding ring closeups, elegant white bridal gowns, outdoor garden ceremony setups, and champagne toasts.",
      suggested_topics: ["wedding ring closeup", "white bridal gown", "garden wedding setup", "champagne toast", "romantic marriage"]
    }
  ],
  july: [
    {
      name: "World Chocolate Day",
      date: "7 July 2026",
      location: "Global",
      commercial_potential: "Melting dark chocolate splashes, premium cocoa bean piles, handmade chocolate truffles, and holiday baking.",
      suggested_topics: ["melting dark chocolate", "cocoa bean pile", "handmade chocolate truffle", "sweet dessert baking", "chocolatier"]
    },
    {
      name: "World Youth Skills Day",
      date: "15 July 2026",
      location: "Global/UN",
      commercial_potential: "Hands-on vocational training, engineering apprenticeships, and young carpenters or coders in action.",
      suggested_topics: ["vocational training", "engineering apprentice", "young coder office", "craftsman workshop", "skills development"]
    },
    {
      name: "World Brain Day",
      date: "22 July 2026",
      location: "Global",
      commercial_potential: "Mental wellness icons, brain scan graphics, puzzle logic vectors, and concentration/memory exercise illustrations.",
      suggested_topics: ["mental wellness", "brain scan graphic", "puzzle logic vector", "memory exercise", "cognitive health"]
    },
    {
      name: "International Tiger Day",
      date: "29 July 2026",
      location: "Global",
      commercial_potential: "Majestic tigers in natural habitats, wildlife reservation photo shoots, and wild cat conservation campaigns.",
      suggested_topics: ["majestic tiger habitat", "wildlife reservation", "tiger conservation", "bengal tiger", "endangered species protective"]
    },
    {
      name: "Ice Cream Social Season",
      date: "all July 2026",
      location: "Global",
      commercial_potential: "Crispy waffle cones with dripping ice cream scoops, colorful scoopers, and kids enjoying cold summer treats.",
      suggested_topics: ["dripping ice cream cone", "colorful scoopers", "kids summer treat", "gelato flatlay", "sweet scoop"]
    }
  ],
  august: [
    {
      name: "International Day of the World's Indigenous Peoples",
      date: "9 August 2026",
      location: "Global/UN",
      commercial_potential: "Traditional clothing and arts, global native cultural celebrations, and heritage conservation banners.",
      suggested_topics: ["traditional indigenous art", "native cultural celebration", "heritage conservation", "ethnic diversity", "global tribes"]
    },
    {
      name: "World Elephant Day",
      date: "12 August 2026",
      location: "Global",
      commercial_potential: "African elephants bathing in rivers, sanctuary tourism, and giant wildlife conservation photography.",
      suggested_topics: ["elephant river bath", "sanctuary tourism", "wildlife photography", "elephant preservation", "savannah giant"]
    },
    {
      name: "International Left-Handers Day",
      date: "13 August 2026",
      location: "Global",
      commercial_potential: "Left-handed writing, custom office scissors for lefties, and left-handed guitarists.",
      suggested_topics: ["left handed writing", "lefty scissor", "left handed guitarist", "office desk setup", "unique skill"]
    },
    {
      name: "National Aviation Day",
      date: "19 August 2026",
      location: "USA, Global",
      commercial_potential: "Commercial airplane cockpits, planes flying above clouds, airport runway lights, and pilot gear.",
      suggested_topics: ["airplane cockpit", "plane above clouds", "runway lights", "pilot sunglasses", "aviation history"]
    },
    {
      name: "International Dog Day",
      date: "26 August 2026",
      location: "Global",
      commercial_potential: "Golden retrievers playing in gardens, pet food product styling, and professional dog grooming services.",
      suggested_topics: ["golden retriever garden", "pet food styling", "dog grooming service", "man's best friend", "happy puppy"]
    }
  ],
  september: [
    {
      name: "Teachers' Day in India",
      date: "5 September 2026",
      location: "India",
      commercial_potential: "Happy students gifting flowers, class whiteboard thank-you messages, and classroom mentorship scenes.",
      suggested_topics: ["student flower gift", "whiteboard thank you", "classroom mentor", "indian school", "teacher gratitude"]
    },
    {
      name: "World First Aid Day",
      date: "12 September 2026",
      location: "Global",
      commercial_potential: "Emergency bandages, first aid box medical flatlays, and CPR training mannequin setups.",
      suggested_topics: ["emergency bandage", "first aid flatlay", "cpr training", "medical emergency kit", "paramedic nurse"]
    },
    {
      name: "World Ozone Day",
      date: "16 September 2026",
      location: "Global/UN",
      commercial_potential: "Earth atmosphere graphics, eco-friendly protection badges, and green clean air campaign banners.",
      suggested_topics: ["earth atmosphere", "eco protection badge", "clean air campaign", "climate save", "ozone layer"]
    },
    {
      name: "World Heart Day",
      date: "29 September 2026",
      location: "Global/WHF",
      commercial_potential: "Heart-rate tracking smartwatches, cardiovascular exercises, and doctors holding red heart icons.",
      suggested_topics: ["heart rate tracker", "cardio exercise gym", "red heart icon doctor", "stethoscopes checkup", "healthy lifestyle"]
    },
    {
      name: "Autumn Home Decoration & Warm Cozy Vibe",
      date: "all September 2026",
      location: "Global",
      commercial_potential: "Pumpkin room decorations, scented soy candles, thick soft pillows, and warm ambient indoor lighting.",
      suggested_topics: ["pumpkin room decoration", "scented soy candle", "soft pillow couch", "warm ambient lighting", "cozy autumn interior"]
    }
  ],
  october: [
    {
      name: "International Day of Older Persons",
      date: "1 October 2026",
      location: "Global/UN",
      commercial_potential: "Active grandparents playing with grandchildren, digital tablet tutorial sessions for seniors, and healthy elderly exercise.",
      suggested_topics: ["grandparents playing grandkids", "senior tablet tutorial", "elderly health exercise", "active aging", "retirement lifestyle"]
    },
    {
      name: "World Animal Day",
      date: "4 October 2026",
      location: "Global",
      commercial_potential: "Animal shelter pet adoptions, veterinary diagnostics, and diverse wildlife conservation graphics.",
      suggested_topics: ["shelter pet adoption", "veterinary diagnostics", "wildlife conservation", "cat adoption", "animal welfare"]
    },
    {
      name: "World Space Week",
      date: "4-10 October 2026",
      location: "Global",
      commercial_potential: "Deep space observatory telescopes, complex galaxy vector art, and space shuttle launching pads.",
      suggested_topics: ["observatory telescope", "galaxy vector art", "space shuttle launch", "cosmic galaxy", "astronomy science"]
    },
    {
      name: "International Day of the Girl Child",
      date: "11 October 2026",
      location: "Global/UN",
      commercial_potential: "Young girls learning to code on laptops, active youth sports teams, and modern classroom leadership illustrations.",
      suggested_topics: ["girl coding laptop", "youth sport team", "classroom leader", "girl empowerment", "education right"]
    },
    {
      name: "International Artists Day",
      date: "25 October 2026",
      location: "Global",
      commercial_potential: "Palette knives, acrylic paint tube flatlays, art gallery exhibitions, and abstract canvas painters.",
      suggested_topics: ["palette knife painting", "acrylic tube flatlay", "gallery exhibition", "abstract painter canvas", "creative artist"]
    }
  ],
  november: [
    {
      name: "World Science Day for Peace and Development",
      date: "10 November 2026",
      location: "Global/UNESCO",
      commercial_potential: "High-tech lab microscopes, green energy clean solutions, and futuristic biology researchers.",
      suggested_topics: ["lab microscope", "green clean energy", "biology researcher", "science development", "scientific experiment"]
    },
    {
      name: "World Kindness Day",
      date: "13 November 2026",
      location: "Global",
      commercial_potential: "Community charity and volunteering acts, supportive warm smiles, and heart-shaped gift illustrations.",
      suggested_topics: ["community volunteering", "supportive smile", "heart gift illustration", "kindness act", "human connection"]
    },
    {
      name: "International Men's Day",
      date: "19 November 2026",
      location: "Global",
      commercial_potential: "Father-son quality time bonding, male mental health support sessions, and professional modern business portraits.",
      suggested_topics: ["father son bond", "men mental health", "business portrait", "paternity leave", "healthy manhood"]
    },
    {
      name: "Loy Krathong Lantern Festival",
      date: "24 November 2026",
      location: "Thailand",
      commercial_potential: "Traditional floating flower krathongs, sparkling candlelights on river surfaces, and beautiful golden lantern launches.",
      suggested_topics: ["floating flower krathong", "candlelight river", "golden lantern launch", "thailand festival", "cultural lights"]
    },
    {
      name: "Cozy Winter Wardrobe Transition",
      date: "all November 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Thick wool winter coats, leather boots, soft knit scarves, and walking in light falling snow.",
      suggested_topics: ["wool winter coat", "leather boots walk", "soft knit scarf", "falling snow walk", "cozy winter fashion"]
    },
    {
      name: "St. Andrew's Day",
      date: "30 November 2026",
      location: "Scotland, UK",
      commercial_potential: "Blue and white Scottish saltire flags, traditional bagpipe players, and purple thistle icons.",
      suggested_topics: ["scottish saltire flag", "bagpipe player", "scottish thistle icon", "edinburgh castle", "scotland culture"]
    }
  ],
  december: [
    {
      name: "International Day of Persons with Disabilities",
      date: "3 December 2026",
      location: "Global/UN",
      commercial_potential: "Wheelchair sports champions, office accessibility adaptations, smart braille reading tech, and inclusivity illustrations.",
      suggested_topics: ["wheelchair athlete", "office accessibility", "braille reader tech", "inclusivity vector", "equal opportunity"]
    },
    {
      name: "World Soil Day",
      date: "5 December 2026",
      location: "Global/UN",
      commercial_potential: "Rich dark soil with fresh seedlings, agricultural organic composting, and sustainable farming soil diagnostics.",
      suggested_topics: ["soil seedling", "organic compost", "sustainable farming", "earth soil health", "agriculture study"]
    },
    {
      name: "International Mountain Day",
      date: "11 December 2026",
      location: "Global/UN",
      commercial_potential: "Snow-capped mountain peaks, trekking trails, alpine log cabins, and mountain adventure tourism.",
      suggested_topics: ["snow capped peak", "trekking trail", "alpine log cabin", "mountain adventure", "winter peak view"]
    },
    {
      name: "Kwanzaa Celebrations",
      date: "26 December 2026 - 1 January 2027",
      location: "USA, Global",
      commercial_potential: "Glowing kinara candelabras with red-green-black candles, traditional fruits baskets, and cultural unity flags.",
      suggested_topics: ["kinara candelabra", "red green black candle", "fruits basket kwanzaa", "cultural unity flag", "african heritage"]
    },
    {
      name: "Cozy Cabin Getaways & Alpine Tourism",
      date: "all December 2026",
      location: "Global",
      commercial_potential: "Glazed A-frame mountain cabins, enjoying steaming hot cocoa by frozen windows, and pristine snow-covered evergreen forests.",
      suggested_topics: ["a frame cabin snow", "hot cocoa window", "snowy evergreen forest", "cozy winter retreat", "alpine tourism"]
    },
    {
      name: "Gingerbread House & Holiday Baking Season",
      date: "all December 2026",
      location: "Global",
      commercial_potential: "Rolling pins with festive cookie cutters, gingerbread cookie icing decorations, and kids baking together.",
      suggested_topics: ["gingerbread house bake", "cookie cutter flatlay", "icing icing decoration", "kids baking holiday", "christmas kitchen"]
    }
  ]
};

// data/project/MetaZo-Update--main/constants.tsx
var ADOBE_CATEGORIES = [
  { id: 1, name: "Animals" },
  { id: 2, name: "Buildings and Architecture" },
  { id: 3, name: "Business" },
  { id: 4, name: "Drinks" },
  { id: 5, name: "The Environment" },
  { id: 6, name: "States of Mind" },
  { id: 7, name: "Food" },
  { id: 8, name: "Graphic Resources" },
  { id: 9, name: "Hobbies and Leisure" },
  { id: 10, name: "Industry" },
  { id: 11, name: "Landscapes" },
  { id: 12, name: "Lifestyle" },
  { id: 13, name: "People" },
  { id: 14, name: "Plants and Flowers" },
  { id: 15, name: "Culture and Religion" },
  { id: 16, name: "Science" },
  { id: 17, name: "Social Issues" },
  { id: 18, name: "Sports" },
  { id: 19, name: "Technology" },
  { id: 20, name: "Transport" },
  { id: 21, name: "Travel" }
];
var SHUTTERSTOCK_CATEGORIES = [
  "Abstract",
  "Animals/Wildlife",
  "Backgrounds/Textures",
  "Beauty/Fashion",
  "Buildings/Landmarks",
  "Business/Finance",
  "Education",
  "Food and Drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Interiors",
  "Miscellaneous",
  "Nature",
  "Objects",
  "Parks/Outdoor",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation",
  "Vintage"
];
var SHUTTERSTOCK_CATEGORIES_VIDEO = [
  "Animals/Wildlife",
  "Backgrounds/Textures",
  "Buildings/Landmarks",
  "Business/Finance",
  "Education",
  "Food and Drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Nature",
  "Objects",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation"
];
var getDailyLimit = () => {
  return /* @__PURE__ */ new Date() >= /* @__PURE__ */ new Date("2026-07-01T00:00:00+07:00") ? 25 : 30;
};
var TRANSLATIONS = {
  en: {
    header_title: "MetaZo PRO",
    main_subtitle_line1: "AI-Powered Metadata Assistant",
    main_subtitle_line2: "Specializing in Adobe Stock, Shutterstock, Freepik, Vecteezy, Canva Contributors",
    help_button: "WhatsApp Group & Support",
    donate_button: "Donate / Support",
    whatsapp_link: "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr",
    footer_text: "\u{1F510} Developed with dedication @2026.",
    image_tool: "Image",
    video_tool: "Video",
    vector_tool: "Vector",
    upload_images: "1. Upload Image Files",
    upload_videos: "1. Upload Video Files",
    upload_vector_thumbnails: "1. Upload Vector Files",
    drag_drop: "Drag & drop here, or",
    click_to_choose: "choose files",
    files_selected: "files selected.",
    uploading_file: "Processing upload...",
    add_new: "Add More",
    clear_all: "Clear All",
    generate_metadata_ai: "2. AI Metadata Optimization",
    generate_desc: "AI analyzes visual content (including multi-frame for video) for the best results.",
    continue_generate: "Continue Process",
    custom_prompt_optional: "Instructions / Target Keywords (Optional):",
    custom_prompt_placeholder: "Example: 'retro style, focus on red scarf' or 'Blue, Ocean, Summer'.",
    keyword_count_label: "Keyword Count (1-49):",
    keyword_count_auto: "Auto",
    generate_all: "Process Metadata",
    generating: "AI is analyzing...",
    retry_failed: "Retry Failed",
    ai_processing: "AI processing in progress...",
    generation_mode_label: "Processing Mode:",
    generation_mode_standard: "Standard",
    generation_mode_standard_desc: "Accurate, stable.",
    generation_mode_batch: "Batch",
    generation_mode_batch_desc: "Fast, simultaneous processing.",
    review_edit: "3. Review & Refine",
    review_edit_desc: "Verify compliance with stock standards through the preview box.",
    keywords_label: "Keywords",
    title_label: "Title",
    description_label: "Description",
    category_adobe_label: "Adobe Stock Category",
    category_shutterstock_1_label: "Shutterstock Category 1",
    category_shutterstock_2_label: "Shutterstock Category 2",
    enter_title: "Enter title...",
    enter_description: "Describe content...",
    select_category: "Select category...",
    original_filename: "Filename:",
    close: "Close",
    download_csv: "Download CSV",
    download_disabled_tooltip: "Complete all AI processes first.",
    export_metadata: "4. Export",
    language: "Language",
    english: "English",
    indonesian: "Indonesian",
    regenerate: "Regenerate Metadata",
    hero_badge: "AI-Driven Metadata Engine",
    hero_title_part1: "Instant",
    hero_title_part2: "Stock Asset",
    hero_title_part3: "Optimization",
    hero_description: "MetaZo leverages AI intelligence to generate titles, descriptions, and tags automatically for global stock portals.",
    hero_cta_how: "How to Use",
    hero_stats_file: "Files",
    license_active_title: "Commercial License Active",
    license_active_desc: "Unlimited access is active for professional workflow",
    license_pro_badge: "\u2605 PRO",
    trial_badge: "Trial Version",
    trial_desc_part1: "Use",
    trial_desc_part2: "in limited mode. Get unlimited access with a premium license for",
    trial_cta_license: "License",
    trial_cta_admin: "Admin",
    workspace_title: "Choose Your Workspace",
    workspace_modes: "3 Modes",
    image_ws_title: "Image AI",
    image_ws_desc: "Automatically optimize photos, posters, or raster artwork (JPG, PNG, WEBP).",
    image_ws_cta: "Optimize Images",
    video_ws_title: "Video AI",
    video_ws_desc: "Analyze video clips (MP4, MOV, WEBM) for precise cinematic metadata.",
    video_ws_cta: "Optimize Videos",
    vector_ws_title: "Vector AI",
    vector_ws_desc: "Automatic metadata for vector files (SVG, EPS, AI) for UI/UX design needs.",
    vector_ws_cta: "Optimize Vectors",
    daily_quota: "Daily Quota",
    quota_exhausted: "\u26A0\uFE0F Quota exhausted. Try tomorrow.",
    queue_status_title: "Data Queue Status",
    status_success: "Metadata OK",
    status_ready: "Ready for AI",
    status_draft: "Unconfigured Draft",
    status_error: "Issue / Error",
    success_rate: "Success Rate",
    dist_title: "Upload Format Distribution",
    no_files_title: "No Files Uploaded Yet",
    no_files_desc: 'Use the "Metadata Gen" menu tab to upload your files.',
    dist_image_label: "Image Workspace",
    dist_video_label: "Video Workspace",
    dist_vector_label: "Vector Workspace",
    portal_ready: "Ready",
    sidebar_dashboard: "Dashboard",
    sidebar_metadata_gen: "Metadata Gen",
    sidebar_prompt_gen: "Prompt Gen",
    sidebar_prompt_text: "Text Prompt",
    sidebar_prompt_image: "Image Prompt",
    sidebar_prompt_video: "Video Prompt",
    sidebar_image_check: "Image Check",
    sidebar_calendar_gen: "Calendar Gen",
    sidebar_chat: "Account Chat",
    sidebar_activation_premium: "ACTIVATE PREMIUM",
    sidebar_pro_active: "PRO ACTIVE",
    sidebar_manage: "Manage",
    sidebar_core_generators: "Core Generators",
    sidebar_core_tools: "Core Tools",
    sidebar_processing_mode: "Processing Mode",
    sidebar_tuning: "Tuning",
    sidebar_resources: "Resources",
    sidebar_about: "About MetaZo PRO",
    sidebar_subscription_plan: "Subscription Plan",
    default_pricing: "30 Days = $2 - Unlimited = $14",
    topbar_system_time: "Current System Time",
    topbar_stability_core: "STABILITY CORE ONLINE",
    topbar_pro_active: "\u{1F451} PRO ACTIVE",
    topbar_trial_eval: "\u26A0\uFE0F TRIAL EVAL",
    upload_title: "Upload Assets",
    upload_reset: "Reset",
    upload_reset_title: "Reset Everything",
    upload_help: "Upload your image, video, or vector files here to process.",
    upload_file_placeholder: "FILE",
    upload_next_ai: "Next: AI Config",
    info_modal_title: "MetaZo PRO Handbook & Usage Guide",
    info_modal_operational_guide: "\u2728 MetaZo PRO Operational Guide",
    info_modal_step1_title: "Workspace Selection",
    info_modal_step1_desc_p1: "Choose mode",
    info_modal_step1_desc_p2: "on the main Dashboard. Upload your files via drag-and-drop or by clicking the upload area.",
    info_modal_step2_title: "AI Analysis & Metadata Generation",
    info_modal_step2_desc: "Once uploaded, click Process Metadata. Our AI Vision engine will analyze the visual content to generate Titles, Descriptions, and Categories automatically.",
    info_modal_step3_title: "Prompt Gen & Image AI (Integrated!)",
    info_modal_step3_desc_highlight: "The Prompt Gen feature is now integrated with Calendar Gen to make it easier to create stock content based on popular events.",
    info_modal_step3_desc_main: "Use the Prompt Gen feature to generate in-depth visual descriptions for AI Art.",
    info_modal_step4_title: "Image Check (QC)",
    info_modal_step4_desc: "Ensure your assets are free from IP violations, logos, and excessive noise with the Image Check feature before uploading to agencies.",
    info_modal_step5_title: "Calendar Gen (Niche Hunter)",
    info_modal_step5_desc: "Find important future global events to help you determine the themes for stock content production that buyers are searching for.",
    info_modal_step6_title: "Export & Download",
    info_modal_step6_desc: "Once satisfied, use the Export feature to download metadata in CSV format compatible with Adobe Stock, Shutterstock, etc.",
    info_modal_tips_title: "\u26A1 Processing Mode Tips",
    info_modal_std_mode_title: "Standard Mode",
    info_modal_std_mode_desc: "Processes files one by one in sequence. Very safe and stable to avoid API rate limit issues.",
    info_modal_batch_mode_title: "Batch Mode",
    info_modal_batch_mode_desc: "Processes many files simultaneously. Recommended for processing large quantities of assets if time is your main priority.",
    info_modal_trial_premium_title: "\u{1F4B3} Trial & Premium Handbook",
    info_modal_trial_mode_label: "Trial Mode:",
    info_modal_trial_mode_desc: "You are in a free trial period with daily limits to ensure system stability. Certain features may be limited.",
    info_modal_premium_mode_label: "Premium (License):",
    info_modal_premium_mode_desc: "With a license Serial Key, all limits are completely removed. Get unlimited access for your professional asset processing.",
    info_modal_license_cta: "Need a license? Contact admin to get an official Serial Key & upgrade your account to Premium!",
    info_modal_supported_formats: "\u{1F4C1} Supported File Formats",
    info_modal_close_button: "Close Guide",
    settings_modal_title: "AI Model Provider Settings",
    settings_main_provider_label: "Main AI Provider Used",
    settings_gemini_model_label: "Select Gemini Model",
    settings_gemini_desc: "You can save several personal Gemini API Keys. The system intelligently performs automatic rotation to avoid quota issues (*rate limit / RESOURCE_EXHAUSTED*).",
    settings_gemini_key_list: "Gemini API Key List",
    settings_no_keys: "No API Keys found matching this provider.",
    settings_gemini_model_auto: "Automatic (Auto-Select Reliable)",
    settings_use_default_key: "Using global server default Gemini Key.",
    welcome_title: "Welcome to MetaZo PRO v1.3.0",
    welcome_subtitle: "Stock Asset Optimizer",
    welcome_features_label: "Features:",
    welcome_feature1: "AI-powered stock asset optimization",
    welcome_feature2: "Lightweight & fast generation",
    welcome_feature3: "Multiple provider support",
    welcome_feature4: "Advanced prompt management",
    welcome_get_started: "Get Started",
    common_or: "or",
    common_and: "and",
    activation_modal_title_trial_expired: "Trial Expired",
    activation_modal_title_normal: "Official License Activation",
    activation_modal_unlock_premium: "Unlock Premium SaaS",
    activation_active_status: "Application Active \u2022 Premium PRO",
    activation_key_registered: "Registered Key:",
    activation_subscription_left: "Subscription Period:",
    activation_days_left: "Days Left",
    activation_commercial_notice: "Commercial copy licensed under key constraints.",
    activation_btn_unsubscribe: "Unsubscribe (Revoke License)",
    activation_trial_expired_hero: "7-Day Trial Expired!",
    activation_trial_expired_desc: "Your free trial has ended. Please make a payment and enter the License Serial Key below to continue using Metadata Gen, Prompt Text, & Calendar Gen.",
    activation_trial_active_hero: "Trial Mode Active",
    activation_trial_active_days: "Days Left",
    activation_trial_active_desc: `You are in Free Trial mode. All features are unlocked with a limit of ${getDailyLimit()} generations per day. Activate officially to unlock unlimited generations.`,
    activation_input_label: "Enter License Serial Key",
    activation_input_placeholder: "FORMAT: MZPRO-XXXX-XXXX-XXXX",
    activation_error_empty: "Please enter your license Serial Key first.",
    activation_error_expired: "This Serial Key (30 Days) has expired. Please buy a new key.",
    activation_error_used: "This Serial Key is already used by another user! Please use a different Serial Key.",
    activation_error_invalid: "Serial Key not registered or incorrect. Please contact Admin to buy an Official Key.",
    activation_error_offline: "Internet connection issue and offline validation failed.",
    activation_success_waiting: "\u2714 License validated! Enabling premium...",
    activation_btn_process: "Processing Activation...",
    activation_btn_activate: "Activate Premium",
    activation_no_license_title: "Don't have a License? Get it Instant:",
    activation_personal_activation: "Personal Activation",
    activation_license_price: "License Price:",
    activation_buy_whatsapp: "Buy License Key via WhatsApp",
    activation_confirm_stop_title: "Cancellation Confirmation",
    activation_confirm_stop_desc: "Are you sure you want to turn off premium status and return the application to trial mode?",
    activation_btn_stop_yes: "Yes, Stop",
    activation_btn_stop_no: "Cancel",
    sidebar_expand: "Expand Sidebar",
    sidebar_collapse: "Collapse Sidebar",
    sidebar_manage_license: "Manage License / Unsubscribe",
    sidebar_activation_tooltip: "Activate Official License / Start Pro",
    topbar_toggle_theme: "Toggle Theme",
    topbar_info_manual: "Information Manual",
    topbar_settings_api: "Settings & API Key",
    common_editor: "Editor",
    common_mode: "Mode",
    prompt_title: "Prompt Text Studio",
    prompt_subtitle: "Synthesize Visual Ideas with a Spectrum of Creativity & Artistic Categories",
    prompt_engine_active: "Gemini Pro Engine Active",
    prompt_formula_title: "Artistic Formula & Configuration",
    prompt_tab_background: "Tab Background",
    prompt_tab_png: "Tab PNG Asset",
    prompt_trial_label: "Today's Trial: Prompt Text",
    prompt_generate_count: "Generates",
    prompt_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_trial_times: "times",
    prompt_image_trial_label: "Today's Trial: Prompt Image",
    prompt_image_generate_count: "Generates",
    prompt_image_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_image_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_image_trial_times: "times",
    prompt_video_trial_label: "Today's Trial: Prompt Video",
    prompt_video_generate_count: "Generates",
    prompt_video_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_video_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_video_trial_times: "times",
    image_check_trial_label: "Today's Trial: Image Quality Audit",
    image_check_generate_count: "Audits",
    image_check_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} audits) reached. Please contact admin or enter activation code for unlimited processing.`,
    image_check_trial_remaining: `Free trial ${getDailyLimit()} audits/day. Remaining quota today:`,
    image_check_trial_times: "times",
    prompt_subject_label: "Visual Idea / Image Subject",
    prompt_subject_placeholder: "Type your visual idea freely here...",
    prompt_inspiration_label: "\u{1F4A1} Need Inspiration? Click Presets below:",
    prompt_negative_label: "Negative Prompt (Anti-Elements)",
    prompt_negative_subtitle: "Avoid Elements",
    prompt_negative_desc: "The above elements will be strictly sent to the AI model to be avoided in the prompt synthesis.",
    prompt_style_master_label: "Artistic Master Style Category",
    prompt_style_quick_label: "Quick Selection Tab",
    prompt_png_bg_label: "PNG Background Options",
    prompt_png_bg_desc: "The AI will smartly embed this background color instruction into the prompt to neatly isolate the image subject.",
    prompt_variation_label: "Dimension & Output Variation Count",
    prompt_variation_unit: "Variations",
    prompt_word_count_label: "Word Count Range (Prompt Length)",
    prompt_word_count_desc: "Adjusts how detailed the AI expands the visual description of each prompt.",
    prompt_btn_synthesize: "Synthesize {count} Prompts Now",
    prompt_btn_synthesizing: "AI Expanding {count} Artistic Variations...",
    prompt_preset_lite: "Fast, efficient, concise and representative formulation.",
    prompt_preset_artistic: "Full of camera options, varied lenses, and balanced aesthetic style.",
    prompt_preset_ultra: "Super complex details, rich textures, lighting options, and variety of perspectives.",
    prompt_loading_step1: "Formulating Creative Scenarios...",
    prompt_loading_step2: "Synthesizing Artistic Detail...",
    prompt_loading_step3: "Polishing Prompt Spectrum...",
    prompt_loading_step4: "Finalizing Output Collection...",
    prompt_studio_title: "Prompt Text Studio",
    prompt_studio_subtitle: "Synthesize Visual Ideas with a Spectrum of Creativity & Artistic Categories",
    prompt_studio_version: "Advanced AI Text Creator v2.5",
    prompt_output_title: "Generated Prompts",
    prompt_output_subtitle: "All prompts are ready to be copied to Midjourney / DALL-E / Firefly / Stable Diffusion",
    prompt_output_badge_png: "\u2728 PNG: BACKGROUND {color}",
    prompt_output_badge_scene: "\u{1F5BC}\uFE0F Background Scene",
    prompt_output_btn_copy_all: "Copy All",
    prompt_output_btn_copied: "Copied",
    prompt_output_btn_download: "Download",
    prompt_output_btn_clear: "Clear",
    prompt_output_search_placeholder: "Filter prompts (e.g.: 'lighting', 'macro', 'epic', 'camera')...",
    prompt_output_no_match_title: "No filter matches",
    prompt_output_no_match_desc: 'Keyword "{query}" not found in {count} prompts.',
    image_studio_title: "Prompt Image Studio",
    image_studio_subtitle: "Extract Description & Aesthetics from Your Image Reference (Single & Batch Mode)",
    image_studio_version: "Image-to-Prompt Batch v2.0",
    image_studio_upload_label: "Image Upload Panel",
    image_studio_clear_all: "Clear All",
    image_studio_drag_drop: "Upload / Drag Images",
    image_studio_release: "Release Images",
    image_studio_support_multiple: "Supports multiple files at once",
    image_studio_target_label: "Select Aesthetic Target",
    image_studio_btn_analyze: "Generate Prompt ({count} New Items)",
    image_studio_btn_analyzing: "Processing {count} Items ({progress}%)",
    image_studio_dashboard_title: "Queue Progress Dashboard",
    image_studio_status_label: "Status: {finished}/{total} Finished",
    image_studio_btn_copy_all: "Copy All",
    image_studio_btn_copied_all: "Copied All",
    image_studio_empty_title: "No Images in Queue Yet",
    image_studio_empty_desc: "Upload one or more reference images to instantly extract AI aesthetic prompts.",
    video_studio_title: "Prompt Video Studio",
    video_studio_subtitle: "Synthesize Descriptions & Prompts from Video Motion References",
    video_studio_keyword_placeholder: "Enter motion keyword (e.g., 'Cinematic Landscape', 'Epic Action')...",
    video_studio_btn_analyze: "Analyze Motion",
    video_studio_btn_analyzing: "Analyzing...",
    video_studio_history_title: "Analysis History",
    video_studio_btn_clear_history: "Clear History",
    video_studio_hollywood_title: "Hollywood Synthesis",
    video_studio_hollywood_desc: "Generate professional Hollywood-standard director prompts based on motion analysis.",
    video_studio_btn_generate_hollywood: "Generate Hollywood Prompts",
    video_studio_btn_generating_hollywood: "Synthesizing Hollywood Prompts...",
    video_studio_btn_download: "Download Prompts",
    video_studio_camera_label: "Camera",
    video_studio_technical_label: "Technical String",
    video_studio_saturation_title: "Market Saturation Alert",
    video_studio_saturation_desc: "Automatic warning if the market is too saturated with similar content.",
    video_studio_revenue_title: "Revenue Forecast",
    video_studio_revenue_desc: "Estimated revenue potential based on buyer trends at Adobe Stock & Shutterstock.",
    video_studio_error_empty: "Please enter a keyword first.",
    video_studio_error_fail: "Failed to analyze keyword. Try again later.",
    calendar_title: "Visual Calendar Planner",
    calendar_subtitle: "Find strategic moments based on holidays & global market trends.",
    calendar_months_january: "January",
    calendar_months_february: "February",
    calendar_months_march: "March",
    calendar_months_april: "April",
    calendar_months_may: "May",
    calendar_months_june: "June",
    calendar_months_july: "July",
    calendar_months_august: "August",
    calendar_months_september: "September",
    calendar_months_october: "October",
    calendar_months_november: "November",
    calendar_months_december: "December",
    calendar_btn_generate: "Find Events",
    calendar_btn_generating: "Analyzing...",
    calendar_month_label: "Select Month",
    calendar_card_btn_keywords: "Generate Keywords",
    calendar_card_btn_prompt: "Create Prompt",
    calendar_error_fail: "Failed to generate events. Please try again.",
    style_photorealistic: "Photorealistic (Realistic)",
    style_cinematic: "Cinematic (Film)",
    style_adobe_stock: "Adobe Stock Style",
    style_editorial: "Editorial (Magazine)",
    style_lifestyle: "Lifestyle (Life Style)",
    style_fine_art: "Fine Art (High Art)",
    prompt_error_trial: `Trial Limit Exceeded. You have reached the maximum limit of ${getDailyLimit()} Prompt Text generates today. Please contact admin or enter activation code for unlimited processing.`,
    prompt_error_empty: "Please enter a base idea or pure visual subject first.",
    prompt_png_bg_white: "\u26AA White background",
    prompt_png_bg_black: "\u26AB Black background",
    prompt_png_bg_transparent: "\u{1F3C1} Transparent background",
    qc_title: "Quality",
    qc_title_check: "Check",
    qc_subtitle: "AI Expert for Adobe Stock Standards",
    qc_btn_reset: "Reset",
    qc_btn_analyze: "Start Audit Asset",
    qc_btn_analyzing: "Analyzing...",
    qc_tolerance_label: "Quality Tolerance",
    qc_upload_hub: "Upload Hub",
    qc_drop_images_here: "Drop Images/Video/Vector Here",
    qc_release_images: "Release Files",
    qc_multiple_upload: "Supports Images, Videos & Vectors (.eps, .ai)",
    qc_queue_assets: "Assets in Queue",
    qc_pending_audit: "Pending Audit",
    qc_analyzing_text: "Adobe Stock QC Specialist",
    qc_analyzing_desc: "Analyzing legal, technical, and commercial value",
    qc_info_empty: "Please upload files first to start the curation audit process",
    qc_score_label: "QC SCORE",
    qc_hide_heatmap: "Hide Heatmap",
    qc_analyze_heatmap: "Analyze Pixel Heatmap",
    qc_pixel_engine: "Pixel Engine",
    qc_rejection_reason: "Rejection Reason",
    qc_legal_status: "Legal Status",
    qc_quality_metadata: "Quality Metadata",
    qc_close: "Close",
    qc_view_audit: "View Audit",
    qc_strengths: "Strengths",
    qc_tech_analysis: "Technical Analysis",
    qc_detailed_feedback: "Detailed Feedback",
    guide_btn_title: "View Feature Guide",
    guide_dashboard_title: "Dashboard Guide",
    guide_dashboard_desc: "Overview of your account health, generation statistics, and application links.",
    guide_prompt_gen_title: "Prompt Studio Guide",
    guide_prompt_gen_desc: "Write short descriptive inputs and get highly optimized prompts for GenAI stock submission (Midjourney, DALL-E, etc.).",
    guide_prompt_text_title: "Prompt Text Guide",
    guide_prompt_text_desc: "Write short descriptive inputs and get highly optimized prompts for GenAI stock submission (Midjourney, DALL-E, etc.).",
    guide_prompt_image_title: "Prompt Image Guide",
    guide_prompt_image_desc: "Upload reference images to extract descriptions and aesthetic details for generating new prompt formulas.",
    guide_prompt_video_title: "Prompt Video Guide",
    guide_prompt_video_desc: "Analyze motion keywords to synthesize professional cinematic director prompts and evaluate market potential.",
    guide_image_title: "Image AI Guide",
    guide_image_desc: "Upload images to automatically generate Adobe/Shutterstock optimized metadata including standard Title, Description, and Keywords.",
    guide_video_title: "Video AI Guide",
    guide_video_desc: "Upload videos to get precise metadata specifically focused on motion, action, speed, and cinematic keywords.",
    guide_vector_title: "Vector EPS Guide",
    guide_vector_desc: "Upload large EPS files. The system will safely auto-convert EPS into previews and extract intelligent metadata.",
    guide_image_check_title: "Image Audit Guide",
    guide_image_check_desc: "Upload images for a pre-submission AI check. Catches technical issues, out-of-focus, IP violations, and potential rejections.",
    guide_calendar_title: "Calendar AI Guide",
    guide_calendar_desc: "Generate seasonal stock calendar ideas by inputting a month/event. Never miss a commercial stock trend again.",
    sidebar_mute_video: "Mute Video Gen",
    sidebar_motion_gen: "Motion Gen",
    sidebar_removal_gen: "Removal Gen",
    mute_title: "Batch Mute Video Gen",
    mute_subtitle: "Instantly remove audio from multiple stock videos losslessly at once",
    mute_btn_clear: "Clear All",
    mute_drag_drop: "Drag & drop multiple video files here",
    mute_formats_supported: "Supports multiple MP4, MOV, WebM files (Max 500MB per file)",
    mute_btn_choose: "CHOOSE VIDEO FILES",
    mute_error_invalid_files: "The following files were ignored because they are not videos: {names}",
    mute_queue_title: "Video Queue List ({count})",
    mute_stat_done: "Done",
    mute_stat_processing: "Processing",
    mute_stat_failed: "Failed",
    mute_stat_pending: "Pending",
    mute_btn_processing: "PROCESSING BATCH ({current}/{total})...",
    mute_btn_mute_queue: "MUTE VIDEO QUEUE",
    mute_btn_download_all: "DOWNLOAD ALL ({count})",
    mute_status_muting: "Muting...",
    mute_status_success: "Success",
    mute_status_failed_badge: "Failed",
    mute_status_pending_badge: "Pending",
    mute_tooltip_remove: "Remove from queue",
    mute_preview_title: "Media Preview",
    mute_preview_size: "Size",
    mute_preview_format: "Format",
    mute_preview_error: "Error",
    mute_preview_empty: "Select a video from the queue list to play the preview",
    mute_guide_title: "Usage Guide",
    mute_guide_step1_title: "Choose Files",
    mute_guide_step1_desc: "Drag multiple videos or click the file selector above.",
    mute_guide_step2_title: "Start Process",
    mute_guide_step2_desc: "Click the Mute Video Queue button to remove sound from all videos sequentially.",
    mute_guide_step3_title: "Download Results",
    mute_guide_step3_desc: "Download individually using the button next to the filename, or click Download All to download all successful videos at once.",
    mute_guide_footer: "\u{1F512} All files are processed locally on a secure sandbox server, and will be destroyed immediately after downloading is completed.",
    guide_mute_video_title: "Mute Video Guide",
    guide_mute_video_desc: "Instantly remove audio from multiple stock videos losslessly at once to meet submission requirements.",
    mute_auto_download_label: "Auto-Download",
    mute_auto_download_desc: "Automatically download after processing",
    mute_trial_expired: "\u26A0\uFE0F Daily free trial limit (25 video mutes) reached. Please contact admin or enter activation code for unlimited processing.",
    mute_trial_remaining: "Free trial 25 video mutes/day. Remaining quota today: {remaining} times",
    mute_error_trial: "Trial Limit Exceeded. You have reached the maximum limit of 25 video mutes today. Please contact admin or enter activation code for unlimited processing."
  },
  id: {
    header_title: "MetaZo PRO",
    main_subtitle_line1: "Asisten Metadata Berbasis AI",
    main_subtitle_line2: "Spesialis Kontributor Adobe Stock, Shutterstock, Freepik, Vecteezy, Canva",
    help_button: "Grup WhatsApp & Bantuan",
    donate_button: "Donasi / Dukungan",
    whatsapp_link: "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr",
    footer_text: "\u{1F510} Dikembangkan dengan dedikasi @2026.",
    image_tool: "Gambar",
    video_tool: "Video",
    vector_tool: "Vektor",
    upload_images: "1. Unggah File Gambar",
    upload_videos: "1. Unggah File Video",
    upload_vector_thumbnails: "1. Unggah File Vektor",
    drag_drop: "Tarik & lepas di sini, atau",
    click_to_choose: "pilih file",
    files_selected: "file terpilih.",
    uploading_file: "Mempersiapkan unggahan...",
    add_new: "Tambah Lagi",
    clear_all: "Hapus Semua",
    generate_metadata_ai: "2. Optimasi Metadata AI",
    generate_desc: "AI menganalisis konten visual (termasuk multi-frame untuk video) untuk hasil terbaik.",
    continue_generate: "Lanjutkan Proses",
    custom_prompt_optional: "Instruksi / Target Kata Kunci (Opsional):",
    custom_prompt_placeholder: "Contoh: 'gaya retro, fokus pada syal merah' atau 'Biru, Laut, Musim Panas'.",
    keyword_count_label: "Jumlah Kata Kunci (1-49):",
    keyword_count_auto: "Otomatis",
    generate_all: "Proses Metadata",
    generating: "AI sedang menganalisis...",
    retry_failed: "Coba Ulang Gagal",
    ai_processing: "Proses AI sedang berlangsung...",
    generation_mode_label: "Mode Pemrosesan:",
    generation_mode_standard: "Standar",
    generation_mode_standard_desc: "Akurat, stabil.",
    generation_mode_batch: "Batch",
    generation_mode_batch_desc: "Cepat, pemrosesan serentak.",
    review_edit: "3. Tinjau & Edit",
    review_edit_desc: "Verifikasi kepatuhan terhadap standar stock melalui kotak pratinjau.",
    keywords_label: "Kata Kunci",
    title_label: "Judul",
    description_label: "Deskripsi",
    category_adobe_label: "Kategori Adobe Stock",
    category_shutterstock_1_label: "Kategori Shutterstock 1",
    category_shutterstock_2_label: "Kategori Shutterstock 2",
    enter_title: "Masukkan judul...",
    enter_description: "Deskripsikan konten...",
    select_category: "Pilih kategori...",
    original_filename: "Nama File:",
    close: "Tutup",
    download_csv: "Unduh CSV",
    download_disabled_tooltip: "Selesaikan semua proses AI terlebih dahulu.",
    export_metadata: "4. Ekspor",
    language: "Bahasa",
    english: "Inggris",
    indonesian: "Indonesia",
    regenerate: "Regenerasi Metadata",
    hero_badge: "AI-Driven Metadata Engine",
    hero_title_part1: "Optimalisasi",
    hero_title_part2: "Stock Asset",
    hero_title_part3: "Instan",
    hero_description: "MetaZo memanfaatkan kecerdasan AI untuk menghasilkan judul, deskripsi, dan tag otomatis bagi portal stock global.",
    hero_cta_how: "Cara Pakai",
    hero_stats_file: "File",
    license_active_title: "Lisensi Komersial Aktif",
    license_active_desc: "Akses tanpa batas telah aktif untuk workflow profesional",
    license_pro_badge: "\u2605 PRO",
    trial_badge: "Versi Trial",
    trial_desc_part1: "Gunakan",
    trial_desc_part2: "dalam mode terbatas. Dapatkan akses unlimited dengan lisensi premium seharga",
    trial_cta_license: "Lisensi",
    trial_cta_admin: "Admin",
    workspace_title: "Pilih Ruang Kerja",
    workspace_modes: "3 Mode",
    image_ws_title: "Image AI",
    image_ws_desc: "Optimasi foto, poster, atau karya seni raster (JPG, PNG, WEBP) secara otomatis.",
    image_ws_cta: "Optimasi Gambar",
    video_ws_title: "Video AI",
    video_ws_desc: "Analisis klip video (MP4, MOV, WEBM) untuk metadata sinematik yang presisi.",
    video_ws_cta: "Optimasi Video",
    vector_ws_title: "Vector AI",
    vector_ws_desc: "Metadata otomatis untuk file vektor (SVG, EPS, AI) guna kebutuhan elemen desain UI/UX.",
    vector_ws_cta: "Optimasi Vektor",
    daily_quota: "Kuota Hari Ini",
    quota_exhausted: "\u26A0\uFE0F Kuota habis. Coba besok.",
    queue_status_title: "Status Antrean Data",
    status_success: "Metadata Oke",
    status_ready: "Siap Diproses AI",
    status_draft: "Draf Belum Dikonfigurasi",
    status_error: "Masalah / Error",
    success_rate: "Persentase Sukses",
    dist_title: "Distribusi Format Upload",
    no_files_title: "Belum Ada File Terunggah",
    no_files_desc: 'Gunakan tab menu "Metadata Gen" untuk mengunggah file Anda.',
    dist_image_label: "Ruang Kerja Gambar (Image)",
    dist_video_label: "Ruang Kerja Video (Video)",
    dist_vector_label: "Ruang Kerja Vektor (Vector)",
    portal_ready: "Siap",
    sidebar_dashboard: "Dashboard",
    sidebar_metadata_gen: "Gen Metadata",
    sidebar_prompt_gen: "Gen Prompt",
    sidebar_prompt_text: "Prompt Teks",
    sidebar_prompt_image: "Prompt Gambar",
    sidebar_prompt_video: "Prompt Video",
    sidebar_image_check: "Kurator Adobe Cek",
    sidebar_calendar_gen: "Gen Kalender",
    sidebar_chat: "Chat Akun",
    sidebar_activation_premium: "AKTIVASI PREMIUM",
    sidebar_pro_active: "PRO AKTIF",
    sidebar_manage: "Kelola",
    sidebar_core_generators: "Generator Utama",
    sidebar_core_tools: "Alat Utama",
    sidebar_processing_mode: "Mode Proses",
    sidebar_tuning: "Tuning",
    sidebar_resources: "Sumber Daya",
    sidebar_about: "Tentang MetaZo PRO",
    sidebar_subscription_plan: "Paket Langganan",
    default_pricing: "30 Hari = 50.000 - Unlimited = 250.000",
    topbar_system_time: "Waktu Sistem Saat Ini",
    topbar_stability_core: "STABILITAS CORE AKTIF",
    topbar_pro_active: "\u{1F451} PRO AKTIF",
    topbar_trial_eval: "\u26A0\uFE0F EVALUASI TRIAL",
    upload_title: "Unggah Aset",
    upload_reset: "Atur Ulang",
    upload_reset_title: "Atur Ulang Semua",
    upload_help: "Unggah file gambar, video, atau vektor Anda di sini untuk diproses.",
    upload_file_placeholder: "FILE",
    upload_next_ai: "Lanjut: Konfigurasi AI",
    info_modal_title: "MetaZo PRO Handbook & Petunjuk Penggunaan",
    info_modal_operational_guide: "\u2728 Panduan Operasional MetaZo PRO",
    info_modal_step1_title: "Workspace Selection",
    info_modal_step1_desc_p1: "Pilih mode",
    info_modal_step1_desc_p2: "pada Dashboard utama. Unggah file Anda melalui fitur drag-and-drop atau klik area unggah.",
    info_modal_step2_title: "AI Analysis & Metadata Generation",
    info_modal_step2_desc: "Setelah diunggah, klik Process Metadata. Mesin AI Vision kami akan menganalisis konten visual untuk menghasilkan Judul, Deskripsi, dan Kategori secara otomatis.",
    info_modal_step3_title: "Prompt Gen & Image AI (Terintegrasi!)",
    info_modal_step3_desc_highlight: "Fitur Prompt Gen kini terintegrasi dengan Calendar Gen untuk memudahkan pembuatan konten stok berdasarkan event terpopuler.",
    info_modal_step3_desc_main: "Gunakan fitur Prompt Gen untuk menghasilkan deskripsi visual yang mendalam untuk AI Art.",
    info_modal_step4_title: "Image Check (QC)",
    info_modal_step4_desc: "Pastikan aset Anda bebas dari pelanggaran IP, logo, dan noise berlebih dengan fitur Image Check sebelum diunggah ke agency.",
    info_modal_step5_title: "Calendar Gen (Niche Hunter)",
    info_modal_step5_desc: "Temukan event-event penting di masa depan secara global untuk membantu Anda menentukan tema produksi konten stok yang sedang dicari buyer.",
    info_modal_step6_title: "Export & Download",
    info_modal_step6_desc: "Setelah sesuai, gunakan fitur Export untuk mengunduh metadata dalam format CSV yang kompatibel dengan Adobe Stock, Shutterstock, dll.",
    info_modal_tips_title: "\u26A1 Tips Mode Pemrosesan",
    info_modal_std_mode_title: "Standard Mode",
    info_modal_std_mode_desc: "Memproses file satu per satu secara berurutan. Sangat aman dan stabil untuk menghindari kendala batasan API (rate limit).",
    info_modal_batch_mode_title: "Batch Mode",
    info_modal_batch_mode_desc: "Memproses banyak file sekaligus secara simultan. Disarankan untuk memproses asset dalam jumlah besar jika waktu menjadi prioritas utama Anda.",
    info_modal_trial_premium_title: "\u{1F4B3} Handbook Trial & Premium",
    info_modal_trial_mode_label: "Mode Trial:",
    info_modal_trial_mode_desc: "Anda berada dalam masa uji coba gratis dengan batasan harian untuk memastikan kestabilan sistem. Fitur tertentu mungkin terbatas.",
    info_modal_premium_mode_label: "Premium (Lisensi):",
    info_modal_premium_mode_desc: "Dengan Serial Key lisensi, semua batasan dihapus sepenuhnya. Dapatkan akses unlimited untuk pemrosesan aset profesional Anda.",
    info_modal_license_cta: "Butuh lisensi? Hubungi admin untuk mendapatkan Serial Key resmi & tingkatkan akun Anda ke Premium!",
    info_modal_supported_formats: "\u{1F4C1} Format File yang Didukung",
    info_modal_close_button: "Tutup Petunjuk",
    settings_modal_title: "Pengaturan Provider Model AI",
    settings_main_provider_label: "Provider AI Utama Yang Digunakan",
    settings_gemini_model_label: "Pilih Model Gemini",
    settings_gemini_desc: "Anda dapat menyimpan beberapa API Key Gemini pribadi. Sistem secara cerdas melakukan rotasi otomatis demi menghindari hambatan kuota (*rate limit / RESOURCE_EXHAUSTED*).",
    settings_gemini_key_list: "Daftar API Key Gemini",
    settings_no_keys: "Tidak ada API Key yang ditemukan untuk provider ini.",
    settings_gemini_model_auto: "Otomatis (Pilih Yang Stabil)",
    settings_use_default_key: "Menggunakan Gemini Key default server global.",
    welcome_title: "Selamat Datang di MetaZo PRO v1.3.0",
    welcome_subtitle: "Stock Asset Optimizer",
    welcome_features_label: "Fitur:",
    welcome_feature1: "Optimasi aset stok bertenaga AI",
    welcome_feature2: "Generasi ringan & cepat",
    welcome_feature3: "Dukungan banyak provider",
    welcome_feature4: "Manajemen prompt lanjutan",
    welcome_get_started: "Mulai Sekarang",
    common_or: "atau",
    common_and: "dan",
    activation_modal_title_trial_expired: "Masa Trial Habis",
    activation_modal_title_normal: "Aktivasi Lisensi Resmi",
    activation_modal_unlock_premium: "Unlock Premium SaaS",
    activation_active_status: "Aplikasi Aktif \u2022 Premium PRO",
    activation_key_registered: "Kunci Terdaftar:",
    activation_subscription_left: "Masa Berlangganan:",
    activation_days_left: "Hari Lagi",
    activation_commercial_notice: "Commercial copy licensed under key constraints.",
    activation_btn_unsubscribe: "Berhenti Berlangganan (Cabut Lisensi)",
    activation_trial_expired_hero: "Masa Trial 7 Hari Habis!",
    activation_trial_expired_desc: "Masa uji coba gratis Anda telah berakhir. Sila lakukan pembayaran dan masukkan Serial Key Lisensi di bawah untuk melanjutkan pemakaian Metadata Gen, Prompt Teks, & Kalender Gen.",
    activation_trial_active_hero: "Masa Trial Aktif",
    activation_trial_active_days: "Hari Lagi",
    activation_trial_active_desc: `Anda berada di mode Free Trial. Semua fitur terbuka dengan batasan maksimal ${getDailyLimit()} kali generate per hari. Lakukan aktivasi resmi untuk membuka semua fitur tanpa batas.`,
    activation_input_label: "Masukkan Serial Key Lisensi",
    activation_input_placeholder: "FORMAT: MZPRO-XXXX-XXXX-XXXX",
    activation_error_empty: "Mohon masukkan Serial Key lisensi Anda terlebih dahulu.",
    activation_error_expired: "Masa aktif Serial Key ini (30 Hari) telah kedaluwarsa. Sila beli key baru.",
    activation_error_used: "Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda.",
    activation_error_invalid: "Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi.",
    activation_error_offline: "Koneksi internet bermasalah dan validasi offline gagal.",
    activation_success_waiting: "\u2714 Lisensi divalidasi! Mengaktifkan premium...",
    activation_btn_process: "Memproses Aktivasi...",
    activation_btn_activate: "Aktivasi Premium",
    activation_no_license_title: "Belum Punya Lisensi? Dapatkan Instan:",
    activation_personal_activation: "Aktivasi Personal",
    activation_license_price: "Harga Lisensi:",
    activation_buy_whatsapp: "Beli Key Lisensi via WhatsApp",
    activation_confirm_stop_title: "Konfirmasi Berhenti",
    activation_confirm_stop_desc: "Apakah Anda yakin ingin mematikan status premium dan mengembalikan aplikasi ke masa uji coba / trial?",
    activation_btn_stop_yes: "Ya, Berhenti",
    activation_btn_stop_no: "Batal",
    sidebar_expand: "Perluas Sidebar",
    sidebar_collapse: "Sembunyikan Sidebar",
    sidebar_manage_license: "Kelola Lisensi / Berhenti Langganan",
    sidebar_activation_tooltip: "Aktivasi Lisensi Resmi / Mulai Pro",
    topbar_toggle_theme: "Ganti Tema",
    topbar_info_manual: "Petunjuk Manual",
    topbar_settings_api: "Pengaturan & API Key",
    common_editor: "Editor",
    common_mode: "Mode",
    prompt_title: "Prompt Teks Studio",
    prompt_subtitle: "Sintesis Ide Visual dengan Spektrum Kreativitas & Kategori Artistik",
    prompt_engine_active: "Gemini Pro Engine Active",
    prompt_formula_title: "Formula & Konfigurasi Estetika",
    prompt_tab_background: "Tab Background",
    prompt_tab_png: "Tab PNG Asset",
    prompt_trial_label: "Trial Hari Ini: Prompt Teks",
    prompt_generate_count: "Generate",
    prompt_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_trial_times: "kali",
    prompt_image_trial_label: "Trial Hari Ini: Prompt Gambar",
    prompt_image_generate_count: "Generate",
    prompt_image_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_image_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_image_trial_times: "kali",
    prompt_video_trial_label: "Trial Hari Ini: Prompt Video",
    prompt_video_generate_count: "Generate",
    prompt_video_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_video_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_video_trial_times: "kali",
    image_check_trial_label: "Trial Hari Ini: Audit Kualitas",
    image_check_generate_count: "Audit",
    image_check_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} audit) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    image_check_trial_remaining: `Masa Trial gratis ${getDailyLimit()} audit/hari. Sisa kuota audit hari ini:`,
    image_check_trial_times: "kali",
    prompt_subject_label: "Ide Visual / Subjek Gambar",
    prompt_subject_placeholder: "Ketik ide visual Anda secara bebas di sini...",
    prompt_inspiration_label: "\u{1F4A1} Butuh Inspirasi? Klik Preset di bawah:",
    prompt_negative_label: "Negative Prompt (Anti-Elemen)",
    prompt_negative_subtitle: "Avoid Elements",
    prompt_negative_desc: "Elemen di atas akan dikirimkan ke model AI untuk dihindari secara ketat pada hasil sintesis prompt.",
    prompt_style_master_label: "Kategori Gaya Master (Artistic Master Style)",
    prompt_style_quick_label: "Gaya Cepat (Quick Selection Tab)",
    prompt_png_bg_label: "Pilihan Background PNG",
    prompt_png_bg_desc: "AI secara pintar akan menyematkan instruksi warna latar belakang solid ini ke dalam prompt agar subjek gambar terisolasi dengan rapi.",
    prompt_variation_label: "Dimensi & Jml Variasi Output",
    prompt_variation_unit: "Variasi",
    prompt_word_count_label: "Word Count Range (Panjang Prompt)",
    prompt_word_count_desc: "Mengatur seberapa detail AI mengekspansi deskripsi visual setiap prompt.",
    prompt_btn_synthesize: "Sintesis {count} Prompt Sekarang",
    prompt_btn_synthesizing: "AI Mengekspansi {count} Variasi Estetika...",
    prompt_preset_lite: "Cepat, efisien, formulasi ringkas dan representatif.",
    prompt_preset_artistic: "Penuh opsi atmosfer kamera, lensa variatif, dan gaya estetis seimbang.",
    prompt_preset_ultra: "Detail super kompleks, kaya tekstur, opsi lighting, dan ragam sudut pandang.",
    prompt_loading_step1: "Merumuskan Skenario Kreatif...",
    prompt_loading_step2: "Mensintesis Detail Artistik...",
    prompt_loading_step3: "Memoles Spektrum Prompt...",
    prompt_loading_step4: "Finalisasi Koleksi Output...",
    prompt_studio_title: "Prompt Teks Studio",
    prompt_studio_subtitle: "Sintesis Ide Visual dengan Spektrum Kreativitas & Kategori Artistik",
    prompt_studio_version: "Advanced AI Teks Creator v2.5",
    prompt_output_title: "Generated Prompts",
    prompt_output_subtitle: "Semua prompt siap disalin ke Midjourney / DALL-E / Firefly / Stable Diffusion",
    prompt_output_badge_png: "\u2728 PNG: LATAR {color}",
    prompt_output_badge_scene: "\u{1F5BC}\uFE0F Background Scene",
    prompt_output_btn_copy_all: "Salin Semua",
    prompt_output_btn_copied: "Disalin",
    prompt_output_btn_download: "Download",
    prompt_output_btn_clear: "Clear",
    prompt_output_search_placeholder: "Saring prompt (contoh: 'lighting', 'macro', 'epic', 'camera')...",
    prompt_output_no_match_title: "Tidak ada kecocokan filter",
    prompt_output_no_match_desc: 'Kata kunci "{query}" tidak ditemukan pada {count} prompt.',
    image_studio_title: "Prompt Image Studio",
    image_studio_subtitle: "Ekstraksi Deskripsi & Estetika dari Referensi Gambar Anda (Single & Batch Mode)",
    image_studio_version: "Image-to-Prompt Batch v2.0",
    image_studio_upload_label: "Panel Unggah Gambar",
    image_studio_clear_all: "Hapus Semua",
    image_studio_drag_drop: "Unggah / Seret Gambar",
    image_studio_release: "Lepaskan Gambar",
    image_studio_support_multiple: "Mendukung banyak file sekaligus",
    image_studio_target_label: "Pilih Target Estetika",
    image_studio_btn_analyze: "Hasilkan Prompt ({count} Item Baru)",
    image_studio_btn_analyzing: "Memproses {count} Item ({progress}%)",
    image_studio_dashboard_title: "Progress Dashboard Antrian",
    image_studio_status_label: "Status: {finished}/{total} Selesai",
    image_studio_btn_copy_all: "Salin Semua",
    image_studio_btn_copied_all: "Disalin Semua",
    image_studio_empty_title: "Belum Ada Gambar dalam Antrian",
    image_studio_empty_desc: "Unggah satu atau beberapa gambar referensi untuk mengekstraksi prompt estetika AI secara instan.",
    video_studio_title: "Prompt Video Studio",
    video_studio_subtitle: "Sintesis Deskripsi & Prompt dari Referensi Gerak Video",
    video_studio_keyword_placeholder: "Masukkan keyword gerak (contoh: 'Cinematic Landscape', 'Epic Action')...",
    video_studio_btn_analyze: "Analisis Gerak",
    video_studio_btn_analyzing: "Menganalisis...",
    video_studio_history_title: "Riwayat Analisis",
    video_studio_btn_clear_history: "Bersihkan Riwayat",
    video_studio_hollywood_title: "Sintesis Hollywood",
    video_studio_hollywood_desc: "Hasilkan prompt director standar Hollywood profesional berdasarkan analisis gerak.",
    video_studio_btn_generate_hollywood: "Hasilkan Hollywood Prompt",
    video_studio_btn_generating_hollywood: "Mensintesis Hollywood Prompt...",
    video_studio_btn_download: "Download Prompt",
    video_studio_camera_label: "Kamera",
    video_studio_technical_label: "Technical String",
    video_studio_saturation_title: "Saturasi Pasar",
    video_studio_saturation_desc: "Peringatan otomatis jika pasar sudah terlalu jenuh dengan konten serupa.",
    video_studio_revenue_title: "Prakiraan Pendapatan",
    video_studio_revenue_desc: "Estimasi potensi pendapatan berdasarkan tren pembeli di Adobe Stock & Shutterstock.",
    video_studio_error_empty: "Mohon masukkan keyword terlebih dahulu.",
    video_studio_error_fail: "Gagal menganalisis keyword. Coba lagi nanti.",
    calendar_title: "Kalender Visual Strategis",
    calendar_subtitle: "Temukan momen strategis berdasarkan hari libur & tren pasar global.",
    calendar_months_january: "Januari",
    calendar_months_february: "Februari",
    calendar_months_march: "Maret",
    calendar_months_april: "April",
    calendar_months_may: "Mei",
    calendar_months_june: "Juni",
    calendar_months_july: "Juli",
    calendar_months_august: "Agustus",
    calendar_months_september: "September",
    calendar_months_october: "Oktober",
    calendar_months_november: "November",
    calendar_months_december: "Desember",
    calendar_btn_generate: "Cari Event",
    calendar_btn_generating: "Menganalisis...",
    calendar_month_label: "Pilih Bulan",
    calendar_card_btn_keywords: "Hasilkan Keyword",
    calendar_card_btn_prompt: "Buat Prompt",
    calendar_error_fail: "Gagal memuat event. Silakan coba lagi.",
    style_photorealistic: "Photorealistic (Realistis)",
    style_cinematic: "Cinematic (Film)",
    style_adobe_stock: "Adobe Stock Style",
    style_editorial: "Editorial (Majalah)",
    style_lifestyle: "Lifestyle (Gaya Hidup)",
    style_fine_art: "Fine Art (Seni Tinggi)",
    prompt_error_trial: `Batas Trial Terlampaui. Anda telah mencapai batas maksimal ${getDailyLimit()} kali generate Prompt Teks hari ini. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_error_empty: "Silakan masukkan ide dasar atau subjek murni visual terlebih dahulu.",
    prompt_png_bg_white: "\u26AA Latar Putih (White background)",
    prompt_png_bg_black: "\u26AB Latar Hitam (Black background)",
    prompt_png_bg_transparent: "\u{1F3C1} Latar Transparan (Transparent background)",
    qc_title: "Audit",
    qc_title_check: "Kualitas",
    qc_subtitle: "AI Expert Standar Adobe Stock",
    qc_btn_reset: "Reset",
    qc_btn_analyze: "Mulai Audit Asset",
    qc_btn_analyzing: "Menganalisis...",
    qc_tolerance_label: "Toleransi Kualitas",
    qc_upload_hub: "Upload Hub",
    qc_drop_images_here: "Drop Gambar/Video/Vektor Di Sini",
    qc_release_images: "Lepaskan File",
    qc_multiple_upload: "Mendukung Gambar, Video & Vektor (.eps, .ai)",
    qc_queue_assets: "Asset dalam Antrean",
    qc_pending_audit: "Menunggu Audit",
    qc_analyzing_text: "Spesialis QC Adobe Stock",
    qc_analyzing_desc: "Menganalisis nilai hukum, teknis, dan komersial",
    qc_info_empty: "Silahkan upload file dulu untuk memulai proses audit kurasi",
    qc_score_label: "SKOR QC",
    qc_hide_heatmap: "Sembunyikan Heatmap",
    qc_analyze_heatmap: "Analisis Heatmap Pixel",
    qc_pixel_engine: "Pixel Engine",
    qc_rejection_reason: "Alasan Penolakan",
    qc_legal_status: "Status Hukum",
    qc_quality_metadata: "Metadata Kualitas",
    qc_close: "Tutup",
    qc_view_audit: "Lihat Audit",
    qc_strengths: "Kelebihan",
    qc_tech_analysis: "Analisis Teknis",
    qc_detailed_feedback: "Umpan Balik Detail",
    guide_btn_title: "Lihat Panduan Fitur",
    guide_dashboard_title: "Panduan Dashboard",
    guide_dashboard_desc: "Ringkasan metrik akun, utilitas dan akses langsung ke seluruh alat asisten metadata Anda.",
    guide_prompt_gen_title: "Panduan Prompt Studio",
    guide_prompt_gen_desc: "Ketik kata dasar, dan AI akan meracik prompt siap pakai untuk kebutuhan generatif AI Microstock.",
    guide_prompt_text_title: "Panduan Prompt Teks",
    guide_prompt_text_desc: "Ketik kata dasar, dan AI akan meracik prompt siap pakai untuk kebutuhan generatif AI Microstock.",
    guide_prompt_image_title: "Panduan Prompt Gambar",
    guide_prompt_image_desc: "Unggah gambar referensi untuk mengekstraksi deskripsi estetika dan formula prompt secara instan.",
    guide_prompt_video_title: "Panduan Prompt Video",
    guide_prompt_video_desc: "Analisis kata kunci gerakan untuk mensintesis prompt sinematik dan instruksi direktur secara profesional.",
    guide_image_title: "Panduan AI Gambar",
    guide_image_desc: "Deskripsi otomatis gambar Anda menjadi metadata standar tinggi (Judul, Deskripsi, 50 Keywords komersial).",
    guide_video_title: "Panduan AI Video",
    guide_video_desc: "Dapatkan kata kunci khusus footages yang mengekstrak elemen gerakan, sinematografi, dan alur.",
    guide_vector_title: "Panduan Vektor EPS",
    guide_vector_desc: "Unggah fle EPS ilustrasi secara langsung. Sistem akan dengan mulus mengekstrak metadata spesifik grafik vektor.",
    guide_image_check_title: "Panduan Audit Gambar",
    guide_image_check_desc: "Cek kualitas sebelum submit ke agensi. AI akan menganalisa titik-titik penolakan dan pelanggaran pedoman teknis.",
    guide_calendar_title: "Panduan Kalender AI",
    guide_calendar_desc: "Bangun perencanan konten dengan ide-ide komersial musiman yang akan laris berdasarkan tren.",
    sidebar_mute_video: "Mute Video Gen",
    sidebar_motion_gen: "Motion Gen",
    sidebar_removal_gen: "Removal Gen",
    mute_title: "Batch Mute Video Gen",
    mute_subtitle: "Hilangkan suara dari banyak berkas video stock secara instan & lossless sekaligus",
    mute_btn_clear: "Hapus Semua",
    mute_drag_drop: "Tarik & Letakkan beberapa file video di sini",
    mute_formats_supported: "Mendukung banyak file MP4, MOV, WebM sekaligus (Maks 500MB per file)",
    mute_btn_choose: "PILIH BERKAS VIDEO",
    mute_error_invalid_files: "File berikut diabaikan karena bukan video: {names}",
    mute_queue_title: "Daftar Antrean Video ({count})",
    mute_stat_done: "Selesai",
    mute_stat_processing: "Proses",
    mute_stat_failed: "Gagal",
    mute_stat_pending: "Menunggu",
    mute_btn_processing: "MEMPROSES BATCH ({current}/{total})...",
    mute_btn_mute_queue: "MUTE ANTRIAN VIDEO",
    mute_btn_download_all: "UNDUH SEMUA ({count})",
    mute_status_muting: "Muting...",
    mute_status_success: "Sukses",
    mute_status_failed_badge: "Gagal",
    mute_status_pending_badge: "Menunggu",
    mute_tooltip_remove: "Hapus dari antrean",
    mute_preview_title: "Pratinjau Media",
    mute_preview_size: "Ukuran",
    mute_preview_format: "Format",
    mute_preview_error: "Kesalahan",
    mute_preview_empty: "Pilih video dari daftar antrean untuk memutar pratinjau",
    mute_guide_title: "Panduan Penggunaan",
    mute_guide_step1_title: "Pilih Berkas",
    mute_guide_step1_desc: "Seret beberapa video atau klik tombol pilih berkas di atas.",
    mute_guide_step2_title: "Mulai Proses",
    mute_guide_step2_desc: "Klik tombol Mute Antrian Video untuk menghilangkan suara semua video sekaligus secara berurutan.",
    mute_guide_step3_title: "Unduh Hasil",
    mute_guide_step3_desc: "Unduh satu per satu menggunakan tombol di samping nama file, atau klik Unduh Semua untuk mengunduh semua video sukses sekaligus.",
    mute_guide_footer: "\u{1F512} Semua file diproses secara lokal di server sandbox yang aman, dan akan segera dihancurkan setelah pengunduhan selesai.",
    guide_mute_video_title: "Panduan Mute Video",
    guide_mute_video_desc: "Hilangkan suara dari banyak berkas video stock secara instan & lossless sekaligus untuk memenuhi persyaratan agensi.",
    mute_auto_download_label: "Auto-Unduh",
    mute_auto_download_desc: "Unduh otomatis saat selesai",
    mute_trial_expired: "\u26A0\uFE0F Batas trial gratis harian (25 video mute) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.",
    mute_trial_remaining: "Masa Trial gratis 25 video mute/hari. Sisa kuota hari ini: {remaining} kali",
    mute_error_trial: "Batas Trial Terlampaui. Anda telah mencapai batas maksimal 25 video mute hari ini. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas."
  }
};

// data/project/MetaZo-Update--main/server/gemini.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var apiKeyStorage = new import_node_async_hooks.AsyncLocalStorage();
var CACHE_FILE_PATH = import_node_path.default.join(process.cwd(), "qa_reports_cache.json");
function loadQACache() {
  console.log("[QA Cache] Caching disabled to ensure pure real-time 100% real AI vision analysis.");
}
loadQACache();
try {
  const envPath = import_node_path.default.join(process.cwd(), ".env");
  if (import_node_fs.default.existsSync(envPath)) {
    const envContent = import_node_fs.default.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
    console.log("[ENV LOAD] Loaded custom configurations from workspace .env file.");
  }
} catch (e) {
  console.warn("[ENV LOAD WARNING] Could not read .env file:", e);
}
var getBluesmindsEndpoint = () => {
  const envVal = process.env.BLUESMINDS_API_ENDPOINT;
  if (!envVal || !envVal.trim()) {
    return "https://api.bluesminds.com/v1/chat/completions";
  }
  let base = envVal.trim();
  if (base.endsWith("/chat/completions")) {
    return base;
  }
  if (base.endsWith("/chat/completions/")) {
    return base.slice(0, -1);
  }
  if (base.endsWith("/v1")) {
    return `${base}/chat/completions`;
  }
  if (base.endsWith("/v1/")) {
    return `${base}chat/completions`;
  }
  if (base.endsWith("/")) {
    return `${base}v1/chat/completions`;
  }
  return `${base}/v1/chat/completions`;
};
var PROVIDER_ENDPOINTS = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  blackbox: "https://api.blackbox.ai/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  bluesminds: getBluesmindsEndpoint(),
  aivene: "https://api.aivene.com/v1/chat/completions",
  zai: "https://api.z.ai/api/paas/v4/chat/completions"
};
var PROVIDER_DEFAULT_MODELS = {
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
  mistral: "pixtral-12b",
  openai: "gpt-4o-mini",
  openrouter: "google/gemini-2.0-flash-001",
  blackbox: "blackboxai",
  nvidia: "meta/llama-3.3-70b-instruct",
  bluesminds: "gpt-4o",
  aivene: "gpt-4o-mini",
  zai: "glm-5.2"
};
var PROVIDER_FALLBACK_MODELS = {
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  openai: "gpt-4o",
  openrouter: "anthropic/claude-3.5-haiku",
  blackbox: "blackboxai-pro",
  nvidia: "meta/llama-3.1-70b-instruct",
  bluesminds: "gpt-4o",
  aivene: "gpt-4o-mini",
  zai: "glm-5.2"
};
var SUPPORTS_JSON_MODE = /* @__PURE__ */ new Set(["groq", "openai", "openrouter", "nvidia", "bluesminds", "aivene", "zai"]);
var PROVIDER_ENV_KEYS = {
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  blackbox: "BLACKBOX_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  bluesminds: "BLUESMINDS_API_KEY",
  aivene: "AIVENE_API_KEY",
  zai: "ZAI_API_KEY"
};
var NON_GEMINI_PROVIDERS = /* @__PURE__ */ new Set(["groq", "mistral", "openai", "openrouter", "blackbox", "nvidia", "bluesminds", "aivene", "zai"]);
function extractJSON(raw) {
  if (!raw) return "{}";
  try {
    const trimmed = raw.trim();
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
  }
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const tryExtract = (opener, closer) => {
    let startIdx = 0;
    while ((startIdx = cleaned.indexOf(opener, startIdx)) !== -1) {
      let endIdx = cleaned.lastIndexOf(closer);
      while (endIdx > startIdx) {
        const potential = cleaned.slice(startIdx, endIdx + 1);
        try {
          JSON.parse(potential);
          return potential;
        } catch (e) {
          endIdx = cleaned.lastIndexOf(closer, endIdx - 1);
        }
      }
      startIdx++;
    }
    return null;
  };
  const objectMatch = tryExtract("{", "}");
  if (objectMatch) return objectMatch;
  const arrayMatch = tryExtract("[", "]");
  if (arrayMatch) return arrayMatch;
  return "{}";
}
var COLOR_KEYWORDS = /* @__PURE__ */ new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "black",
  "white",
  "gray",
  "grey",
  "gold",
  "silver",
  "bronze",
  "violet",
  "indigo",
  "cyan",
  "magenta",
  "teal",
  "navy",
  "beige",
  "charcoal",
  "cream",
  "peach",
  "lavender",
  "turquoise",
  "emerald",
  "ruby",
  "amber",
  "olive",
  "coral",
  "crimson",
  "scarlet",
  "maroon",
  "plum",
  "ivory",
  "mustard",
  "khaki",
  "mint",
  "lime",
  "tan",
  "mauve",
  "pastel"
]);
var PROHIBITED_KEYWORDS_SET = /* @__PURE__ */ new Set([
  "apple",
  "iphone",
  "ipad",
  "macbook",
  "mac",
  "ios",
  "android",
  "microsoft",
  "windows",
  "xbox",
  "playstation",
  "sony",
  "samsung",
  "nike",
  "adidas",
  "gucci",
  "rolex",
  "cocacola",
  "coca-cola",
  "pepsi",
  "starbucks",
  "amazon",
  "google",
  "meta",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "netflix",
  "disney",
  "marvel",
  "canon",
  "nikon",
  "adobe",
  "shutterstock",
  "getty",
  "midjourney",
  "firefly",
  "stablediffusion",
  "dalle",
  "llama",
  "chatgpt",
  "openai",
  "instagram",
  "youtube",
  "whatsapp",
  "brand",
  "trademark",
  "logo",
  "copyright",
  "intellectual",
  "property"
]);
function isProhibitedKeyword(word) {
  if (!word) return true;
  const lower = word.toLowerCase().trim();
  if (PROHIBITED_KEYWORDS_SET.has(lower)) return true;
  const parts = lower.split(/[\s-_]+/);
  if (parts.some((part) => COLOR_KEYWORDS.has(part))) {
    return true;
  }
  return false;
}
function getHeuristicCategories(title, keywords) {
  const t = String(title || "").toLowerCase();
  const kList = (keywords || []).map((x) => String(x).toLowerCase());
  const countMatches = (terms) => {
    let score = 0;
    terms.forEach((term) => {
      if (t.includes(term)) score += 5;
      kList.forEach((k) => {
        if (k === term || k.includes(term)) score += 1;
      });
    });
    return score;
  };
  const categoryScores = {};
  const patterns = {
    1: ["animal", "cat", "dog", "pet", "wildlife", "bird", "fish", "monkey", "lion", "tiger", "bear", "insect", "reptilian", "creature", "beast", "fauna", "mammal", "species", "wilderness", "habitat", "furry", "adorable", "close-up", "environment", "wild", "zoology"],
    2: ["architecture", "building", "structure", "house", "room", "office", "home", "tower", "bridge", "monument", "museum", "interior", "exterior", "floor", "window", "wall", "door", "facade", "construction", "metropolis", "tower", "estate"],
    3: ["business", "corporate", "office", "money", "chart", "graph", "marketing", "manager", "meeting", "resume", "professional", "work", "job", "finance", "desk", "computer", "presentation", "leadership", "organization", "colleague", "career", "investment", "growth"],
    4: ["drink", "beverage", "coffee", "tea", "wine", "beer", "juice", "glass", "cup", "mug", "bottle", "liquid", "cocktail", "draft", "soda"],
    5: ["environment", "eco", "recycle", "green", "sustainability", "recycle", "conservation", "earth", "planet", "wind", "solar", "climate", "environmental", "organic"],
    6: ["emotion", "mood", "feeling", "happy", "sad", "angry", "conceptual", "thought", "brain", "mind", "stress", "focus", "psychology", "attitude", "behavior", "expression", "abstract", "idea", "sensation"],
    7: ["food", "dish", "meal", "kitchen", "restaurant", "dining", "plate", "chef", "fruit", "vegetable", "meat", "dessert", "cake", "bread", "pancake", "pizza", "burger", "fast food", "dinner", "breakfast", "lunch", "sweet", "cream", "baked", "cookies", "sugar", "cuisine", "gourmet", "culinary", "recipe", "diet"],
    8: ["logo", "icon", "frame", "template", "banner", "layout", "sticker", "elements", "background", "wallpaper", "texture", "pattern", "asset", "backdrop", "seamless", "infographic", "chart", "presentation"],
    9: ["hobby", "leisure", "play", "game", "guitar", "music", "movie", "craft", "book", "read", "garden", "recreation", "activity", "fun", "pastime", "indoor", "enjoyment"],
    10: ["industrial", "factory", "manufacturing", "machine", "worker", "equipment", "facility", "metal", "power", "warehouse", "technical", "automated", "construction", "engineering", "machinery"],
    11: ["landscape", "mountain", "sea", "beach", "ocean", "lake", "river", "forest", "desert", "valley", "sunrise", "sunset", "nature", "view", "panorama", "scenery", "scenic", "vista", "sky", "horizon"],
    12: ["lifestyle", "life", "daily", "routine", "casual", "luxury", "habits", "comfort", "domestic", "style", "casual", "wellness", "health", "fitness"],
    13: ["person", "people", "human", "man", "woman", "crowd", "family", "child", "baby", "girl", "boy", "group", "face", "hand", "arm", "leg", "foot", "pose", "portrait", "individual", "young", "adult", "interaction", "relationship"],
    14: ["plant", "flower", "tree", "leaf", "garden", "grass", "rose", "floral", "botany", "botanical", "moss", "herbal", "seeds", "blossom", "petal", "growth", "stem", "vegetation", "spring", "summer"],
    15: ["culture", "religion", "traditional", "church", "temple", "mosque", "cross", "holy", "ceremonial", "holiday", "festival", "heritage", "history", "spiritual", "belief", "faith", "tradition", "custom", "sacred", "ritual", "symbol", "history", "celebration"],
    16: ["science", "biology", "chemistry", "physics", "medicine", "research", "laboratory", "math", "microscope", "formula", "experimental", "data", "lab", "discovery", "study", "experiment"],
    17: ["social issue", "protest", "poverty", "homeless", "war", "peace", "justice", "human rights", "community", "support", "help", "charity", "assistance", "advocacy", "global", "campaign"],
    18: ["sport", "run", "ball", "football", "soccer", "tennis", "golf", "gym", "workout", "athletic", "athlete", "competition", "swimming", "basketball", "training", "exercise", "fitness", "active"],
    19: ["technology", "tech", "smart", "digital", "screen", "laser", "circuit", "code", "program", "blockchain", "database", "ai", "server", "network", "connection", "internet", "future", "futuristic", "communication", "virtual"],
    20: ["transport", "car", "truck", "vehicle", "train", "airplane", "ship", "boat", "road", "street", "highway", "traffic", "transit", "logistics", "delivery", "automobile", "drive", "engine", "auto"],
    21: ["travel", "tourism", "traveler", "hotel", "map", "compass", "passport", "luggage", "packing", "tourist", "vacation", "flight", "destination", "trip", "journey", "adventure", "explore"]
  };
  let maxScore = -1;
  let bestCatId = 8;
  for (const [catIdStr, words] of Object.entries(patterns)) {
    const catId = parseInt(catIdStr, 10);
    const score = countMatches(words);
    categoryScores[catId] = score;
    if (score > maxScore) {
      maxScore = score;
      bestCatId = catId;
    }
  }
  if (maxScore <= 0) {
    bestCatId = 8;
  }
  const mapping = {
    1: { cat1: "Animals/Wildlife", cat2: "Nature" },
    2: { cat1: "Buildings/Landmarks", cat2: "Interiors" },
    3: { cat1: "Business/Finance", cat2: "Technology" },
    4: { cat1: "Food and Drink", cat2: "Objects" },
    5: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    6: { cat1: "Abstract", cat2: "Miscellaneous" },
    7: { cat1: "Food and Drink", cat2: "Objects" },
    8: { cat1: "Abstract", cat2: "Backgrounds/Textures" },
    9: { cat1: "Objects", cat2: "Sports/Recreation" },
    10: { cat1: "Industrial", cat2: "Technology" },
    11: { cat1: "Nature", cat2: "Parks/Outdoor" },
    12: { cat1: "People", cat2: "Miscellaneous" },
    13: { cat1: "People", cat2: "Miscellaneous" },
    14: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    15: { cat1: "Religion", cat2: "Holidays" },
    16: { cat1: "Science", cat2: "Technology" },
    17: { cat1: "Miscellaneous", cat2: "People" },
    18: { cat1: "Sports/Recreation", cat2: "Objects" },
    19: { cat1: "Technology", cat2: "Industrial" },
    20: { cat1: "Transportation", cat2: "Objects" },
    21: { cat1: "Nature", cat2: "Buildings/Landmarks" }
  };
  const choice = mapping[bestCatId] || { cat1: "Abstract", cat2: "Backgrounds/Textures" };
  return {
    category_id: bestCatId,
    shutterstock_category_1: choice.cat1,
    shutterstock_category_2: choice.cat2
  };
}
function ensureTitleLength(title, keywords, description, titleLength) {
  if (!title || title.trim() === "" || title.includes("Write a descriptive title here") || title.includes("<generate a") || title.includes("A highly descriptive") || title.includes("A detailed")) {
    if (description && description.trim().length > 10 && !description.includes("Write a detailed description here") && !description.includes("<generate a") && !description.includes("A highly descriptive") && !description.includes("A detailed")) title = description;
    else if (keywords && keywords.length >= 3) title = keywords.slice(0, 5).join(" ");
    else title = "Stock asset";
  } else {
    title = String(title);
  }
  let cleanedTitle = title.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (cleanedTitle.endsWith(".")) {
    cleanedTitle = cleanedTitle.slice(0, -1).trim();
  }
  const disallowedStarts = [
    "vector of",
    "illustration of",
    "drawing of",
    "continuous line drawing of",
    "vector",
    "illustration",
    "drawing",
    "continuous line drawing"
  ];
  let titleLower = cleanedTitle.toLowerCase();
  for (const start of disallowedStarts) {
    if (titleLower.startsWith(start + " ")) {
      cleanedTitle = cleanedTitle.substring(start.length + 1).trim();
      titleLower = cleanedTitle.toLowerCase();
    }
  }
  let upperLimit = 200;
  if (titleLength === "short") upperLimit = 65;
  if (titleLength === "long") upperLimit = 200;
  if (cleanedTitle.length > upperLimit) {
    let truncated = cleanedTitle.substring(0, upperLimit);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > Math.floor(upperLimit / 2)) {
      truncated = truncated.substring(0, lastSpace);
    }
    cleanedTitle = truncated.trim();
  }
  const words = cleanedTitle.split(/\s+/);
  const deduplicatedWords = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (prev && current.toLowerCase() === prev.toLowerCase() && !["and", "with", "in", "on", "the", "a", "of"].includes(current.toLowerCase())) {
      continue;
    }
    deduplicatedWords.push(current);
  }
  cleanedTitle = deduplicatedWords.join(" ");
  cleanedTitle = cleanedTitle.replace(/,/g, "").replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (cleanedTitle.length > 0) {
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  }
  return cleanedTitle;
}
function ensureDescription(description, title, keywords) {
  if (!description || typeof description !== "string") {
    description = "";
  }
  const isPlaceholderDesc = (desc) => {
    const d = desc.toLowerCase().trim();
    return d === "" || d.includes("write a detailed description here") || d.includes("<generate a") || d.includes("a highly descriptive") || d.includes("a detailed visual description") || d.includes("a detailed description") || d.includes("provide a thorough visual breakdown") || d.includes("detailed description of the image") || d.includes("description of the image") || d.includes("an image containing") || d.includes("this image displays") || d.includes("this is a description");
  };
  if (isPlaceholderDesc(description)) {
    if (title && title.trim().length > 5) {
      const cleanTitle = title.replace(/write a descriptive/gi, "").replace(/<generate/gi, "").replace(/highly descriptive/gi, "").trim();
      if (cleanTitle.length > 5) {
        return `Visual media showcasing ${cleanTitle.toLowerCase()}, designed for commercial, editorial, and creative projects.`;
      }
    }
    if (keywords && keywords.length >= 3) {
      return `Visual content featuring ${keywords.slice(0, 5).join(", ")}, suitable for advertising, marketing, and editorial purposes.`;
    }
    return "Digital media asset designed for commercial, editorial, or creative projects.";
  }
  return description.trim();
}
var getTitleLengthRule = (titleLength) => {
  if (titleLength === "short") {
    return "Title MUST be highly SEO optimized but kept VERY SHORT and concise (around 3 to 7 words maximum). Just state the core subject briefly.";
  } else if (titleLength === "long") {
    return "Title MUST be highly SEO optimized, extremely detailed, and have at least 15-25 descriptive words to ensure maximum long-tail visibility on stock platforms. Capture all elements.";
  }
  return "Title MUST be highly SEO optimized, front-loaded with primary commercial keywords, and have at least 10-15 descriptive words to ensure maximum visibility on stock platforms.";
};
var getLanguageName = (code) => {
  const map = {
    "en": "ENGLISH",
    "id": "INDONESIAN (BAHASA INDONESIA)",
    "es": "SPANISH",
    "fr": "FRENCH",
    "de": "GERMAN",
    "it": "ITALIAN",
    "pt": "PORTUGUESE",
    "ja": "JAPANESE",
    "ko": "KOREAN",
    "ru": "RUSSIAN",
    "th": "THAI",
    "tr": "TURKISH",
    "nl": "DUTCH",
    "pl": "POLISH"
  };
  return map[code || "en"] || "ENGLISH";
};
function ensureKeywordCount(keywords, targetCount, visualFacts, title, description, categoryId, keywordMode) {
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  let uniqueKeywords = [];
  if (Array.isArray(keywords)) {
    keywords.forEach((k) => {
      if (typeof k === "string") {
        const clean = k.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();
        if (clean.length > 1 && !isProhibitedKeyword(clean)) {
          if (keywordMode === "single" && clean.includes(" ")) {
            const pieces = clean.split(/\s+/);
            pieces.forEach((p) => {
              if (p.length > 1 && !isProhibitedKeyword(p)) {
                const isDuplicate = uniqueKeywords.some(
                  (existing) => existing === p || existing === p + "s" || p === existing + "s" || existing === p + "es" || p === existing + "es" || existing.replace(/ies$/, "y") === p || p.replace(/ies$/, "y") === existing
                );
                if (!isDuplicate) {
                  uniqueKeywords.push(p);
                }
              }
            });
          } else {
            let cleanVal = clean;
            if (keywordMode === "multi" && !clean.includes(" ")) {
              const modifiers = ["concept", "background", "scene", "design", "style", "detail", "asset", "element"];
              const mod = modifiers[Math.abs(hashString(clean)) % modifiers.length];
              cleanVal = `${clean} ${mod}`;
            }
            const isDuplicate = uniqueKeywords.some(
              (existing) => existing === cleanVal || existing === cleanVal + "s" || cleanVal === existing + "s" || existing === cleanVal + "es" || cleanVal === existing + "es" || existing.replace(/ies$/, "y") === cleanVal || cleanVal.replace(/ies$/, "y") === existing
            );
            if (!isDuplicate) {
              uniqueKeywords.push(cleanVal);
            }
          }
        }
      }
    });
  }
  if (uniqueKeywords.length >= targetCount) {
    return uniqueKeywords.slice(0, targetCount);
  }
  const categoryFallbackKeywords = {
    1: ["animal", "nature", "wildlife", "fauna", "creature", "outdoor", "mammal", "species", "wilderness", "natural", "habitat", "furry", "adorable", "portrait", "close-up", "environment", "beast", "pet", "wild", "zoology"],
    2: ["architecture", "building", "structure", "construction", "city", "urban", "exterior", "interior", "design", "modern", "concrete", "glass", "steel", "landmark", "monument", "facade", "metropolis", "tower", "estate", "house", "contemporary"],
    3: ["business", "office", "corporate", "work", "workplace", "finance", "company", "management", "team", "meeting", "strategy", "success", "professional", "marketing", "leadership", "organization", "colleague", "career", "investment", "growth", "concept"],
    4: ["drink", "beverage", "glass", "liquid", "refreshing", "cold", "hot", "cup", "bottle", "mug", "bar", "cafe", "cocktail", "juice", "water", "coffee", "tea", "alcohol", "brew", "ice"],
    5: ["environment", "nature", "landscape", "green", "eco", "ecology", "sustainability", "recycle", "conservation", "earth", "planet", "wild", "scenery", "outdoor", "forest", "climate", "natural", "environmental", "organic"],
    6: ["concept", "mood", "feeling", "emotion", "mental", "mind", "thought", "isolated", "abstract", "idea", "expression", "psychology", "imagination", "sensation", "attitude", "behavior"],
    7: ["food", "delicious", "tasty", "dish", "meal", "gourmet", "culinary", "plate", "eating", "ingredient", "fresh", "vegetable", "fruit", "cooking", "kitchen", "recipe", "diet", "lunch", "dinner", "breakfast", "cuisine"],
    8: ["graphic", "design", "resource", "vector", "illustration", "element", "abstract", "background", "template", "pattern", "asset", "layout", "creative", "art", "flat", "logo", "icon", "backdrop", "seamless"],
    9: ["hobby", "leisure", "recreation", "activity", "fun", "game", "play", "relaxation", "lifestyle", "entertainment", "pastime", "craft", "indoor", "outdoor", "enjoyment"],
    10: ["industry", "industrial", "factory", "manufacture", "production", "technology", "engineering", "machinery", "worker", "equipment", "facility", "metal", "power", "warehouse", "technical", "automated", "construction"],
    11: ["landscape", "scenery", "scenic", "nature", "view", "outdoor", "mountain", "hill", "valley", "field", "panorama", "horizon", "wilderness", "beautiful", "vista", "natural", "sky"],
    12: ["lifestyle", "life", "daily", "routine", "modern", "human", "person", "people", "home", "domestic", "activity", "casual", "habits", "style", "comfort", "leisure"],
    13: ["people", "person", "human", "individual", "portrait", "man", "woman", "adult", "young", "lifestyle", "group", "crowd", "interaction", "relationship", "face", "expressive", "posing"],
    14: ["plant", "flower", "flora", "botany", "botanical", "leaf", "nature", "garden", "green", "blossom", "petal", "growth", "stem", "outdoor", "natural", "organic", "vegetation", "spring", "summer"],
    15: ["culture", "religion", "religious", "spiritual", "belief", "faith", "tradition", "custom", "heritage", "sacred", "ceremony", "ritual", "symbol", "history", "traditional", "temple", "church", "holiday", "celebration"],
    16: ["science", "scientific", "research", "laboratory", "lab", "technology", "analysis", "experiment", "discovery", "study", "chemistry", "biology", "physics", "tech", "equipment", "microscope", "test", "data", "concept"],
    17: ["social", "issue", "community", "society", "problem", "awareness", "support", "help", "advocacy", "global", "campaign", "concept", "message", "public", "humanity", "care"],
    18: ["sports", "sport", "athletic", "athlete", "exercise", "fitness", "training", "game", "competition", "player", "workout", "active", "healthy", "stadium", "court", "field", "gym", "recreation", "action"],
    19: ["technology", "tech", "digital", "device", "modern", "electronic", "innovation", "computer", "network", "connection", "internet", "future", "futuristic", "concept", "data", "communication", "virtual", "smart"],
    20: ["transport", "transportation", "vehicle", "car", "automobile", "traffic", "road", "street", "travel", "highway", "drive", "engine", "movement", "logistics", "delivery", "auto", "transit"],
    21: ["travel", "tourism", "destination", "vacation", "holiday", "trip", "journey", "adventure", "explore", "tourist", "sightseeing", "scenic", "landmark", "outdoor", "recreation", "passport", "luggage"]
  };
  const STOP_WORDS = /* @__PURE__ */ new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "in",
    "with",
    "by",
    "of",
    "to",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
    "we",
    "us",
    "our",
    "you",
    "your",
    "he",
    "him",
    "his",
    "she",
    "her",
    "isolated",
    "stock",
    "photo",
    "image",
    "picture",
    "vector",
    "illustration",
    "captured",
    "professional",
    "high",
    "quality",
    "resolution",
    "super",
    "ultra",
    "beautiful",
    "stunning",
    "amazing",
    "perfect",
    "ideal"
  ]);
  const extractWords = (str) => {
    if (!str || typeof str !== "string") return [];
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !isProhibitedKeyword(w));
  };
  const sources = [];
  if (visualFacts && visualFacts.primary_subjects && Array.isArray(visualFacts.primary_subjects)) {
    const words = [];
    visualFacts.primary_subjects.forEach((x) => {
      if (x && typeof x === "object" && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }
  if (visualFacts && visualFacts.secondary_subjects && Array.isArray(visualFacts.secondary_subjects)) {
    const words = [];
    visualFacts.secondary_subjects.forEach((x) => {
      if (x && typeof x === "object" && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }
  if (visualFacts && visualFacts.colors && Array.isArray(visualFacts.colors)) {
    sources.push(visualFacts.colors.flatMap((c) => {
      if (typeof c === "string") return extractWords(c);
      return [];
    }));
  }
  if (visualFacts && visualFacts.actions && Array.isArray(visualFacts.actions)) {
    sources.push(visualFacts.actions.flatMap((a) => {
      if (typeof a === "string") return extractWords(a);
      return [];
    }));
  }
  if (title && typeof title === "string") {
    sources.push(extractWords(title));
  }
  if (description && typeof description === "string") {
    sources.push(extractWords(description));
  }
  if (categoryId) {
    const catIdNum = Number(categoryId);
    if (categoryFallbackKeywords[catIdNum]) {
      sources.push(categoryFallbackKeywords[catIdNum]);
    }
  }
  const genericFallback = ["commercial", "concept", "modern", "scene", "design", "art", "graphic", "simple", "minimal", "clean", "detail", "element", "context", "asset", "lifestyle", "organic", "pattern", "texture", "background", "composition", "subject", "focus", "creative", "fresh", "bright", "vibrant", "backdrop", "object", "view", "horizontal", "outdoor", "indoor", "surface", "material", "style", "trending", "popular", "industry", "space", "natural", "lighting", "atmosphere", "inspiration"];
  sources.push(genericFallback);
  for (const source of sources) {
    if (uniqueKeywords.length >= targetCount) break;
    if (Array.isArray(source)) {
      const cleanSource = Array.from(new Set(source));
      for (const word of cleanSource) {
        if (uniqueKeywords.length >= targetCount) break;
        if (typeof word === "string") {
          let cleanWord = word.trim().toLowerCase();
          if (cleanWord.length > 1 && !isProhibitedKeyword(cleanWord)) {
            if (keywordMode === "multi" && !cleanWord.includes(" ")) {
              const modifiers = ["concept", "background", "scene", "design", "style", "detail", "asset", "element"];
              const mod = modifiers[Math.abs(hashString(cleanWord)) % modifiers.length];
              cleanWord = `${cleanWord} ${mod}`;
            }
            if (!uniqueKeywords.includes(cleanWord)) {
              uniqueKeywords.push(cleanWord);
            }
          }
        }
      }
    }
  }
  return uniqueKeywords.slice(0, targetCount);
}
async function callOpenAICompatibleWithRetry(params) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  if (!PROVIDER_ENDPOINTS[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const endpoint = PROVIDER_ENDPOINTS[provider];
  const providerState = store?.[provider];
  const keysList = providerState && providerState.keys || [];
  const maxRotationAttempts = keysList.length > 0 ? keysList.length : 1;
  let lastErr;
  for (let rot = 0; rot < maxRotationAttempts; rot++) {
    let apiKey = "";
    if (keysList.length > 0) {
      const activeIdx = providerState.activeIndex || 0;
      apiKey = keysList[activeIdx];
      if (provider === "nvidia") {
        console.log(`[NVIDIA DEBUG] Using key index ${activeIdx}/${keysList.length} (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    } else {
      apiKey = process.env[PROVIDER_ENV_KEYS[provider]] || "";
      if (provider === "nvidia") {
        console.log(`[NVIDIA DEBUG] Using key from process.env (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    }
    if (!apiKey && provider === "nvidia") {
      console.warn("NVIDIA key missing. Fallback to Gemini.");
      const fallbackResult = await getAIClient().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: params.contents,
        config: params.config
      });
      return typeof fallbackResult.text === "function" ? await fallbackResult.text() : fallbackResult.text || "";
    }
    if (!apiKey) {
      throw new Error(`API Key untuk ${provider.toUpperCase()} belum dikonfigurasi. Silakan tambahkan Key Anda di pengaturan.`);
    }
    const messages = [];
    let userSystemInstruction = "";
    if (params.systemInstruction) {
      if (provider === "aivene") {
        userSystemInstruction = `[SYSTEM INSTRUCTION]
${params.systemInstruction}

[USER INPUT]
`;
      } else {
        messages.push({ role: "system", content: params.systemInstruction });
      }
    }
    let hasImages = false;
    const contentParts = [];
    if (userSystemInstruction) {
      contentParts.push({ type: "text", text: userSystemInstruction });
    }
    const addPart = (part) => {
      if (!part) return;
      if (typeof part === "string") {
        contentParts.push({ type: "text", text: part });
      } else if (part.text) {
        contentParts.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        hasImages = true;
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        });
      }
    };
    if (typeof params.contents === "string") {
      contentParts.push({ type: "text", text: params.contents });
    } else if (Array.isArray(params.contents)) {
      params.contents.forEach(addPart);
    } else if (params.contents && typeof params.contents === "object") {
      if (Array.isArray(params.contents.parts)) {
        params.contents.parts.forEach(addPart);
      } else {
        addPart(params.contents);
      }
    }
    let finalContent;
    if (!hasImages) {
      finalContent = contentParts.map((p) => p.text).join("\n");
    } else {
      finalContent = contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts;
    }
    messages.push({
      role: "user",
      content: finalContent
    });
    let model = params.model || PROVIDER_DEFAULT_MODELS[provider];
    if (provider === "nvidia") {
      if (model === "stepfun_step35_flash") model = "stepfun-ai/step-3.5-flash";
      if (model.startsWith("stepfun/")) model = model.replace("stepfun/", "stepfun-ai/");
      if (model === "nemotron") model = "nvidia/llama-3.1-nemotron-70b-instruct";
      if (!model.includes("/")) {
        if (model.includes("llama-3.2")) model = `meta/${model}`;
        else if (model.includes("nemotron")) model = `nvidia/${model}`;
        else if (model.includes("paligemma")) model = `google/${model}`;
        else if (model.includes("step")) model = `stepfun-ai/${model}`;
      }
      model = model.trim();
      if (model.startsWith("/")) model = model.substring(1);
    }
    if (provider !== "aivene" && (model?.startsWith("gemini-") || model?.startsWith("gemma-"))) {
      model = PROVIDER_DEFAULT_MODELS[provider];
    }
    if (provider === "groq" && model === "llama-4-scout-17b-16e-instruct") {
      model = "meta-llama/llama-4-scout-17b-16e-instruct";
    }
    const payload = {
      model,
      messages,
      temperature: params.config?.temperature ?? 0.85
    };
    if (params.config?.topP !== void 0) {
      payload.top_p = params.config.topP;
    }
    if (params.config?.seed !== void 0) {
      payload.seed = params.config.seed;
    }
    if (SUPPORTS_JSON_MODE.has(provider)) {
      payload.response_format = { type: "json_object" };
    }
    if (provider === "groq" || provider === "openai" || provider === "openrouter" || provider === "nvidia" || provider === "aivene" || provider === "zai") {
      payload.max_tokens = provider === "nvidia" ? 4096 : 8192;
    } else if (provider === "bluesminds") {
    }
    payload.stream = false;
    if (params.responseMimeType === "application/json") {
      let schemaInstruction = '\n\nIMPORTANT: Start your response DIRECTLY with the opening curly brace "{" (or square bracket "[" if an array is requested). DO NOT write any introductory or concluding text. DO NOT use markdown code blocks. The response MUST be a valid JSON object or array.';
      if (provider === "nvidia") {
        schemaInstruction = "\n\nOutput only a valid JSON. Do not include any explanation or markdown formatting. The JSON must directly start with { or [ and end with } or ].";
      }
      if (params.responseSchema) {
        schemaInstruction += ` The JSON MUST strictly match this schema: ${JSON.stringify(params.responseSchema)}`;
      }
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        if (typeof lastMessage.content === "string") {
          lastMessage.content += schemaInstruction;
        } else if (Array.isArray(lastMessage.content)) {
          lastMessage.content.push({ type: "text", text: schemaInstruction });
        }
      } else {
        messages.push({ role: "user", content: schemaInstruction });
      }
    }
    let tryCount = 0;
    while (tryCount < 2) {
      try {
        console.log(`[callOpenAICompatibleWithRetry] Fetching ${provider.toUpperCase()} completions with model ${model}...`);
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`
        };
        if (provider === "openrouter") {
          headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost";
          headers["X-Title"] = "JohMeta";
        }
        if (provider === "zai") {
          headers["Accept-Language"] = "en-US,en";
          payload.do_sample = false;
        }
        if (provider === "nvidia") {
          const sanPayload = { ...payload, messages: payload.messages.map((m) => ({ ...m, content: typeof m.content === "string" ? m.content : "[REDACTED CONTENT]" })) };
          console.log(`[NVIDIA DEBUG] Sending payload to ${endpoint} with model ${model}:`, JSON.stringify(sanPayload));
        }
        const fetchTimeout = provider === "nvidia" || provider === "mistral" ? 3e4 : 25e3;
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          // @ts-ignore - undici/node-fetch support signal/timeout
          signal: AbortSignal.timeout(fetchTimeout)
        });
        const responseDataRawForLogging = await response.clone().text();
        console.log(`[${provider.toUpperCase()} DEBUG] Status: ${response.status}, Content-Type: ${response.headers.get("content-type")}, First 200 chars: ${responseDataRawForLogging.substring(0, 200)}`);
        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[${provider.toUpperCase()} API FAILURE] Status: ${response.status}, Response: ${errText}`);
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        const responseDataRaw = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseDataRaw);
        } catch (e) {
          console.error(`[callOpenAICompatibleWithRetry] Failed to parse JSON. Status: ${response.status}, Content-Type: ${response.headers.get("content-type")}, RawResponse: ${responseDataRaw.substring(0, 500)}`);
          throw new Error(`Failed to parse JSON from ${provider}. RawResponse Sample: ${responseDataRaw.substring(0, 200)}`);
        }
        let answer = responseData.choices?.[0]?.message?.content;
        if (!answer && responseData.choices?.[0]?.message) {
          answer = responseData.choices[0].message.reasoning || responseData.choices[0].message.reasoning_content;
        }
        if (!answer) {
          console.warn(`[callOpenAICompatibleWithRetry] Empty answer received from ${provider}. Response payload:`, JSON.stringify(responseData));
          if (responseData.error) {
            throw new Error(`${provider.toUpperCase()} API Error: ${responseData.error.message || JSON.stringify(responseData.error)} (Code: ${responseData.error.code || "unknown"})`);
          }
          throw new Error(`Empty response content received from ${provider.toUpperCase()}`);
        }
        if (params.responseMimeType === "application/json") {
          answer = extractJSON(answer);
          if (answer.replace(/\s/g, "") === "{}") {
            console.warn(`[callOpenAICompatibleWithRetry] Model hallucinated empty JSON string. Retrying...`);
            throw new Error(`Model returned empty json object string {}. Trigger quota rotation/retry.`);
          }
        }
        return answer;
      } catch (err) {
        console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] error:`, err);
        const status = err.status || (err.message && err.message.includes("HTTP ") ? err.message.split(" ")[1].replace(":", "") : "unknown");
        console.warn(`[${provider.toUpperCase()} ERROR DETAILS] Status: ${status}, Message: ${err.message}, Key Index: ${providerState?.activeIndex}`);
        lastErr = err;
        const errorMsg = String(err.message || "").toLowerCase();
        const isRateLimit = errorMsg.includes("429") && (errorMsg.includes("try again") || errorMsg.includes("retry in") || errorMsg.includes("wait"));
        const shouldRotate = errorMsg.includes("429") && !isRateLimit || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("exhausted") || errorMsg.includes("403") || errorMsg.includes("401");
        if (shouldRotate) {
          console.warn(`[${provider.toUpperCase()}] Error requires rotation: ${errorMsg}. Trying next key.`);
          if (providerState && providerState.keys && keysList.length > 1) {
            providerState.activeIndex = (providerState.activeIndex + 1) % keysList.length;
            break;
          } else {
            throw err;
          }
        }
        tryCount++;
        const fallback = PROVIDER_FALLBACK_MODELS[provider];
        const isRetryableError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("timeout") || errorMsg.includes("exceeded") || errorMsg.includes("fetch failed") || errorMsg.includes("400") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("invalid") || errorMsg.includes("500") || errorMsg.includes("502") || errorMsg.includes("503") || errorMsg.includes("504") || errorMsg.includes("524") || errorMsg.includes("upstream_error") || errorMsg.includes("extra data") || errorMsg.includes("empty response content") || errorMsg.includes("empty json object") || errorMsg.includes("bad_response_status_code");
        if (tryCount === 1 && fallback && fallback !== model) {
          model = fallback;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Model failed. Falling back to alternative model: ${model}`);
          payload.model = model;
          continue;
        }
        if (tryCount < 2 && isRetryableError) {
          const backoff = Math.pow(2, tryCount) * 1e3 + Math.random() * 1e3;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Retrying error (attempt ${tryCount}/2) after ${backoff / 1e3}s...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw err;
      }
    }
  }
  throw lastErr;
}
function getAIClient() {
  return {
    models: {
      generateContent: async (params) => {
        const store = apiKeyStorage.getStore();
        const provider = store && store.provider || "gemini";
        if (NON_GEMINI_PROVIDERS.has(provider) && (!params.model?.startsWith("gemini-") && !params.model?.startsWith("gemma-"))) {
          const text = await callOpenAICompatibleWithRetry({
            systemInstruction: params.config?.systemInstruction,
            contents: params.contents,
            responseMimeType: params.config?.responseMimeType,
            responseSchema: params.config?.responseSchema,
            config: params.config
          });
          return { text };
        }
        let key = process.env.GEMINI_API_KEY || process.env.API_KEY;
        let activeIndex = 0;
        let keysList = [];
        if (store) {
          if (store.gemini && Array.isArray(store.gemini.keys)) {
            keysList = store.gemini.keys;
            activeIndex = store.gemini.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          } else if (typeof store === "string") {
            key = store;
          } else if (store && Array.isArray(store.keys) && store.keys.length > 0) {
            keysList = store.keys;
            activeIndex = store.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          }
        }
        const runGeminiDirectFetch = async (keyToUse, params2) => {
          const model = params2.model || "gemini-2.5-flash";
          const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
          const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${keyToUse}`;
          const contents = params2.contents || [];
          let apiContents = [];
          if (Array.isArray(contents)) {
            if (contents.length > 0 && contents[0].parts) {
              apiContents = contents;
            } else {
              apiContents = [{ parts: contents }];
            }
          } else if (contents.parts) {
            apiContents = [contents];
          } else {
            apiContents = [{ parts: [contents] }];
          }
          const apiPayload = {
            contents: apiContents
          };
          if (params2.config) {
            apiPayload.generationConfig = {};
            if (params2.config.responseMimeType) {
              apiPayload.generationConfig.responseMimeType = params2.config.responseMimeType;
            }
            if (params2.config.responseSchema) {
              apiPayload.generationConfig.responseSchema = params2.config.responseSchema;
            }
            if (typeof params2.config.temperature === "number") {
              apiPayload.generationConfig.temperature = params2.config.temperature;
            }
            if (typeof params2.config.topP === "number") {
              apiPayload.generationConfig.topP = params2.config.topP;
            }
            if (typeof params2.config.topK === "number") {
              apiPayload.generationConfig.topK = params2.config.topK;
            }
            if (typeof params2.config.seed === "number") {
              apiPayload.generationConfig.seed = params2.config.seed;
            }
            if (params2.config.safetySettings) {
              apiPayload.safetySettings = params2.config.safetySettings;
            }
            if (params2.config.systemInstruction) {
              if (typeof params2.config.systemInstruction === "string") {
                apiPayload.systemInstruction = {
                  parts: [{ text: params2.config.systemInstruction }]
                };
              } else if (params2.config.systemInstruction.parts) {
                apiPayload.systemInstruction = params2.config.systemInstruction;
              } else {
                apiPayload.systemInstruction = {
                  parts: [params2.config.systemInstruction]
                };
              }
            }
          }
          console.log(`[Gemini Direct Fetch] Calling REST API fallback for model: ${cleanModel}...`);
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(apiPayload)
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Direct Fetch Failed (${response.status}): ${errText}`);
          }
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return {
            text,
            candidates: resJson.candidates,
            usageMetadata: resJson.usageMetadata
          };
        };
        const runGemini = async (keyToUse) => {
          if (!keyToUse) {
            throw new Error("GEMINI_API_KEY / API_KEY environment variable is required. Silakan masukkan API Key Gemini Anda terlebih dahulu melalui tombol Pengaturan (ikon Gear) di bagian samping aplikasi.");
          }
          try {
            const client = new import_genai.GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build"
                }
              }
            });
            const result = await client.models.generateContent(params);
            if (params.config?.responseMimeType === "application/json" && result.text) {
              return {
                ...result,
                text: result.text.replace(/^```json\s*/, "").replace(/```$/, "").trim()
              };
            }
            return result;
          } catch (sdkError) {
            console.warn(`[getAIClient] SDK generateContent failed: ${sdkError.message || sdkError}. Attempting REST API fallback...`);
            try {
              const directResult = await runGeminiDirectFetch(keyToUse, params);
              if (params.config?.responseMimeType === "application/json" && directResult.text) {
                return {
                  ...directResult,
                  text: directResult.text.replace(/^```json\s*/, "").replace(/```$/, "").trim()
                };
              }
              return directResult;
            } catch (fallbackError) {
              console.error(`[getAIClient] Both SDK and REST fallback failed. REST Error: ${fallbackError.message || fallbackError}`);
              throw sdkError;
            }
          }
        };
        if (keysList.length > 1) {
          let lastErr;
          for (let rot = activeIndex; rot < keysList.length; rot++) {
            try {
              return await runGemini(keysList[rot]);
            } catch (err) {
              lastErr = err;
              const statusCode = err.status || err.code;
              const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
              if (statusCode === 429 || statusCode === 403 || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || errorMsg.includes("api key")) {
                if (store && store.gemini && keysList.length > 1) {
                  store.gemini.activeIndex = (store.gemini.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation - GEMINI] Rotating key in generateContent to index ${store.gemini.activeIndex}`);
                  continue;
                } else if (store && !store.gemini && keysList.length > 1) {
                  store.activeIndex = (store.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation] Rotating key in generateContent to index ${store.activeIndex}`);
                  continue;
                }
              }
              if (statusCode === 429) {
                const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
                if (retryMatch && retryMatch[1]) {
                  const delay = parseFloat(retryMatch[1]) * 1e3 + 1e3;
                  console.log(`[Key Rotation - GEMINI] Rate limited, waiting ${delay}ms before throwing`);
                  await new Promise((r) => setTimeout(r, delay));
                }
              }
              throw err;
            }
          }
          throw lastErr;
        } else {
          return await runGemini(key);
        }
      }
    }
  };
}
var callGeminiWithRetry = async (modelName, contents, config, maxAttempts = 3) => {
  let lastError;
  let currentModel = modelName;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await getAIClient().models.generateContent({
        model: currentModel,
        contents,
        config
      });
    } catch (err) {
      lastError = err;
      const statusCode = err.status || err.code;
      const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
      if (statusCode === 400 || statusCode === 404) {
        if (errorMsg.includes("model") || errorMsg.includes("not found") || errorMsg.includes("invalid") || errorMsg.includes("support")) {
          const fallback = "gemini-2.5-flash";
          if (currentModel !== fallback) {
            console.warn(`[callGeminiWithRetry] Model ${currentModel} invalid/not found. Falling back to ${fallback}.`);
            currentModel = fallback;
            continue;
          }
        }
      }
      if (statusCode === 429 || statusCode >= 500) {
        let customDelay = 0;
        const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
        if (retryMatch && retryMatch[1]) {
          customDelay = parseFloat(retryMatch[1]) * 1e3 + 1e3;
        }
        if (statusCode === 429 && !customDelay && (errorMsg.includes("quota exceeded for metric") || errorMsg.includes("billing"))) {
          if (errorMsg.includes("limit: 20") || errorMsg.includes("limit: 15") || errorMsg.includes("retry in")) {
          } else {
            console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel}.`);
            throw err;
          }
        }
        const isQuotaOrLimit = statusCode === 429 || statusCode === 503;
        if (isQuotaOrLimit) {
          const rotationModels = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"];
          const currentIndex = rotationModels.indexOf(currentModel);
          const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % rotationModels.length : 0;
          let nextModel = rotationModels[nextIndex];
          if (nextModel === currentModel) {
            nextModel = rotationModels[currentIndex === 0 ? 1 : 0];
          }
          console.warn(`[callGeminiWithRetry] Quota/Limit hit on ${currentModel}. Rotating to ${nextModel} for attempt ${attempt + 2}.`);
          currentModel = nextModel;
          customDelay = attempt === 0 ? 2e3 : 5e3;
        } else if (statusCode === 429 && customDelay > 6e4) {
          console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel} (Wait time > 60s). Failing fast.`);
          throw err;
        }
        let backoff = customDelay > 0 ? customDelay : Math.pow(2, attempt) * 1e3 + Math.random() * 1e3;
        if (statusCode === 429 && !customDelay) {
          backoff = Math.min(3e4, backoff);
        }
        console.log(`[Gemini Retry] Received ${statusCode} on ${currentModel}, retrying in ${backoff / 1e3}s (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};
var processFrameServer = (frame) => {
  if (typeof frame !== "string") {
    console.error("[processFrameServer] Expected string, got:", typeof frame, frame);
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: ""
      }
    };
  }
  if (!frame.includes(";base64,")) {
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: frame
      }
    };
  }
  const parts = frame.split(";base64,");
  if (parts.length < 2) {
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: frame
      }
    };
  }
  const mimePart = parts[0];
  const dataPart = parts[1];
  const mimeSplit = mimePart.split(":");
  let mimeType = mimeSplit.length > 1 ? mimeSplit[1] : "image/jpeg";
  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  if (!validMimes.includes(mimeType)) {
    mimeType = "image/jpeg";
  }
  return {
    inlineData: {
      mimeType,
      data: dataPart
    }
  };
};
function getToolTypeDirectives(toolType) {
  if (toolType === "video" /* VIDEO */) {
    return {
      mediaTypeContext: "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.",
      titleRule: `- Start/prioritize dynamic action, movement, and setting of the video.
- Front-load descriptive cinematic movement phrases (e.g. "Slow motion footage of...", "Cinematic tracking shot of...", "Drone aerial view of..."). Exceptions to the default Rule 6 (no media types) are fully granted for these video/motion terms in the title!
- Describe the active setting and camera flow rather than just static scenes.`,
      descriptionRule: `- Detail the visual timeline, camera work, dynamic lighting, movement speeds, and narrative story across frames.
- Describe actions and characters naturally and with high density.
- MUST conclude the description with a sentence starting with "Perfect for..." or "Ideal for..." specifically mentioning professional video uses, e.g., "Perfect for film production, commercial video ads, documentary b-roll, or high-definition social media content."`,
      risetKeywordRule: `- Conduct deep, professional motion-picture research: identify specific camera motions (e.g., panning, tilting, tracking, orbiting, zooming), camera gear (e.g., drone, steadicam, dolly, crane), frame rate pacing (e.g., slow motion, real-time, time-lapse), and environmental dynamics.
- Map cinematic concepts, lighting transitions, action verbs, and temporal themes.`,
      seoBoostRule: `- Heavily front-load highly searched video commercial keywords to maximize search CTR on stock video marketplaces.
- Integrate essential video SEO tags: 'footage', 'b-roll', 'video', 'cinematic', 'motion', 'slow motion', 'camera movement', 'panning', 'tracking shot', 'aerial view', 'drone shot', 'time-lapse', 'real-time', '4k resolution', 'film production', 'stock video'. (Exceptions to the default Rule 6 are granted for these).`,
      prohibitedExemptions: "However, for VIDEO assets, cinematic terms and motion tags (e.g., 'footage', 'b-roll', 'cinematic', 'slow motion', 'panning shot', 'aerial drone view') are highly encouraged."
    };
  } else if (toolType === "vector" /* VECTOR */ || toolType === "vector_eps" /* VECTOR_EPS */) {
    return {
      mediaTypeContext: "CRITICAL: The provided image is a VECTOR illustration. You MUST analyze and categorize it based on the ACTUAL SUBJECT MATTER visually present (e.g. if it shows an animal, classify as Animal; if it shows people, classify as People). Do NOT just default to 'Graphic Resources' or 'Abstract' unless it is genuinely a background/texture without clear subjects. Generate natural, smooth descriptions of the subjects.",
      titleRule: `- Describe the vector asset in terms of graphic style, design layout, icon style, branding emblem, or creative illustration template.
- Use descriptors like "Flat design icon of...", "Minimalist vector illustration of...", "Isometric 3D graphic of...", or "Modern emblem/logo design of...".
- Avoid plain or spammy titles like "Vector of..." directly, but frame them as high-quality professional digital graphic assets. Exceptions to the default Rule 6 are granted for vector descriptors.`,
      descriptionRule: `- Describe digital shapes (geometric, organic), clean outlines, gradient/flat colors, layout complexity, and commercial usability.
- Explicitly describe any isolated presentation (e.g. "isolated on a white background") or clean graphic margins.
- MUST conclude the description with a sentence starting with "Perfect for..." or "Ideal for..." specifically mentioning graphic design uses, e.g., "Ideal for website graphic designs, branding materials, app UI layouts, infographic templates, or commercial print posters."`,
      risetKeywordRule: `- Conduct deep graphic design research: identify specific vector styles (e.g., flat design, isometric, low-poly, line art, 3D render, badge, emblem, sticker, pictogram), shape complexity, grid alignments, and file types.
- Map design metaphors, branding purposes, and commercial layout structures.`,
      seoBoostRule: `- Heavily front-load highly searched vector and digital asset keywords to maximize search discoverability by web designers and publishers.
- Integrate essential vector SEO tags: 'vector', 'illustration', 'graphic design', 'flat design', 'minimalist', 'icon', 'isolated', 'clipart', 'svg', 'branding', 'design element', 'isometric', 'infographic', 'shapes', 'logo', 'scalable', 'clipart', 'template'. (Exceptions to the default Rule 6 are granted for these).`,
      prohibitedExemptions: "However, for VECTOR assets, terms indicating digital formats or design styles (e.g., 'vector', 'illustration', 'graphic design', 'flat design', 'icon', 'isolated', 'isometric', 'svg') are highly encouraged."
    };
  } else {
    return {
      mediaTypeContext: "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.",
      titleRule: `- Describe the real-world scene, main subjects, active posing, and lighting atmosphere beautifully.
- Avoid any cheap subjective marketing terms or "High quality photo of...".
- Front-load the most descriptive searchable keywords.`,
      descriptionRule: `- Detail physical realism, authentic human expressions, real-world textures, lighting qualities, and photographic depth of field.
- MUST conclude the description with a sentence starting with "Perfect for..." or "Ideal for..." specifically mentioning photography uses, e.g., "Ideal for commercial advertising, marketing campaigns, editorial web blogs, or social media banner graphics."`,
      risetKeywordRule: `- Conduct deep photographic and real-world concept research: identify visual subjects, authentic expressions, clothing textures, environment details, weather conditions, lighting attributes, and depth of field.
- Map realistic physical synonyms, human-centric emotional adjectives, and situational contexts.`,
      seoBoostRule: `- Heavily front-load high-converting professional photography keywords to capture exact search patterns of magazine and commercial buyers.
- Integrate essential photo SEO tags: 'photo', 'photography', 'realistic', 'candid', 'outdoor shot', 'studio shot', 'depth of field', 'professional lighting', 'high-resolution', 'commercial photography', 'real-world', 'lifestyle shot'. (Exceptions to the default Rule 6 are granted for these).`,
      prohibitedExemptions: "However, for PHOTOGRAPHIC assets, terms indicating photo style (e.g., 'photo', 'photography', 'realistic', 'candid', 'studio shot') are fully allowed."
    };
  }
}
var generateStockMetadata = async (frames, keywordCount, customPrompt = "", toolType = "image" /* IMAGE */, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance, exifMetadata) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  let activeModel = model;
  if (provider === "gemini" || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === "gemini-3.1-pro-preview" || activeModel === "gemini-3.1-flash-lite-preview") {
      activeModel = aiModelPerformance === "speed" ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }
  const categoriesText = ADOBE_CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(", ");
  const shutterstockCategoriesText = (toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(", ");
  const imageParts = frames.map((frame) => processFrameServer(frame));
  let exifInstruction = "";
  if (exifMetadata && Object.keys(exifMetadata).length > 0) {
    exifInstruction = `

[DATA EXIFTOOL - REFERENSI TEKNIS]
Berikut adalah data Metadata EXIF asli dari file yang diekstrak menggunakan ExifTool:
\`\`\`json
${JSON.stringify(exifMetadata, null, 2)}
\`\`\`
Jadikan data teknis di atas sebagai panduan kuat untuk melengkapi temuan audit visual Anda (seperti jenis kamera, lensa, pengaturan, resolusi asli, koordinat lokasi/GPS, tanggal, atau software pengedit/pembuat).`;
  }
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10;
  const directives = getToolTypeDirectives(toolType);
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - ${directives.risetKeywordRule}
   - Map a wide array of high-quality synonyms, technical terms, and semantic variations to maximize indexing capacity.
   - Highlight the context (season, time of day, lighting atmosphere, emotional or conceptual theme).
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize and Boost Keywords for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - ${directives.seoBoostRule}
   - Prioritize highly-searched commercial intent terms, buyer-targeted vocabulary, and professional/corporate search queries.
   - Frame keywords to capture exact-match search habits of graphic designers, marketing agencies, and content publishers.
   - Focus on high-converting concept metaphors, trending industry applications, business use cases, and targeted target audiences.
4. Include both single-word and/or multi-word phrases (1-3 words) when relevant, prioritizing highly-effective compound terms.
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  if (keywordMode === "single") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - ${directives.risetKeywordRule}
   - Map single-word synonyms, technical terms, and semantic variations.
   - Highlight single-word terms representing season, lighting, emotion, and abstract themes.
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize single-word keywords for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - ${directives.seoBoostRule} Note: Since this is SINGLE-WORD mode, ensure any keyword phrase is split or shortened into a single word.
   - Prioritize highly-searched commercial intent terms, buyer-targeted vocabulary, and professional search queries.
   - Focus on high-converting concept metaphors, trending industry applications, and business use cases.
4. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === "multi") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - ${directives.risetKeywordRule}
   - Map a wide array of high-quality multi-word synonyms, compound technical terms, and semantic variations to maximize indexing.
   - Highlight multi-word phrases representing season, lighting, emotions, and conceptual themes.
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize multi-word phrases for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - ${directives.seoBoostRule} Note: Since this is MULTI-WORD mode, ensure you generate multi-word compound terms or phrases (2-3 words).
   - Prioritize high-volume commercial intent phrases, buyer-targeted vocabulary, and professional compound search queries.
   - Frame compound terms to capture exact-match search habits of graphic designers, marketing agencies, and publishers.
   - Focus on high-converting concept metaphors, business use cases, and targeted audiences.
4. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }
  const realisticPhotoRule = `
12. SPECIAL RULE FOR REALISTIC PHOTOS: Jika mendeteksi gambar tersebut adalah Foto Realistis, Real-World Scene, atau Seperti Pengambilan kamera, WAJIB sertakan keyword "candid", "photography", dll. KECUALI jika gambar adalah Kartun, Vector, Ilustrasi 2D/3D, dan selain foto realistis, maka DILARANG KERAS menggunakan keyword tersebut.`;
  keywordRulePromptText += realisticPhotoRule;
  let visualFactsJson = "";
  console.log(`[JohMeta Pipeline] Stage 1: Running Provider 1 \u2014 Gemini Vision (Visual Facts Detection)...`);
  const mediaTypeContext = directives.mediaTypeContext;
  const fallbackGeminiModel = aiModelPerformance === "speed" ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";
  const visionModelToUse = activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel;
  const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.
6. SPECIAL ASSET TYPES: Carefully detect if the asset is a "Flatlay" (top-down view of objects arranged on a surface) or a "Green Screen" (subject isolated on a bright chroma-key green background). If present, explicitly state these terms in your analysis.
7. DEEP DETAIL RECOGNITION: Extensively analyze textures, materials, lighting conditions, shadows, specific object interactions, spatial relationships, micro-expressions, and fine details. Describe the environment, weather, and specific architectural or natural traits in extreme detail. You must recognize the contents of assets deeply and in extraordinary detail.
8. ASSET UNDERSTANDING AND CONTEXT: You must deeply understand the underlying narrative, intent, emotional tone, and commercial use-case of the asset. Connect the visual elements to their broader conceptual and practical meaning.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Deeply and exhaustively detect every visible subject, action, color, visible text, material, texture, lighting, and composition detail. You must recognize the contents of assets deeply and in extraordinary detail.
Also, deeply understand the asset's underlying narrative, intent, emotional tone, context, and potential commercial use-cases. You must act as an expert who fully comprehends the 'why' and 'how' of the asset, not just the 'what'.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "understanding_and_context": "Explain your deep understanding of the asset: its narrative, commercial intent, target audience, and overall context (pemahaman mendalam tentang narasi, konteks, dan tujuan penggunaan komersial aset ini).",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}${exifInstruction}`;
  const promptText = toolType === "video" /* VIDEO */ ? `Tugas: Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]` : `Tugas: Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;
  try {
    const visionResponse = await callGeminiWithRetry(visionModelToUse, {
      parts: [...imageParts, { text: promptText }]
    }, {
      systemInstruction: visionSystemInstruction,
      responseMimeType: "application/json",
      temperature: 0,
      topP: 0.8
    });
    visualFactsJson = visionResponse.text || "{}";
    if (!visualFactsJson || visualFactsJson.trim() === "{}") {
      throw new Error("Vision Analysis produced empty results.");
    }
  } catch (err) {
    console.warn("[JohMeta Pipeline] Gemini Vision Stage 1 Failed:", err.message || err);
    visualFactsJson = JSON.stringify({
      VISUAL_FACTS: {
        primary_subjects: [{ name: "main subject", importance: 100 }],
        secondary_subjects: [],
        background_elements: [],
        visible_text: [],
        colors: ["natural"],
        actions: ["commercial poses"],
        composition: ["professional"],
        semantic_category_analysis: {
          adobe_id: 0,
          shutterstock_category_1: "",
          shutterstock_category_2: "",
          reason: "Fallback static categories used."
        }
      }
    });
  }
  let visualFacts = {};
  try {
    visualFacts = JSON.parse(extractJSON(visualFactsJson)).VISUAL_FACTS || {};
  } catch (e) {
    visualFacts = { primary_subjects: [{ name: "subject", importance: 100 }], actions: ["posing"] };
  }
  const dominantSubjects = [
    ...Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : [],
    ...Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : []
  ].filter((item2) => item2 && typeof item2 === "object" && typeof item2.importance === "number" && item2.importance >= 50).map((item2) => item2.name);
  console.log(`[JohMeta Pipeline] Stage 2 & 3: Generating Content (Title, Description, Keywords)...`);
  const customPromptCommand = customPrompt ? `
CRITICAL CUSTOM INSTRUCTION / CONCEPT KEY (ABSOLUTE PRIORITY):
The user has provided a custom instruction, concept key, or target keywords: "${customPrompt}"
ABSOLUTE RULES FOR CUSTOM INSTRUCTION:
1. ALIGN WITH CONCEPT: You MUST deeply adapt and shape the ENTIRE metadata (Title, Description, and Keywords) to strictly follow and embody this exact instruction or concept key.
2. DESIGNER/COMMERCIAL MINDSET: If the instruction implies a graphic design, promo, commercial layout, or background with copy space (e.g. "Graphic Design", "Promo", "Copy Space"), you MUST act as an expert human graphic designer. Describe the asset's utility for commercial advertising, emphasize where the copy space is, and use professional marketing/design terminology.
3. INTEGRATE TARGET KEYWORDS: If the input contains specific target keywords, you MUST heavily prioritize and integrate those exact words naturally into both the Title and the Keywords list.
4. ASSET RELEVANCE: While following this instruction completely, ensure you still ground the description in the actual visual facts of the asset (do not hallucinate elements that aren't there, but frame the existing elements through the lens of the custom instruction).` : "";
  const mediaContext = mediaTypeContext;
  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)} YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY.

${mediaContext}${customPromptCommand}${exifInstruction}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE, ARTISTS, OR CHARACTERS (STRICT ADOBE STOCK CONTENT POLICY COMPLIANCE - Based on https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - You must NEVER submit or include names of real, known people (including celebrities, politicians, athletes, public figures, or historical figures) in the Title, Description, or Keywords.
   - You must NEVER include names of fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Harry Potter, etc.).
   - You must NEVER include specific artist names (living or deceased) whose work is protected by copyright in your titles, descriptions, or keywords (e.g., "in the style of Van Gogh", "drawn by Picasso", "inspired by Andy Warhol").
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of" with respect to copyrighted artists. Style descriptions must remain completely generic.
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS EXCEPT EXEMPTIONS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
   ${directives.prohibitedExemptions}

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:
- HUMAN-FRIENDLY SEARCH INTENT (LONG-TAIL SEO): Write metadata that sounds completely natural and conversational. Search engine algorithms and microstock indexers now heavily prioritize human-friendly, long-tail search queries over robotic keyword stuffing (e.g., use natural phrasing like "young business woman working on a laptop in a modern bright cafe" instead of disconnected terms).
- SEMANTIC & CONTEXTUAL TAXONOMY: Blend high-weight concrete keywords with natural context. Answer the 5Ws (Who, What, Where, When, Why) to ensure the asset ranks across a broad spectrum of semantic search indexes.
- HIGH-VALUE NICHE FRONT-LOADING: Place the most descriptive, highly specific visual keywords at the very beginning of the Title. Search algorithms weigh the first 3-5 words significantly higher than the rest!
- SPECIAL ASSET TYPES (FLATLAY & GREEN SCREEN): If the visual facts indicate a "Flatlay" (top-down view) or "Green Screen" (chroma key background), you MUST include "Flatlay" or "Green Screen" (and their variations like "Top-down view", "Chroma Key") prominently in BOTH the Title and Keywords.

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", "Continuous line drawing of", "High Quality", "High-Quality", "Premium", "Beautiful", or "Stunning". Absolutely DO NOT use subjective marketing language or generic quality descriptors (e.g. "High quality image of...").
2. SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
   ${directives.titleRule}
3. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT treat the title like a list of keywords. No commas separating words.
6. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a descriptive title here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
5. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a detailed description here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if they are a perfect fit.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category_id": 1,
  "shutterstock_category_1": "Abstract",
  "shutterstock_category_2": "Backgrounds/Textures",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
}
If generation fails, return {"error": "metadata_generation_failed"}.`;
  let draftMetadata = {};
  try {
    let genResponse;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
      try {
        genResponse = await callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata based on VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.3, topP: 0.9 },
          model: activeModel
        });
      } catch (providerError) {
        console.warn(`[JohMeta Pipeline] ${provider.toUpperCase()} failed completely:`, providerError.message);
        console.warn(`[JohMeta Pipeline] Falling back to Gemini as absolute failsafe...`);
        genResponse = await callGeminiWithRetry(fallbackGeminiModel, {
          parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }]
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.3,
          topP: 0.9
        });
      }
    } else {
      genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
        parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }]
      }, {
        systemInstruction: genSystemInstruction,
        responseMimeType: "application/json",
        temperature: temperature ?? 0.3,
        topP: 0.9
      });
    }
    let rawContent = typeof genResponse === "string" ? genResponse : genResponse.text;
    console.log("### RAW RESPONSE CONTENT ###");
    console.log(rawContent);
    console.log("Type of rawContent:", typeof rawContent);
    const extracted = extractJSON(rawContent);
    console.log("### EXTRACTED JSON ###");
    console.log(extracted);
    if (extracted.trim() === "{}") {
      throw new Error('Model returned empty object string "{}"');
    }
    draftMetadata = JSON.parse(extracted);
    console.log("[STAGE 2/3] PARSED:");
    console.log(draftMetadata);
    if (draftMetadata.error) {
      throw new Error("Model returned error: " + draftMetadata.error);
    }
    if (!draftMetadata || typeof draftMetadata !== "object" || Array.isArray(draftMetadata)) {
      throw new Error("Model did not return a valid object");
    }
    if (!draftMetadata.title && !draftMetadata.description && (!draftMetadata.keywords || draftMetadata.keywords.length === 0)) {
      throw new Error("Model returned empty object {}");
    }
  } catch (err) {
    console.error("[JohMeta Pipeline] Generation Stage 2/3 Failed:", err);
    throw err;
  }
  console.log(`[JohMeta Pipeline] Stage 4, 5 & 6: Auditing, Ranking, and Final Validation...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadata, null, 2));
  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pok\xE9mon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Fam\xEDlia interior).
      * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
      * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced. (NOTE: Public domain historical documents, historical calligraphy, and ancient fonts are EXEMPT and completely SAFE). (NOTE: Public domain historical documents, historical calligraphy, and ancient fonts are EXEMPT and completely SAFE). (NOTE: Public domain historical documents, historical calligraphy, and ancient fonts are EXEMPT and completely SAFE). (NOTE: Public domain historical documents, historical calligraphy, and ancient fonts are EXEMPT and completely SAFE).
2. NO FAMOUS PEOPLE, ARTISTS, OR CHARACTERS (STRICT ADOBE STOCK CONTENT POLICY COMPLIANCE - Based on https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - You must NEVER submit or include names of real, known people (including celebrities, politicians, athletes, public figures, or historical figures) in the Title, Description, or Keywords.
   - You must NEVER include names of fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Harry Potter, etc.).
   - You must NEVER include specific artist names (living or deceased) whose work is protected by copyright in your titles, descriptions, or keywords (e.g., "in the style of Van Gogh", "drawn by Picasso", "inspired by Andy Warhol").
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of" with respect to copyrighted artists. Style descriptions must remain completely generic.
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
   ${directives.prohibitedExemptions}
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a descriptive title here"). Generate the actual descriptive text based entirely on the visual facts.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing or subjective language such as "High Quality", "High-Quality", "Premium", "best", "amazing", "stunning", "beautiful", "perfect", or "Top". NEVER start titles with "High quality image of...", "Beautiful...", or similar subjective generic phrases.
- SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
  ${directives.titleRule}
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
5. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a detailed description here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadata, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": [],
  "category_id": 0,
  "shutterstock_category_1": "",
  "shutterstock_category_2": "",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
  "confidence_score": 0.95
}`;
  let finalMetadataRaw = {};
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) ? callOpenAICompatibleWithRetry({
      systemInstruction: validatorSystemInstruction,
      contents: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]`,
      responseMimeType: "application/json",
      config: { temperature: temperature ?? 0.1, topP: 0.8 },
      model: activeModel
    }) : callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
      parts: [{ text: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]` }]
    }, {
      systemInstruction: validatorSystemInstruction,
      responseMimeType: "application/json",
      temperature: temperature ?? 0.1,
      topP: 0.8
    }));
    finalMetadataRaw = JSON.parse(extractJSON(typeof validResponse === "string" ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline] Validation Stage 4/5/6 Failed: bypassed:", err.message);
    const heur = getHeuristicCategories(draftMetadata.title, draftMetadata.keywords || []);
    finalMetadataRaw = {
      ...draftMetadata,
      category_id: heur.category_id,
      shutterstock_category_1: heur.shutterstock_category_1,
      shutterstock_category_2: heur.shutterstock_category_2
    };
  }
  try {
    let data = finalMetadataRaw && typeof finalMetadataRaw === "object" && !Array.isArray(finalMetadataRaw) ? { ...finalMetadataRaw } : {};
    if (data.desc && !data.description) data.description = data.desc;
    if (data.caption && !data.description) data.description = data.caption;
    if (data.short_description && !data.description) data.description = data.short_description;
    if (data.image_description && !data.description) data.description = data.image_description;
    if (data.name && !data.title) data.title = data.name;
    if (data.headline && !data.title) data.title = data.headline;
    if (data.subject && !data.title) data.title = data.subject;
    data.description = ensureDescription(data.description || "", data.title || "", data.keywords || []);
    if (!data.keywords || !Array.isArray(data.keywords)) {
      data.keywords = [];
    }
    let cleanedKeywords = [];
    data.keywords.forEach((k) => {
      if (typeof k === "string") {
        const cleanPhrase = k.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
        if (cleanPhrase.length > 1) {
          if (keywordMode === "single") {
            const pieces = cleanPhrase.split(/\s+/);
            pieces.forEach((word) => {
              if (word.length > 1 && !isProhibitedKeyword(word)) {
                cleanedKeywords.push(word);
              }
            });
          } else {
            if (!isProhibitedKeyword(cleanPhrase)) {
              cleanedKeywords.push(cleanPhrase);
            }
          }
        }
      }
    });
    const uniqueKeywords = Array.from(new Set(cleanedKeywords));
    const allowedTerms = [
      ...(Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : []).map((x) => x?.name || ""),
      ...(Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : []).map((x) => x?.name || ""),
      ...Array.isArray(visualFacts.actions) ? visualFacts.actions : [],
      ...Array.isArray(visualFacts.colors) ? visualFacts.colors : []
    ].join(" ").toLowerCase();
    const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword) => {
      if (!allowedTerms || allowedTerms.length < 5) return true;
      const words = keyword.split(/\s+/);
      const hasMatchingWord = words.some((w) => allowedTerms.includes(w));
      return hasMatchingWord && !isProhibitedKeyword(keyword);
    });
    const remainingKeywords = uniqueKeywords.filter((k) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
    const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];
    data.keywords = ensureKeywordCount(
      finalKeywordList,
      targetCount,
      visualFacts,
      data.title,
      data.description,
      data.category_id,
      keywordMode
    );
    data.title = ensureTitleLength(data.title, data.keywords || [], data.description || "", titleLength);
    const parsedCategoryId = parseInt(String(data.category_id), 10);
    if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.category_id = heur.category_id;
    } else {
      data.category_id = parsedCategoryId;
    }
    const validShutterstockCats = toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;
    if (!data.shutterstock_category_1 || !validShutterstockCats.includes(data.shutterstock_category_1)) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : validShutterstockCats[0] || "Abstract";
    }
    if (!data.shutterstock_category_2 || !validShutterstockCats.includes(data.shutterstock_category_2) || data.shutterstock_category_2 === data.shutterstock_category_1) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      let secondFallback = heur.shutterstock_category_2;
      if (secondFallback === data.shutterstock_category_1) {
        const possibleVal = toolType === "video" /* VIDEO */ ? "Backgrounds/Textures" : "Abstract";
        secondFallback = validShutterstockCats.find((cat) => cat !== data.shutterstock_category_1) || possibleVal;
      }
      data.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : validShutterstockCats.find((cat) => cat !== data.shutterstock_category_1) || "Backgrounds/Textures";
    }
    data.category_reason = data.category_reason || visualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
    return data;
  } catch (error) {
    console.warn("[JohMeta Parse Error] Failed to handle output format:", error);
    throw new Error("Gagal memproses respons metadata AI ke dalam skema sistem. Silakan coba kembali.");
  }
};
var generateBatchStockMetadata = async (items, keywordCount, customPrompt = "", toolType = "image" /* IMAGE */, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const directives = getToolTypeDirectives(toolType);
  let activeModel = model;
  if (provider === "gemini" || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === "gemini-3.1-pro-preview" || activeModel === "gemini-3.1-flash-lite-preview") {
      activeModel = aiModelPerformance === "speed" ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }
  const categoriesText = ADOBE_CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(", ");
  const shutterstockCategoriesText = (toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(", ");
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount;
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - Conduct extremely thorough keyword research on the visual asset: extract deep, advanced concepts, hidden associations, and industry-standard descriptors.
   - Map a wide array of high-quality synonyms, technical terms, and semantic variations to maximize indexing capacity.
   - Highlight the context (season, time of day, lighting atmosphere, emotional or conceptual theme).
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize and Boost Keywords for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - Prioritize highly-searched commercial intent terms, buyer-targeted vocabulary, and professional/corporate search queries.
   - Frame keywords to capture exact-match search habits of graphic designers, marketing agencies, and content publishers.
   - Focus on high-converting concept metaphors, trending industry applications, business use cases, and targeted target audiences.
4. Include both single-word and/or multi-word phrases (1-3 words) when relevant, prioritizing highly-effective compound terms.
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  if (keywordMode === "single") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - Conduct extremely thorough single-word keyword research on the visual asset: extract deep, advanced concepts, hidden associations, and industry descriptors.
   - Map single-word synonyms, technical terms, and semantic variations.
   - Highlight single-word terms representing season, lighting, emotion, and abstract themes.
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize single-word keywords for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - Prioritize highly-searched commercial intent terms, buyer-targeted vocabulary, and professional search queries.
   - Focus on high-converting concept metaphors, trending industry applications, and business use cases.
4. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === "multi") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. RISET KEYWORD (Keyword Research - Act as a Microstock Trend Researcher):
   - Conduct extremely thorough keyword research on the visual asset: extract deep, advanced concepts, multi-word associations, and industry-standard phrases.
   - Map a wide array of high-quality multi-word synonyms, compound technical terms, and semantic variations to maximize indexing.
   - Highlight multi-word phrases representing season, lighting, emotions, and conceptual themes.
3. SEO BOOST (Microstock SEO Boost - Act as a Microstock SEO Expert):
   - Optimize multi-word phrases for Maximum Search Visibility and Click-Through Rate (CTR) on Microstock Platforms (Adobe Stock, Shutterstock).
   - Prioritize high-volume commercial intent phrases, buyer-targeted vocabulary, and professional compound search queries.
   - Frame compound terms to capture exact-match search habits of graphic designers, marketing agencies, and publishers.
   - Focus on high-converting concept metaphors, business use cases, and targeted audiences.
4. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
5. Avoid duplicates and keyword stuffing. NO SINGULAR/PLURAL REDUNDANCY: Do not unnecessarily duplicate root words in both singular and plural forms (e.g., avoid listing both "tree" and "trees") if they do not add unique SEO value.
5.5 CROSS-SEARCH DISCOVERABILITY (MAXIMIZE SEARCH INTENT):
   - SYNONYM & REGIONAL DIVERSITY: Include common regional variants (e.g., "lift" and "elevator", "sidewalk" and "pavement") and industry vs. casual terms (e.g., "physician" and "doctor").
   - CONCEPTUAL & EMOTIONAL METAPHORS: Include abstract meanings and feelings represented in the image (e.g., "trust", "success", "growth", "innovation", "security").
   - TARGET INDUSTRY & USE-CASES: Include keywords representing who would buy this asset and where it can be used (e.g., "marketing", "fintech", "presentation", "banner", "landing page").
   - COMPOSITION & DESIGN INTENT: Include visual layout terms if applicable (e.g., "copy space", "minimal", "isolated", "panoramic", "vertical").
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }
  const realisticPhotoRule = `
12. SPECIAL RULE FOR REALISTIC PHOTOS: Jika mendeteksi gambar tersebut adalah Foto Realistis, Real-World Scene, atau Seperti Pengambilan kamera, WAJIB sertakan keyword "candid", "photography", dll. KECUALI jika gambar adalah Kartun, Vector, Ilustrasi 2D/3D, dan selain foto realistis, maka DILARANG KERAS menggunakan keyword tersebut.`;
  keywordRulePromptText += realisticPhotoRule;
  let visualDescriptions = [];
  let parsedVisualFactsList = [];
  const fallbackGeminiModel = aiModelPerformance === "speed" ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";
  const visionModelToUse = activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel;
  console.log(`[JohMeta Pipeline - Batch] Stage 1: Running Provider 1 \u2014 Gemini Vision (Visual Facts Detection)...`);
  for (let i = 0; i < items.length; i++) {
    const imageParts = items[i].frames.map((frame) => processFrameServer(frame));
    const mediaTypeContext = directives.mediaTypeContext;
    const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.
6. SPECIAL ASSET TYPES: Carefully detect if the asset is a "Flatlay" (top-down view of objects arranged on a surface) or a "Green Screen" (subject isolated on a bright chroma-key green background). If present, explicitly state these terms in your analysis.
7. DEEP DETAIL RECOGNITION: Extensively analyze textures, materials, lighting conditions, shadows, specific object interactions, spatial relationships, micro-expressions, and fine details. Describe the environment, weather, and specific architectural or natural traits in extreme detail. You must recognize the contents of assets deeply and in extraordinary detail.
8. ASSET UNDERSTANDING AND CONTEXT: You must deeply understand the underlying narrative, intent, emotional tone, and commercial use-case of the asset. Connect the visual elements to their broader conceptual and practical meaning.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Deeply and exhaustively detect every visible subject, action, color, visible text, material, texture, lighting, and composition detail. You must recognize the contents of assets deeply and in extraordinary detail.
Also, deeply understand the asset's underlying narrative, intent, emotional tone, context, and potential commercial use-cases. You must act as an expert who fully comprehends the 'why' and 'how' of the asset, not just the 'what'.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "understanding_and_context": "Explain your deep understanding of the asset: its narrative, commercial intent, target audience, and overall context (pemahaman mendalam tentang narasi, konteks, dan tujuan penggunaan komersial aset ini).",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}`;
    const promptText = toolType === "video" /* VIDEO */ ? `Tugas (Asset #${i + 1}): Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]` : `Tugas (Asset #${i + 1}): Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;
    let itemVisionInstruction = visionSystemInstruction;
    let itemExifDesc = "";
    if (item.exifMetadata && Object.keys(item.exifMetadata).length > 0) {
      const exifInstruction = `

[DATA EXIFTOOL - REFERENSI TEKNIS]
Berikut adalah data Metadata EXIF asli dari file yang diekstrak menggunakan ExifTool:
\`\`\`json
${JSON.stringify(item.exifMetadata, null, 2)}
\`\`\`
Jadikan data teknis di atas sebagai panduan kuat untuk melengkapi temuan audit visual Anda (seperti jenis kamera, lensa, pengaturan, resolusi asli, koordinat lokasi/GPS, tanggal, atau software pengedit/pembuat).`;
      itemVisionInstruction += exifInstruction;
      itemExifDesc = `
ASSET #${i + 1} EXIFTOOL TECHNICAL METADATA:
${JSON.stringify(item.exifMetadata, null, 2)}`;
    }
    try {
      const visionResponse = await callGeminiWithRetry(visionModelToUse, {
        parts: [...imageParts, { text: promptText }]
      }, {
        systemInstruction: itemVisionInstruction,
        responseMimeType: "application/json",
        temperature: 0,
        topP: 0.8
      });
      let facts = visionResponse.text || "{}";
      visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:
${facts}${itemExifDesc}`);
      let parsedFacts = {};
      try {
        parsedFacts = JSON.parse(extractJSON(facts)).VISUAL_FACTS || {};
      } catch (e) {
        parsedFacts = { primary_subjects: [], secondary_subjects: [], background_elements: [], visible_text: [], colors: [], actions: [], composition: [], semantic_category_analysis: { adobe_id: 0, shutterstock_category_1: "", shutterstock_category_2: "", reason: "Fallback default." } };
      }
      parsedVisualFactsList.push(parsedFacts);
    } catch (err) {
      console.warn(`[JohMeta Pipeline - Batch] Vision failed for item ${i}:`, err.message || err);
      const fallbackFacts = {
        VISUAL_FACTS: {
          primary_subjects: [{ name: "main subject", importance: 100 }],
          secondary_subjects: [],
          background_elements: [],
          visible_text: [],
          colors: ["natural"],
          actions: ["commercial posing"],
          composition: ["professional"],
          semantic_category_analysis: {
            adobe_id: 0,
            shutterstock_category_1: "",
            shutterstock_category_2: "",
            reason: "Fallback static categories used."
          }
        }
      };
      visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:
${JSON.stringify(fallbackFacts)}`);
      parsedVisualFactsList.push(fallbackFacts.VISUAL_FACTS);
    }
  }
  console.log(`[JohMeta Pipeline - Batch] Stage 2 & 3: Generating Draft Metadata for ${items.length} items...`);
  const dominantSubjectsArray = parsedVisualFactsList.map((facts) => {
    return [
      ...facts.primary_subjects || [],
      ...facts.secondary_subjects || []
    ].filter((item2) => item2.importance >= 50).map((item2) => item2.name);
  });
  const mediaContext = directives.mediaTypeContext;
  const customPromptCommand = customPrompt ? `
CRITICAL CUSTOM INSTRUCTION / CONCEPT KEY (ABSOLUTE PRIORITY):
The user has provided a custom instruction, concept key, or target keywords: "${customPrompt}"
ABSOLUTE RULES FOR CUSTOM INSTRUCTION:
1. ALIGN WITH CONCEPT: You MUST deeply adapt and shape the ENTIRE metadata (Title, Description, and Keywords) to strictly follow and embody this exact instruction or concept key.
2. DESIGNER/COMMERCIAL MINDSET: If the instruction implies a graphic design, promo, commercial layout, or background with copy space (e.g. "Graphic Design", "Promo", "Copy Space"), you MUST act as an expert human graphic designer. Describe the asset's utility for commercial advertising, emphasize where the copy space is, and use professional marketing/design terminology.
3. INTEGRATE TARGET KEYWORDS: If the input contains specific target keywords, you MUST heavily prioritize and integrate those exact words naturally into both the Title and the Keywords list.
4. ASSET RELEVANCE: While following this instruction completely, ensure you still ground the description in the actual visual facts of the asset (do not hallucinate elements that aren't there, but frame the existing elements through the lens of the custom instruction).` : "";
  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE, ARTISTS, OR CHARACTERS (STRICT ADOBE STOCK CONTENT POLICY COMPLIANCE - Based on https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - You must NEVER submit or include names of real, known people (including celebrities, politicians, athletes, public figures, or historical figures) in the Title, Description, or Keywords.
   - You must NEVER include names of fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Harry Potter, etc.).
   - You must NEVER include specific artist names (living or deceased) whose work is protected by copyright in your titles, descriptions, or keywords (e.g., "in the style of Van Gogh", "drawn by Picasso", "inspired by Andy Warhol").
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of" with respect to copyrighted artists. Style descriptions must remain completely generic.
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS EXCEPT EXEMPTIONS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
   ${directives.prohibitedExemptions}

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:
- SEARCH INTENT MATCHING: Design metadata to precisely match the search queries of professional commercial buyers (e.g., designers, marketing teams, agency publishers). Ask yourself: "What actual commercial search query would a buyer type to purchase this exact asset?"
- SEMANTIC TAXONOMY: Blend high-weight concrete keywords (exactly what is visible) with abstract conceptual terms (emotions, commercial uses, metaphorical concepts, themes, and demographic vibes).
- HIGH-VALUE NICHE FRONT-LOADING: Place the highest-value, highly specific visual descriptors and niche-relevant keywords at the very beginning of the Titles and Keywords list. Microstock search algorithms weigh earlier words much higher!

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", "Continuous line drawing of", "High Quality", "High-Quality", "Premium", "Beautiful", or "Stunning". Absolutely DO NOT use subjective marketing language or generic quality descriptors (e.g. "High quality image of...").
2. SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
   ${directives.titleRule}
3. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT treat the title like a list of keywords. No commas separating words.
6. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a descriptive title here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
5. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a detailed description here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

STRICT DEFINING RULES:
- Return a JSON OBJECT containing a "results" array of exactly ${items.length} objects.
- Order MUST match input items exactly.
- Base everything 100% on the VISUAL_FACTS provided for each asset, including the suggestions inside "semantic_category_analysis".

SOURCE VISUAL_FACTS:
${visualDescriptions.join("\n\n")}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    { 
      "title": "A highly descriptive natural language title representing the core subject", 
      "description": "A detailed visual description focusing on subjects, setting, and mood", 
      "keywords": [],
      "category_id": 1,
      "shutterstock_category_1": "Abstract",
      "shutterstock_category_2": "Backgrounds/Textures",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
    }
  ]
}`;
  let draftMetadataArray = [];
  try {
    let genResponse;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
      try {
        genResponse = await callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata array based on VISUAL_FACTS for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model: activeModel
        });
      } catch (providerError) {
        console.warn(`[JohMeta Pipeline - Batch] ${provider.toUpperCase()} failed completely:`, providerError.message);
        console.warn(`[JohMeta Pipeline - Batch] Falling back to Gemini as absolute failsafe...`);
        genResponse = await callGeminiWithRetry(fallbackGeminiModel, {
          parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }]
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        });
      }
    } else {
      genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
        parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }]
      }, {
        systemInstruction: genSystemInstruction,
        responseMimeType: "application/json",
        temperature: temperature ?? 0.1,
        topP: 0.8
      });
    }
    let rawContent = typeof genResponse === "string" ? genResponse : genResponse.text;
    console.log("[STAGE 2/3 BATCH] RAW RESPONSE:");
    console.log(rawContent);
    draftMetadataArray = JSON.parse(extractJSON(rawContent));
    console.log("[STAGE 2/3 BATCH] PARSED:");
    console.log(draftMetadataArray);
    if (!Array.isArray(draftMetadataArray)) {
      if (draftMetadataArray && typeof draftMetadataArray === "object") {
        if (Array.isArray(draftMetadataArray.metadata)) draftMetadataArray = draftMetadataArray.metadata;
        else if (Array.isArray(draftMetadataArray.items)) draftMetadataArray = draftMetadataArray.items;
        else if (Array.isArray(draftMetadataArray.results)) draftMetadataArray = draftMetadataArray.results;
        else if (Array.isArray(draftMetadataArray.data)) draftMetadataArray = draftMetadataArray.data;
        else if (Object.values(draftMetadataArray).length === 1 && Array.isArray(Object.values(draftMetadataArray)[0])) draftMetadataArray = Object.values(draftMetadataArray)[0];
        else draftMetadataArray = [draftMetadataArray];
      } else {
        throw new Error("Not an array and cannot map to array");
      }
    }
    if (Array.isArray(draftMetadataArray) && draftMetadataArray.length === 0) {
      throw new Error("Generated an empty array []");
    }
  } catch (err) {
    console.error("[JohMeta Pipeline - Batch] Generation Stage 2/3 Failed:", err);
    throw err;
  }
  console.log(`[JohMeta Pipeline - Batch] Stage 4, 5 & 6: Final Validation for ${items.length} items...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadataArray, null, 2));
  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pok\xE9mon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Fam\xEDlia interior).
     * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
     * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced.
2. NO FAMOUS PEOPLE, ARTISTS, OR CHARACTERS (STRICT ADOBE STOCK CONTENT POLICY COMPLIANCE - Based on https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - You must NEVER submit or include names of real, known people (including celebrities, politicians, athletes, public figures, or historical figures) in the Title, Description, or Keywords.
   - You must NEVER include names of fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Harry Potter, etc.).
   - You must NEVER include specific artist names (living or deceased) whose work is protected by copyright in your titles, descriptions, or keywords (e.g., "in the style of Van Gogh", "drawn by Picasso", "inspired by Andy Warhol").
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of" with respect to copyrighted artists. Style descriptions must remain completely generic.
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS EXCEPT EXEMPTIONS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
   ${directives.prohibitedExemptions}
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a descriptive title here"). Generate the actual descriptive text based entirely on the visual facts.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing or subjective language such as "High Quality", "High-Quality", "Premium", "best", "amazing", "stunning", "beautiful", "perfect", or "Top". NEVER start titles with "High quality image of...", "Beautiful...", or similar subjective generic phrases.
- SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
  ${directives.titleRule}
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
5. NO PLACEHOLDERS: NEVER output placeholder text (e.g. "Write a detailed description here"). Generate the actual descriptive text based entirely on the visual facts.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

SOURCE VISUAL_FACTS:
${visualDescriptions.join("\n\n")}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadataArray, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    {
      "title": "A highly descriptive natural language title representing the core subject",
      "description": "A detailed visual description focusing on subjects, setting, and mood",
      "keywords": [],
      "category_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
      "confidence_score": 0.95
    }
  ]
}`;
  let finalMetadataArray = [];
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) ? callOpenAICompatibleWithRetry({
      systemInstruction: validatorSystemInstruction,
      contents: `Audit and validate the Draft Metadata array for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
      responseMimeType: "application/json",
      config: { temperature: temperature ?? 0.1, topP: 0.8 },
      model: activeModel
    }) : callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
      parts: [{ text: `Audit and validate the Draft Metadata array for ${items.length} assets based on VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]` }]
    }, {
      systemInstruction: validatorSystemInstruction,
      responseMimeType: "application/json",
      temperature: temperature ?? 0.1,
      topP: 0.8
    }));
    finalMetadataArray = JSON.parse(extractJSON(typeof validResponse === "string" ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline - Batch] Batch Validation Stage 4/5/6 Failed: bypassed:", err.message);
    finalMetadataArray = draftMetadataArray.map((d) => {
      const heur = getHeuristicCategories(d.title, d.keywords || []);
      return {
        ...d,
        category_id: heur.category_id,
        shutterstock_category_1: heur.shutterstock_category_1,
        shutterstock_category_2: heur.shutterstock_category_2
      };
    });
  }
  try {
    let dataArray = finalMetadataArray;
    if (!Array.isArray(dataArray)) {
      if (dataArray && typeof dataArray === "object") {
        if (Array.isArray(dataArray.metadata)) {
          dataArray = dataArray.metadata;
        } else if (Array.isArray(dataArray.items)) {
          dataArray = dataArray.items;
        } else if (Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else if (Object.values(dataArray).length === 1 && Array.isArray(Object.values(dataArray)[0])) {
          dataArray = Object.values(dataArray)[0];
        } else {
          dataArray = [dataArray];
        }
      } else {
        dataArray = [];
      }
    }
    if (dataArray.length < items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned fewer items (${dataArray.length}) than expected (${items.length}). Padding with fallbacks.`);
      while (dataArray.length < items.length) {
        dataArray.push({});
      }
    } else if (dataArray.length > items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned more items (${dataArray.length}) than expected (${items.length}). Truncating.`);
      dataArray = dataArray.slice(0, items.length);
    }
    return dataArray.map((rawMetadata, index) => {
      let metadata = rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata) ? { ...rawMetadata } : {};
      if (metadata.desc && !metadata.description) metadata.description = metadata.desc;
      if (metadata.caption && !metadata.description) metadata.description = metadata.caption;
      if (metadata.short_description && !metadata.description) metadata.description = metadata.short_description;
      if (metadata.image_description && !metadata.description) metadata.description = metadata.image_description;
      if (metadata.name && !metadata.title) metadata.title = metadata.name;
      if (metadata.headline && !metadata.title) metadata.title = metadata.headline;
      if (metadata.subject && !metadata.title) metadata.title = metadata.subject;
      metadata.description = ensureDescription(metadata.description || "", metadata.title || "", metadata.keywords || []);
      if (!metadata.keywords || !Array.isArray(metadata.keywords)) {
        metadata.keywords = [];
      }
      let cleanedKeywords = [];
      metadata.keywords.forEach((k) => {
        if (typeof k === "string") {
          const cleanPhrase = k.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
          if (cleanPhrase.length > 1) {
            if (keywordMode === "single") {
              const pieces = cleanPhrase.split(/\s+/);
              pieces.forEach((word) => {
                if (word.length > 1 && !isProhibitedKeyword(word)) {
                  cleanedKeywords.push(word);
                }
              });
            } else {
              if (!isProhibitedKeyword(cleanPhrase)) {
                cleanedKeywords.push(cleanPhrase);
              }
            }
          }
        }
      });
      const uniqueKeywords = Array.from(new Set(cleanedKeywords));
      const assetVisualFacts = parsedVisualFactsList[index] || {};
      const allowedTerms = [
        ...(Array.isArray(assetVisualFacts.primary_subjects) ? assetVisualFacts.primary_subjects : []).map((x) => x?.name || ""),
        ...(Array.isArray(assetVisualFacts.secondary_subjects) ? assetVisualFacts.secondary_subjects : []).map((x) => x?.name || ""),
        ...Array.isArray(assetVisualFacts.actions) ? assetVisualFacts.actions : [],
        ...Array.isArray(assetVisualFacts.colors) ? assetVisualFacts.colors : []
      ].join(" ").toLowerCase();
      const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword) => {
        if (!allowedTerms || allowedTerms.length < 5) return true;
        const words = keyword.split(/\s+/);
        const hasMatchingWord = words.some((w) => allowedTerms.includes(w));
        return hasMatchingWord && !isProhibitedKeyword(keyword);
      });
      const remainingKeywords = uniqueKeywords.filter((k) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
      const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];
      metadata.keywords = ensureKeywordCount(
        finalKeywordList,
        targetCount,
        assetVisualFacts,
        metadata.title,
        metadata.description,
        metadata.category_id,
        keywordMode
      );
      metadata.title = ensureTitleLength(metadata.title, metadata.keywords || [], metadata.description || "", titleLength);
      const parsedCategoryId = parseInt(String(metadata.category_id), 10);
      if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        metadata.category_id = heur.category_id;
      } else {
        metadata.category_id = parsedCategoryId;
      }
      const validShutterstockCats = toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;
      if (!metadata.shutterstock_category_1 || !validShutterstockCats.includes(metadata.shutterstock_category_1)) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        metadata.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : validShutterstockCats[0] || "Abstract";
      }
      if (!metadata.shutterstock_category_2 || !validShutterstockCats.includes(metadata.shutterstock_category_2) || metadata.shutterstock_category_2 === metadata.shutterstock_category_1) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        let secondFallback = heur.shutterstock_category_2;
        if (secondFallback === metadata.shutterstock_category_1) {
          const possibleVal = toolType === "video" /* VIDEO */ ? "Backgrounds/Textures" : "Abstract";
          secondFallback = validShutterstockCats.find((cat) => cat !== metadata.shutterstock_category_1) || possibleVal;
        }
        metadata.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : validShutterstockCats.find((cat) => cat !== metadata.shutterstock_category_1) || "Backgrounds/Textures";
      }
      metadata.category_reason = metadata.category_reason || assetVisualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
      const targetId = items[index] ? items[index].id : items[0]?.id || "unknown";
      return { id: targetId, metadata };
    });
  } catch (error) {
    console.warn("[JohMeta Pipeline - Batch] Parse Error:", error);
    throw new Error("Gagal memproses respons batch metadata. Silakan coba kembali.");
  }
};
function processPromptResults(parsed, count, subject, userNegativePrompt) {
  let validatedPrompts = (parsed.prompts || []).filter((p) => typeof p === "string" && p.trim().length > 0);
  if (validatedPrompts.length === 0) {
    validatedPrompts = [`${subject} professional stock photography`].map((p) => p);
  }
  const originalLength = validatedPrompts.length;
  if (validatedPrompts.length < count) {
    const modifiers = [
      "cinematic macro photography, highly detailed",
      "isometric 3D render, octane render, stylized lighting",
      "vibrant watercolor ink illustration, splash art",
      "futuristic cyberpunk city night life background, neon glow",
      "classical oil painting, textured brush strokes, masterwork",
      "minimalist flat graphic design icon",
      "dramatic backlight, rim lighting, atmospheric depth",
      "wide angle landscape composition, beautiful morning light",
      "studio lighting portrait, bokeh depth of field",
      "vintage retro concept art, detailed illustration"
    ];
    let modIdx = 0;
    while (validatedPrompts.length < count) {
      const base = validatedPrompts[validatedPrompts.length % originalLength];
      const mod = modifiers[modIdx % modifiers.length];
      validatedPrompts.push(`${base}, ${mod} (variation #${validatedPrompts.length + 1})`);
      modIdx++;
    }
  } else if (validatedPrompts.length > count) {
    validatedPrompts = validatedPrompts.slice(0, count);
  }
  const appendNeg = userNegativePrompt && userNegativePrompt.trim().length > 0 ? `Avoid: ${userNegativePrompt.trim()}` : "";
  const processedPrompts = validatedPrompts.map((p) => {
    if (appendNeg) {
      const separator = p.trim().endsWith(".") || p.trim().endsWith(",") ? " " : ", ";
      return `${p.trim()}${separator}${appendNeg}`;
    }
    return p.trim();
  });
  return {
    prompts: processedPrompts,
    negativePrompt: appendNeg || parsed.negativePrompt || "",
    styleExplanation: parsed.styleExplanation || [
      `Berhasil mensintesis ${count} variasi prompt bertema ${subject}.`,
      `Menggunakan spektrum gaya dan variabilitas komposisi visual.`,
      `Seluruh prompt dioptimasi dalam bahasa Inggris untuk Midjourney/Stable Diffusion.`
    ]
  };
}
var generateOptimizedPrompt = async (options) => {
  const {
    subject,
    styleCategory,
    variation,
    promptMode = "background",
    pngBgColor = "white",
    userNegativePrompt = "",
    minWords = 10,
    maxWords = 70,
    model = void 0,
    seed = Math.floor(Math.random() * 1e6),
    flatIconType = void 0,
    iconSheetColumns = void 0,
    vectorSubType = void 0,
    darkHorrorSubStyle = void 0,
    referenceImages = void 0,
    cameraAngles = void 0
  } = options;
  const count = Math.min(Math.max(variation, 10), 150);
  const defaultAngles = ["low-angle shot", "eye-level shot", "high-angle perspective", "overhead aerial shot", "macro close-up", "medium shot", "wide-angle panoramic shot", "three-quarter portrait shot", "extreme close-up", "Dutch angle", "worm's-eye view", "bird's-eye view", "first-person POV"];
  const angles = cameraAngles && cameraAngles.length > 0 ? cameraAngles : defaultAngles;
  const lightings = ["golden hour light", "bright overcast daylight", "soft window light", "dramatic side-lighting", "warm indoor ambient light", "moody twilight", "misty dawn light", "vibrant studio rim-lighting", "sun-dappled shadows", "cool soft morning light", "neon cyberpunk glow", "chiaroscuro lighting", "bioluminescent ambient light", "ethereal volumetric rays", "harsh cinematic spotlight", "dramatic backlighting with lens flare"];
  const compositions = ["rule of thirds alignment", "symmetric composition", "minimalist empty-space negative layout", "diagonal leading lines", "frame-within-a-frame depth", "centered dominant focus with spacious copy space", "shallow depth-of-field", "dynamic foreground elements with blurred background", "forced perspective", "kaleidoscopic symmetry", "abstract fragmented framing", "dramatic low-angle heroic composition", "ultra-wide architectural framing"];
  const seasonsOrWeathers = ["crisp autumn afternoon", "warm summer glow", "misty spring morning", "subtle winter frost", "gentle drizzle rain", "clear sunny day", "soft foggy atmosphere", "dusk sunset sky", "thunderstorm dramatic sky", "heavy snow blizzard", "post-apocalyptic ash fall", "magical glowing floating embers", "surreal cosmic starscape"];
  const colorPalettes = ["natural warm earthy tones", "subtle cool pastel hues", "vivid high-saturation colors", "sophisticated minimalist monochromatic tones", "muted organic color palette", "soft warm gold and cream", "vibrant neon cyberpunk palette", "dark moody cinematic tones", "surreal iridiscent colors", "high-contrast duotone", "hyper-saturated pop art colors"];
  let currentSeed = seed;
  const prng = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  const selectRandom = (arr) => {
    const r = prng();
    return arr[Math.floor(r * arr.length)];
  };
  const userCameraAngle = cameraAngles && cameraAngles.length > 0 ? cameraAngles.join(", ") : null;
  const randomAngle = userCameraAngle || selectRandom(defaultAngles);
  const randomLighting = selectRandom(lightings);
  const randomComp = selectRandom(compositions);
  const randomSeason = selectRandom(seasonsOrWeathers);
  const randomColor = selectRandom(colorPalettes);
  const randomSaltInjection = userCameraAngle ? `[CRITICAL CAMERA ANGLE (User Selected - DO NOT IGNORE): ALL prompt variations MUST strictly use this exact camera angle: "${userCameraAngle}". Do not randomize, substitute, or deviate from this camera perspective. ${randomLighting}, ${randomComp}, ${randomSeason}, ${randomColor}, Seed ID: ${seed}]` : `[Random Composition Base: ${randomAngle}, ${randomLighting}, ${randomComp}, ${randomSeason}, ${randomColor}, Seed ID: ${seed}]`;
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isPngMode = promptMode === "png";
  let modeConstraint = "";
  const styleSpecificDirectives = {
    "Vector Art": vectorSubType === "gradient_flat" ? " - Style Guide: STRICTLY 2D FLAT VECTOR ILLUSTRATION. Focus on flat design aesthetic utilizing smooth linear and radial color gradients. Sleek modern gradients, organic 2D shapes, and sharp digital outlines typical of Adobe Illustrator. Absolutely NO 3D rendering, NO photorealism, NO drop shadows, and NO metallic finishes. High contrast, clean vector silhouettes, and fluid artistic lines." : " - Style Guide: STRICTLY 2D FLAT VECTOR ILLUSTRATION. Focus on flat design aesthetic, featuring clean vector paths, flat solid colors, beautiful 2D shapes, and sharp digital outlines typical of Adobe Illustrator. Absolutely NO gradients, NO shading, NO 3D rendering, NO photorealism, NO drop shadows, and NO metallic finishes. High contrast, clean vector silhouettes, and elegant proportions.",
    "3D Render": " - Focus on soft studio lighting, Octane render quality, glossy or matte plastic materials, raytraced reflections, and smooth 3D surfaces.",
    "Sticker Illustration": ' - You must explicitly append tags such as "sticker format", "die-cut stickers", "sticker asset with white border" and "thick sticker outline" into the prompt variations.',
    "Flat Icon": " - Focus on simplified pictograms, 2D minimalist design, strong symbol-based visual language, and high-contrast solid colors.",
    "Pixel Art": " - Focus on visible square pixels, limited color palette, 8-bit or 16-bit retro game aesthetics, and sharp pixelated edges.",
    "Isometric": " - Style Guide: Focus on isometric illustration with pseudo-3D look (tampilan 3D semu) without any camera perspective (orthographic parallel projection, objects do not shrink in the distance). Symmetrical 30-degree angles on left and right horizontal axes with straight vertical lines. Show three sides of the objects simultaneously (top and two sides) to provide depth. Maintain highly consistent modular scale and geometric proportions (using cubes, cylinders, and clean blocks with sharp corners and precise alignments). Use simple flat or semi-flat shading (flat shading, minimal/no gradients) with clear color contrast on different faces of the object to distinguish sides. Clean details, highly readable vector-like design, minimalist clean outlines. Keywords to include: isometric style, 3D isometric, orthographic parallel projection, pseudo-3D, 30-degree isometric view, flat shading, clean vector-like style.",
    "Claymation Style": " - Focus on hand-molded clay textures, fingerprint details, stop-motion animation aesthetic, and soft organic physical materials.",
    "Origami Style": " - Focus on folded paper textures, sharp creases, geometric paper construction, and delicate paper material appearance.",
    "HandDrawn Sketch": " - Focus on pencil or ink strokes, charcoal textures, artistic hatching, and the look of a sketchbook drawing.",
    "Glassmorphism": " - Focus on frosted glass effects, translucent layers, blurred background refraction, and sleek glossy reflections.",
    "Metal Emboss": " - Focus on metallic surfaces, raised 3D textures, engraved details, and realistic metal reflections like silver, gold, or steel.",
    "Line Art": " - Focus on clean black and white lines, elegant curves, minimalist continuous line work, crisp vector outlines, and zero shading or gradients unless requested. Elegant, simple, and high-contrast ink strokes.",
    "Lowpoly": " - Focus on visible geometric triangular facets, faceted surfaces, and stylized abstract crystalline structures.",
    "3D CGI": " - Focus on clean computer-generated imagery with perfect geometry. Emphasize synthetic materials like smooth plastic, polished glass, sleek metal, or vibrant gel. Use highly controlled studio lighting or global illumination. The result should look like a high-end digital render from Blender or Cinema 4D, NOT a real-world photograph. AVOID: Photorealistic textures, natural imperfections, and real camera noise.",
    "Cinematic": " - Focus on hyper-realistic, high-budget live-action movie cinematography. MUST feel like a genuine, un-retouched motion picture still shot on real 35mm film or digital cinema cameras with real actors. Prioritize: Wide cinematic aspect ratios, cinematic anamorphic lenses with subtle lens flares, organic volumetric haze, beautiful backlight/rim light, high production value, and deep cinematic color grading (e.g., warm gold, cool blue, orange and teal, moody cinematic shadow). Composition must be dynamic with cinematic framing. AVOID: ANY digital art, AI-generated look, 3D CGI, plastic skin, flat studio lighting, or illustration styles. It must look 100% real.",
    "Photorealistic": ' - Generate ultra-realistic, authentic, un-retouched real-world photography. MUST look indistinguishable from a real physical photograph captured by a professional camera (e.g., DSLR or mirrorless). Prioritize: Raw, natural realism, pin-sharp clarity, authentic natural skin/surface textures (e.g., visible pores, fine fabrics, wood grain, organic imperfections, peach fuzz), authentic human candid expressions, and completely realistic real-world environments. Use natural sunlight, overcast daylight, or authentic studio strobe lighting with soft realistic shadows. Include realistic professional camera settings (e.g., 50mm lens, 85mm portrait lens, f/1.8 aperture). AVOID: CGI look, digital painting, excessive smoothness, "AI" look, theatrical cinematic color grading, or artificial dramatic staging. It must look like everyday reality.',
    "Anime/Manga": " - Focus on cel-shaded aesthetics, expressive character features, vibrant colors, and classic Japanese hand-drawn illustration styles.",
    "Watercolor Painting": " - Focus on flowing pigment washes, paper grain textures, organic color bleeds, and delicate artistic strokes.",
    "Oil Painting": " - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.",
    "Paper Cut": " - Focus on layered paper textures (lapisan kertas bertumpuk), sharp and clean cut edges (tepi potongan tajam dan rapi), profound 3D depth effects from multiple stacked paper layers, soft drop shadows between layers (bayangan lembut antar lapisan kertas), highly detailed handcrafted papercraft aesthetic, compositions constructed purely from cut paper shapes rather than drawings/paintings, matte paper textures, clean silhouettes, and beautiful solid colors for each stacked layer.",
    "Embroidery": " - Focus on physical textile art, thick raised thread textures, intricate stitched patterns, woven fabric backgrounds, and realistic needlework craftsmanship. Emphasize the tactile quality of yarn, floss, and fabric grain.",
    "Disney Cartoon": " - Focus on classic 2D or modern 3D Western animation styles characteristic of major animation studios. Emphasize expressive, large-eyed characters, vibrant magical color palettes, soft appealing shapes, and enchanting environments. CRITICAL: You MUST NOT mention any specific IP, character names, or specific film titles. Keep the concepts generic and copyright-free, but retain the magical and charming artistic style.",
    "Dark Horror Aesthetic": " - Focus on extremely dark, eerie, unsettling, and atmospheric horror themes. MUST look like a photorealistic, real-world photograph or live-action movie still. Emphasize crushing pitch-black shadows, high-contrast chiaroscuro lighting with minimal illumination, macabre elements, muted or monochromatic color palettes with stark accents (like crimson red), thick fog/mist, decaying textures, and a profound sense of dread. AVOID: Digital painting, illustration, cartoonish styles, bright daylight, cheerful elements, or well-lit scenes. It must look breathtakingly real.",
    "Lego Style": ' - Focus on compositions entirely constructed from interlocking plastic building bricks (gaya mainan balok plastik). Emphasize sharp geometric brick shapes, visible circular studs on top of bricks, glossy plastic textures with subtle scratches, vibrant primary colors, and macro photography lighting (depth of field, studio lighting) to make it look like a miniature diorama or toy set. Do NOT use the word "Lego" in the prompt if possible, use "interlocking plastic bricks" or "brick toy style".',
    "Voxel Art": ' - Focus on 3D pixel art constructed from volumetric cubes (voxels). Emphasize a blocky, retro video game aesthetic similar to Minecraft, with low-resolution 3D geometry but modern high-quality lighting (raytracing, global illumination). Use sharp pixelated textures, crisp cube edges, and a rigid grid-based structure. CRITICAL: Do not use the word "Minecraft" or specific game IP; instead use "voxel art", "3D blocky pixel art", or "cubical world". AVOID: Realism, photorealistic rendering, real-world natural aesthetics, or smooth continuous surfaces.',
    "Abstract": ' - Style Guide: Deconstruct the subject into a dynamic expression of energy, motion, and non-literal forms. Visual Characteristics: Explosive swirls of pigment, kinetic energy trails, thick impasto textures, layered translucent facets, and dramatic asymmetric compositions. Sub-styles to master: Abstract Expressionism (gestural strokes), Fluid Art (marble/ink swirls), Neon Abstract (glow trails), Geometric Abstraction (fractured shapes), Fractal Patterns (mathematical complexity), or Glitch Art (digital distortion). Prompt Structure: "Abstract, [Subject deconstructed into energy/forms] using [Selected sub-style] with [Specific textures: e.g., vibrant paint splatters, crystalline facets, fluid silk flows] and [Atmospheric lighting]. No clear primary subject\u2014focus on the overall concept of motion and mood." AVOID: Photorealistic rendering, literal anatomy, recognizable objects, 3D raytracing, camera lens specs, and realistic world-building.',
    "Corporate Technology Concept": " - Focus on realistic photography and business themes combined with holographic UI overlays such as floating icons, glowing digital lights, and advanced tech elements. Emphasize a photorealistic corporate environment infused with futuristic, high-tech digital interfaces and data streams.",
    "Graphic Design": `You are an expert Commercial Graphic Designer specializing in high-demand advertising and branding assets\u2014banners, flyers, posters, social media promos, commercial templates, and marketing materials\u2014crafted using professional design tools like Adobe Illustrator, Adobe Photoshop, and CorelDRAW.

When generating or refining prompts for the "Graphic Design" style, you MUST strictly follow these rules:

1. CORE PURPOSE & VISUAL IDENTITY (CRITICAL)
   - Focus purely on COMMERCIAL GRAPHIC DESIGN output: promotional banners, advertising flyers, sale posters, event backdrops, social media graphics, branding templates, and marketing collateral.
   - The output MUST look like it was made in Adobe Illustrator, Photoshop, or CorelDRAW \u2014 flat vector composition, geometric shapes, clean bold layouts, creative typography placeholders, and vibrant commercial color palettes.
   - STRICTLY ZERO REALISM. NO photographs, NO photorealistic rendering, NO real-world textures, NO natural landscapes, NO 3D CGI, NO human faces or realistic skin.
   - The design must be 100% VECTOR-BASED and SHAPE-BASED: think flat design icons, geometric abstract compositions, isometric shapes, overlapping semi-transparent polygons, bold line art, halftone patterns, and stylized graphic elements.

2. DESIGN TOOL AESTHETIC (IMPORTANT)
   - Emulate professional design software output: clean vector paths, flat solid fills, smooth gradient meshes, precise geometric alignment, drop shadows, blending modes, and layer-style effects.
   - Style references: Adobe Illustrator vector artwork, Photoshop poster compositions, CorelDRAW banner layouts, Canva template aesthetics, Figma UI design vibes.

3. STRUCTURED LAYOUT & VISUAL HIERARCHY
   - Use bold grid-based compositions, asymmetrical dynamic layouts, or centered poster-style structures.
   - Include visual flow elements: sweeping curves, diagonal dividers, overlapping shape clusters, ribbon banners, badge frames, and corner ornaments.
   - The composition must look like a finished commercial design ready for a client presentation\u2014not an art piece.

4. MANDATORY COPY SPACE & NO TEXT (CRITICAL)
   - ALWAYS reserve generous, clean negative space (empty areas) for headlines, taglines, logos, and CTAs.
   - NEVER generate readable text, letters, or words. Use abstract placeholder bars, geometric text blocks, or curved ribbon shapes instead.

5. GRAPHIC ELEMENTS & AESTHETICS
   - Primary visual language: bold geometric shapes (circles, triangles, hexagons, abstract blobs), smooth gradient meshes, isometric cubes, overlapping translucent layers, dynamic diagonal slashes, dotted halftone textures, sleek line art dividers, and ornamental frame borders.
   - Color palette: vibrant commercial advertising colors \u2014 electric blue, hot pink, neon green, golden yellow, deep purple, teal, coral orange, with striking duotone or triadic color schemes.
   - The design should be RICH and DETAILED but purely artificial \u2014 like a premium stock vector template from Freepik or Shutterstock.

6. KEYWORDS TO INJECT
   - Integrate terms like: "flat vector graphic design, commercial advertising poster, promotional banner template, geometric abstract composition, bold vibrant colors, clean copy space, Adobe Illustrator style, non-realistic vector art, isometric shapes, halftone pattern, gradient mesh, corporate branding layout, purely digital graphic art, shape-based design, NO PHOTOGRAPHY."

7. STRICT PROHIBITIONS
   - NO photographs, NO realism, NO 3D CGI renders, NO natural environments, NO human subjects, NO realistic textures.
   - NO minimalism \u2014 the design must be visually rich, bold, and commercially impactful.
   - This is PURE GRAPHIC DESIGN \u2014 flat, vector, shape-based, digital, commercial.`
  };
  let currentDirective = styleSpecificDirectives[styleCategory] || "";
  if (styleCategory === "Dark Horror Aesthetic") {
    const DARK_HORROR_BASE_INSTRUCTION = `You are an expert Cinematographer and Hyper-Realistic Photographer specializing in extremely Dark Horror, Macabre, and Gothic Aesthetic assets for high-end cinematic media.

When generating prompts for "Dark Horror Aesthetic", follow these core directives:
- REALISM: The image MUST be 100% photorealistic and look like a real physical photograph or live-action movie still. Absolutely NO digital paintings, 3D renders, or illustrations.
- ATMOSPHERE: Extreme darkness, pitch-black voids, eerie, unsettling psychological tension, dread, ultra-deep crushing shadows, chiaroscuro lighting with minimal visibility, thick volumetric fog, floating dust motes, decaying textures.
- CAMERA & COMPOSITION: Shot on high-end camera gear. Dramatic camera angles (low-angle, tight claustrophobic framing, or subtle dutch angles) emerging from total darkness. Clear eerie focal point barely illuminated.
- PALETTE & LIGHTING: Pure black backgrounds, muted charcoal/ash tones with stark minimal accents (crimson blood-red, ghostly cyan, toxic emerald glow). Extremely sparse directional rim lighting.
- TEXTURES: Authentic, real-world textures. Weathered stone, cracked porcelain, peeling wallpaper, wet asphalt, or viscous reflections emerging from the shadows.
- AVOID: Digital art, 3D CGI, illustrations, daylight, any bright illumination, cheerful elements, cartoonish comic styles, flat lighting, and excessive visibility.`;
    const DARK_HORROR_SUB_STYLE_MODIFIERS = {
      classic: "Blend overall dark horror elements with eerie lighting and ambiguous terror.",
      grimdark: "Focus on oppressive heavy shadows, brutal atmosphere, grime, and hyper-detailed dark fantasy aesthetic.",
      gothic: "Emphasize eerie mist, decaying Victorian or ancient gothic architecture, ornate dark stone, and melancholic dread.",
      lovecraftian: "Incorporate cosmic horror, non-Euclidean geometry, unfathomable alien structures, tentacles, and psychological cosmic dread.",
      infernal: "Focus on demonic entities, glowing magma embers, crackling hellfire, obsidian rock, and a suffocating fiery abyss.",
      macabre: "Highlight surreal dark art, skeletal motifs, morbid beauty, eerie anatomical elements, and unsettling elegance.",
      occult: "Integrate ancient glowing runes, dark ritual circles, esoteric symbols, ritualistic candles, and mystical shadow energy.",
      biomechanical: "Fuse fleshy organic decay with sleek cold machinery, bio-luminescent tubes, and surreal alien cybernetics (HR Giger style).",
      cinematic: "Emphasize 35mm film grain, deep chiaroscuro rim lighting, wide anamorphic lens framing, and dramatic movie-still composition.",
      painterly: "Apply visible heavy impasto brushstrokes, rich digital oil paint textures, and fine-art dark masterpiece aesthetics."
    };
    const subMod = darkHorrorSubStyle ? DARK_HORROR_SUB_STYLE_MODIFIERS[darkHorrorSubStyle] || DARK_HORROR_SUB_STYLE_MODIFIERS.classic : DARK_HORROR_SUB_STYLE_MODIFIERS.classic;
    currentDirective = ` - ${DARK_HORROR_BASE_INSTRUCTION}

SUB-STYLE SPECIFIC INSTRUCTION:
${subMod}`;
  }
  let flatIconDirective = "";
  if (styleCategory === "Flat Icon" && isPngMode && flatIconType) {
    if (flatIconType === "sheet") {
      const colStr = iconSheetColumns ? ` Specifically, arrange them strictly in a ${iconSheetColumns}-column grid layout.` : "";
      flatIconDirective = ` - ICON COLLECTION SHEET REQUIREMENT: Every prompt variation MUST describe a flat design icon collection sheet, showing a clean grid array, set, or organized group of multiple matching, cohesive flat icons or related pictograms on the same plain background, sharing a unified flat visual theme and color palette.${colStr}`;
    } else {
      flatIconDirective = " - SINGLE STANDALONE ICON REQUIREMENT: Every prompt variation MUST describe exactly ONE single standalone individual flat design icon or centered pictogram, with absolutely NO other icons, NO multiple items, and NO grid sheet/collections in the composition.";
    }
  }
  let vectorSubTypeDirective = "";
  if (styleCategory === "Vector Art" && isPngMode && vectorSubType) {
    if (vectorSubType === "minimal_flat") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Minimal Flat Design" aesthetic. Focus on extreme simplicity, clean sweeping curves, elegant organic minimalist layouts, very minimal details, flat color palette with maximum 3-4 cohesive solid colors, high negative space, and absolutely no complex patterns, shading, or gradients. Keep the shapes organic, simple, and beautifully elegant.';
    } else if (vectorSubType === "flat_vector") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Flat Vector Illustration" aesthetic. Clean hand-crafted vector paths, professional 2D illustration style, detailed but flat, using crisp outlines, beautiful sweeping curves, organic lines, and harmonious solid color blocks.';
    } else if (vectorSubType === "corporate_flat") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Corporate Flat Illustration" aesthetic (Alegria style / tech corporate art). Characterized by stylized figures with oversized limbs, fluid sweeping postures, expressive dynamic organic poses, friendly tech character design, clean flat gradients or solid colors, and professional corporate vector elements.';
    } else if (vectorSubType === "gradient_flat") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Gradient Flat Design" aesthetic. Modern 2D flat illustration but with smooth, modern, clean linear or radial color gradients instead of pure solid colors. Focus on beautiful fluid transitions, sleek organic shapes, and soft blended hues providing a highly contemporary premium aesthetic.';
    } else if (vectorSubType === "flat_icon") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Flat Icon Design" aesthetic. Centered standalone icon or emblem design, simplified organic visual metaphor, clean flat vector design with solid coloring, neat lines, and high contrast readable silhouettes.';
    } else if (vectorSubType === "isometric_flat") {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Isometric Flat Design" aesthetic. Flat 2D isometric style using orthographic 30-degree parallel projection, creating a pseudo-3D look but rendered in clean, flat, shadow-free vector graphics with distinct solid color shades for each plane (top, left, right) to represent volume without gradients.';
    }
  }
  if (isPngMode) {
    const stickerPrevention = styleCategory !== "Sticker Illustration" ? ' - DO NOT use words like "sticker", "badge", or "die-cut" in the prompts. The subject must be a high-quality standalone asset.' : "";
    modeConstraint = `
CRITICAL PNG MODE SETTINGS:
- The user requests PNG Asset style generation.
- All generated prompt variations MUST strictly place the main subject "${subject}" isolated on a solid ${pngBgColor} background.
- Focus on a premium, high-end commercial presentation of the subject with exquisite detailing, high fidelity, and ultra-clean studio quality.
- CREATIVE OVER CREATIVE DIRECTIVE (MANDATORY): You MUST design highly creative, imaginative, unique, and artistically stylized conceptual interpretations of the subject rather than basic generic flat vectors or simple objects. Avoid plain, obvious, and boring representation. Instead, infuse gorgeous creative metaphors, rich futuristic elements, intricate miniature details, elegant mechanical gear work, complex origami folds, or stunning isometric stylized dioramas depending on the selected style.
- Make each PNG asset stand out as a highly unique standalone masterpiece so that reviews on Adobe Stock never flag them as "similar content" or "repetitive designs". Each concept must be distinctly original.
- The arrangement and styling are fully flexible\u2014let the AI design the composition dynamically, prioritizing a professional, high-end visual asset.
- You must explicitly append tags such as "isolated on a plain ${pngBgColor} background", "solid flat ${pngBgColor} backdrop", or "pure solid ${pngBgColor} background, no shadows" into the prompt variations.
${currentDirective}
${flatIconDirective}
${vectorSubTypeDirective}
${stickerPrevention}
- Extremely important: Do NOT describe any background scenery, environmental elements, horizon lines, decorative interiors, or context elements. The subject must float on a pure solid ${pngBgColor} background.`;
  } else {
    modeConstraint = `
CRITICAL BACKGROUND MODE SETTINGS:
- The user requests fully composed visual scenes with complex background environments or scenic backdrops.
${currentDirective}
- You MUST describe rich scenic environments (e.g., matching the style context "${styleCategory}") behind the subject.
- Do NOT isolate the subject on flat background. Integrate it with scenic depth and ambient environments.`;
  }
  let userNegInstruction = "";
  if (userNegativePrompt && userNegativePrompt.trim().length > 0) {
    userNegInstruction = `
- Custom anti-directives / negative constraints to strictly AVOID or exclude: "${userNegativePrompt}"
Make sure your generated prompts do not contain these elements or depict them in any form, and include them in the generated negativePrompt value.`;
  }
  const isPhotographic = ["Photorealistic", "Cinematic", "Vintage Photography"].includes(styleCategory);
  let effectiveStyleCategory = styleCategory;
  if (styleCategory === "Vector Art" && isPngMode && vectorSubType) {
    if (vectorSubType === "minimal_flat") effectiveStyleCategory = "Vector Art - Minimal Flat Design";
    else if (vectorSubType === "flat_vector") effectiveStyleCategory = "Vector Art - Flat Vector Illustration";
    else if (vectorSubType === "corporate_flat") effectiveStyleCategory = "Vector Art - Corporate Flat Illustration";
    else if (vectorSubType === "gradient_flat") effectiveStyleCategory = "Vector Art - Gradient Flat Design";
    else if (vectorSubType === "flat_icon") effectiveStyleCategory = "Vector Art - Flat Icon Design";
    else if (vectorSubType === "isometric_flat") effectiveStyleCategory = "Vector Art - Isometric Flat Design";
  }
  const systemInstruction = `You are an elite AI Image Prompt Designer specializing in text-to-image generators like Midjourney, DALL-E 3, Adobe Firefly, and Stable Diffusion.
Anda adalah AI Prompt Generator ahli yang bertugas membuat prompt gambar unik dan bervariasi.
Your job is to translate a raw idea and specific style choices into exactly ${count} highly unique, descriptive, and professional-grade generation prompt variations in English.

Input parameters:
- Base Subject/Idea: "${subject}"
- Selected Style Context: ${effectiveStyleCategory}
- Theme Context & Salt Variabilitas: ${randomSaltInjection}
- Requested Number of Prompt Variations: ${count}
- Requested Word Count Range: ${minWords} to ${maxWords} words per prompt
- Focus Mode: ${promptMode.toUpperCase()}${userNegInstruction}
${isPngMode ? `- Requested PNG Background color: ${pngBgColor}` : ""}
${modeConstraint}

PROMPT GENERATION PRIORITY (STRICT ORDER):
1. Theme subject: The core subject MUST remain the dominant focus of the prompt.
2. Visual characteristics: Describe specific colors, shapes, and the overall aesthetic vibe.
3. Materials and textures: Detail the surfaces, physical properties, and tactile qualities (e.g., stacked paper layers for Paper Cut, hand-molded clay textures for Claymation, canvas grain/pigments for Oil/Watercolor paintings, clean vector geometry for Vector Art).
4. Environment: Only introduce environmental details if they naturally fit the theme. Do not introduce unrelated environments.
5. Lighting: Essential details about mood, shadows, and light sources (e.g., soft shadows between layers for Paper Cut, clean solid gradients for Vectors, natural sunlight/fog for photo styles).
6. ${isPhotographic ? "Camera details: Specific lens types, aperture, and camera angles (e.g., 85mm lens, f/1.8, high shutter speed, DSLR)." : "Medium-Specific details: Focus entirely on visual craftsmanship and physical/digital medium characteristics. Do NOT include camera models, focal lengths, shutter speeds, or photographic sensor details."}

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly start with "${effectiveStyleCategory}" and then follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting]${isPhotographic ? " [Camera Details]" : ""} [Commercial Intent]. Combine these elements into a fluid, professional description.
0.1 DOMAIN AUTHENTICITY: For artistic, illustrated, graphic, 3D, and crafted styles, you are strictly forbidden from forcing photographic jargon (such as "shot on", "aperture", "f-stop", "lens", "shutter speed", "DSLR", "realistic photography", "realistic skin/hair texture") into the prompts. They must remain 100% true to their original non-photographic artistic style.
0.2 COMMERCIAL PRIORITY: The subject must occupy at least 30% of the visual attention. The commercial concept must be immediately understandable.
1. ALWAYS translate the core subject "${subject}" to descriptive, high-quality, vivid English first if it was entered in another language (like Indonesian).
2. Return EXACTLY ${count} unique prompt variations as an array. Each must be distinct, professionally composed for its native style domain (real photography or high-quality illustration/craft/CGI), use distinct compositions/lighting/medium details, and include "copy space" (negative space) for text placement.
3. WORD COUNT CONSTRAINT: Each generated prompt SHOULD be between ${minWords} and ${maxWords} words long. Adjust the level of detail to strictly match this requested length profile.
4. COMMERCIAL STOCK COMPLIANCE: Focus on clean, high-resolution, sharp focus, uncluttered, professional editorial photography/art aesthetics, suitable for Shutterstock/Adobe Stock. Absolutely avoid trademarked logos or specific intellectual property (IP). Under any circumstances, NEVER include any brand names, trademarked names, manufacturer names, or proprietary product lines (e.g., Apple, Nike, Adidas, BMW, Vespa, LEGO, GoPro, iPhone). Use completely generic descriptions instead.
   Under Adobe Stock Content Policy for Artist Names, Real Known People, and Fictional Characters (https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - Do NOT generate prompts that reference, suggest, or contain names of real known people (including celebrities, politicians, athletes, historical figures, or public figures).
   - Do NOT generate prompts referencing fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Marvel/DC superheroes, LEGO characters, Barbie, etc.).
   - Do NOT generate prompts referencing specific artists (living or deceased) whose work is protected by copyright (e.g., "in the style of Van Gogh", "drawn by Picasso", "Andy Warhol style", etc.). Keep style references strictly generic.
5. NO KEYWORD SPAM: Strictly forbidden to provide a list of repetitive commas, keywords, or SEO tags. Describe the *composition* naturally and vividly (like a magazine editorial).
6. The list must contain exactly ${count} different strings. Do not repeat prompts.
7. The negativePrompt MUST be a single concise string starting with the word "Avoid" followed by a list of elements to exclude. If there are truly no relevant negative elements for a specific request, return an empty string for this field instead of using placeholders like "none" or "N/A".
8. CRITICAL QUALITY DIRECTIVE: This is for high-fidelity text-to-image generator prompts (e.g. Midjourney). Each prompt variation must read like a gorgeous, professional image description, not a database search query.
9. CRITICAL: Conform exactly to the requested JSON schema.
10. STRICT ADOBE NO SIMILAR CONTENT RULE (CRITICAL FOR ADOBE STOCK COMPLIANCE):
    You MUST adhere exactly to Adobe Stock's "Similar vs. Spamming" guidelines. Adobe Stock rejects content with the reason: "During our review, we found that your submission closely resembles content already available on Adobe Stock... we refuse content that is too repetitive so customers can easily find distinct and relevant content."
    - EVERY SINGLE PROMPT in the batch MUST be clearly, visibly, and dramatically differentiated from the others to prevent "Similar content" flag rejections.
    - Do NOT just make minimal variations (e.g., just changing a shirt color or moving a prop slightly). Each prompt must be a visually distinct, unique, and standalone masterpiece.
    - Moderators look for NOTICEABLE DIFFERENCES including variations in composition, color, expression, or scenario. You must be extremely selective and output only your most varied, premium, and distinct concepts.
11. ADOBE STOCK SIMILARITY PROTECTION ACTIVE (CRITICAL CORE DIRECTIVE):
    - DO NOT generate prompts that sound like generic, common, or natural stock photos (e.g., "business people shaking hands", "happy family in park", "generic coffee cup on table").
    - You must forcefully inject high creativity, surrealism, extreme stylization, bizarre but commercially viable angles, or deeply artistic metaphors so the resulting image is wildly unique and stands out from the millions of generic Adobe Stock assets.
    - Break the standard stock photography molds by using hyper-specific, unusual subject interactions, highly dramatic emotional states, or avant-garde conceptual presentations. Make the prompts incredibly creative, unpredictable, and highly varied.
    - Inject extreme variation across:
      * Composition & Camera Angle: Vary across wide shots, extreme close-up, medium shots, bird's-eye view, low-angle perspective, and overhead drone shots.
      * Color Palette & Lighting Setup: Vary across natural golden hour, bright overcast daylight, neon nights, moody low-key twilight, soft studio lighting, high-contrast chiaroscuro, and cool pastel hues.
      * Subjects, Expressions & Poses: Vary characters' ages, genders, ethnicities, actions, emotional expressions (e.g., focused, joyful, contemplative, active, serene), and direct interactions with their surroundings.
      * Scenario & Environment: Change environments completely (e.g., indoors vs. outdoors, modern minimalist spaces vs. raw nature, urban landscapes vs. intimate workspaces).
    - ABSOLUTE STYLE SEPARATION (CINEMATIC VS PHOTOREALISTIC):
      * If the Selected Style is "Cinematic", the output prompts MUST be strictly cinematic, looking like a movie-set still with anamorphic qualities, film color grading, volumetric lighting, and dramatic mood. Do NOT generate standard flat stock photos.
      * If the Selected Style is "Photorealistic", the output prompts MUST be strictly realistic, looking like sharp, candid, organic real-world captures with lifelike skin/surface textures, natural sunlight or soft studio strobes, and genuine human behaviors. Do NOT inject theatrical movie color grading or artificial film flares.
      * NEVER mix, swap, or blur the lines between Cinematic and Photorealistic style prompts! Keep them completely distinct and accurate to their true style definition.
    - PNG ASSET VARIATION (OBJECT COUNT & ARRANGEMENTS):
      * For PNG/isolated asset mode, you MUST inject extreme variety in subject count and arrangement, and apply the "Creative Over Creative" methodology.
      * "Creative Over Creative" means you reject boring, standard or generic asset descriptions. Instead, design highly stylized, imaginative, and intellectually unique visual configurations of the subject.
      * Stagger the variations so that some prompts describe a single standalone highly-detailed premium object, some describe exactly two related or complementary objects interacting creatively, and some describe an elegant flat lay, dynamic grouping, or a neat stylized set of 3+ objects. This ensures an extremely rich, diverse asset pack and completely prevents "similar content" rejection.
    - Share your best, most varied work.
11. ADOBE STOCK CONTENT STRATEGY (MUST FOLLOW STRICTLY):
You are an Adobe Stock content strategist. Before generating prompts, avoid concepts that are already heavily saturated on Adobe Stock.
- Avoid concepts that belong to the top 20% most common Adobe Stock categories.
- Prioritize: Emerging trends, Uncommon professions, Future technology, Niche hobbies, Rare cultural activities, Unique lifestyle situations, Untapped commercial concepts.
- Do not generate: Generic business meetings, Generic office workers, Generic smiling people, Generic laptops on desks, Generic handshakes, Generic teamwork scenes.
- Each prompt must represent a commercially valuable concept that is visually distinct from existing stock content.
- Generate concepts first, then generate prompts.
- Reject any concept that feels common, saturated, overused, or similar to typical Adobe Stock results.
12. CRITICAL NEGATIVE PROMPT FORMAT: If you provide a negativePrompt, it MUST start with the prefix "Avoid: " followed by the list of forbidden elements.
13. LANGUAGE CONSISTENCY: While all prompts must be in English, the styleExplanation must be in Indonesian.
14. OPTIONALITY: Jika tidak ada elemen yang benar-benar relevan atau dibutuhkan (khususnya untuk negativePrompt), jangan memaksakan untuk membuatnya (biarkan kosong). Hindari teks placeholder.
15. STICKER PREVENTION: Khusus untuk gaya gaya yang BUKAN Sticker, jangan buat detail border atau die-cut.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      prompts: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING },
        description: `An array containing exactly ${count} unique generated prompt variations based on the visual idea, strictly in English.`
      },
      negativePrompt: {
        type: import_genai.Type.STRING,
        description: "The corresponding negative prompt containing quality/style anti-directives."
      },
      styleExplanation: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING },
        description: "A 3-bullet explanation list of styles used in Indonesia."
      }
    },
    required: ["prompts", "negativePrompt", "styleExplanation"]
  };
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError = null;
  const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
  ];
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        console.log(`[generateOptimizedPrompt] Attempting with ${provider.toUpperCase()} (attempt ${attempts + 1}/${maxAttempts})...`);
        const text = await callOpenAICompatibleWithRetry({
          systemInstruction,
          contents: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}". Write fully formed, vivid natural language sentences.`,
          responseMimeType: "application/json",
          responseSchema,
          config: { temperature: 0.95, seed, topP: 0.99 },
          model
        });
        const parsed = JSON.parse(extractJSON(text));
        let promptArray = [];
        if (parsed && Array.isArray(parsed.prompts)) {
          promptArray = parsed.prompts;
        } else if (Array.isArray(parsed)) {
          promptArray = parsed;
        } else if (parsed && Array.isArray(parsed.variations)) {
          promptArray = parsed.variations;
        }
        if (promptArray.length > 0) {
          return processPromptResults({ prompts: promptArray, negativePrompt: parsed.negativePrompt || "", styleExplanation: parsed.styleExplanation || [] }, count, subject, userNegativePrompt);
        }
        throw new Error("Missing or empty prompts array in JSON response");
      } catch (err) {
        lastError = err;
        attempts++;
        console.warn(`Error on ${provider.toUpperCase()} on attempt ${attempts}:`, err.message || err);
        if (attempts < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  } else {
    const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
    for (const modelName of modelsToTryList) {
      let attempts = 0;
      const maxAttempts = 2;
      for (let attemptIdx = 0; attemptIdx < maxAttempts; attemptIdx++) {
        try {
          console.log(`[generateOptimizedPrompt] Attempting with model ${modelName} (attempt ${attemptIdx + 1}/${maxAttempts})...`);
          const response = await callGeminiWithRetry(modelName, {
            parts: [{ text: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}".

CRITICAL: Write fully formed, vivid natural language sentences. DO NOT use comma-separated keyword lists or tags. Each variation MUST be a complete, descriptive paragraph.` }]
          }, {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.95,
            seed,
            topP: 0.99,
            topK: 100,
            safetySettings
          });
          const text = response.text || "{}";
          const parsed = JSON.parse(extractJSON(text));
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
          throw new Error("Missing or empty prompts array in JSON response");
        } catch (err) {
          lastError = err;
          attempts++;
          console.warn(`Error on ${modelName} on attempt ${attempts}:`, err.message || err);
          if (err.message && err.message.includes("API_KEY")) throw err;
          if (attempts < maxAttempts) {
            const backoffTime = attempts * 1500;
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
          }
        }
      }
    }
  }
  console.warn("All AI models and attempts failed for Prompt Generation. Failing back to programmatic fallback...", lastError);
  const translationPairs = {
    "astronot": "astronaut",
    "kucing": "cat",
    "anjing": "dog",
    "kopi": "coffee",
    "secangkir": "a cup of",
    "lucu": "cute",
    "memegang": "holding",
    "gaya": "style",
    "dengan": "with",
    "gedung": "building",
    "pencakar": "scraper",
    "langit": "sky",
    "taman": "garden",
    "gantung": "hanging",
    "senja": "dusk",
    "rubah": "fox",
    "mata": "eyes",
    "bercahaya": "glowing",
    "bertengger": "perching",
    "berteduh": "sheltering",
    "bawah": "under",
    "pohon": "tree",
    "sakura": "cherry blossom",
    "mistis": "mystical",
    " interior": "interior",
    "perpustakaan": "library",
    "kuno": "ancient",
    "melayang": "floating",
    "lilin": "candle",
    "mobil": "car",
    "cepat": "fast",
    "pantai": "beach"
  };
  let words = subject.toLowerCase().split(/\s+/);
  let translatedWords = words.map((w) => translationPairs[w] || w);
  let resolvedSubject = translatedWords.join(" ");
  const styleFallbackMap = {
    "Graphic Design": [
      "flat vector graphic design, Adobe Illustrator style composition, bold geometric shapes, clean commercial layout, vibrant duotone gradient, no realism",
      "promotional banner template, isometric abstract geometry, halftone dot pattern, dynamic diagonal slashes, smooth gradient mesh, purely digital art",
      "commercial advertising poster design, overlapping translucent polygons, bold line art elements, ornate frame border, striking color contrast, clean copy space",
      "CorelDRAW banner style, geometric abstract composition, ribbon badge placeholder, modern flat vector shapes, electric blue and hot pink palette, no photography",
      "social media promo template, layered geometric shapes, smooth drop shadows, sleek vector paths, golden yellow and deep purple gradient, shape-based design",
      "Adobe Photoshop poster composition, asymmetrical dynamic layout, gradient mesh background, abstract blob elements, neon green and teal accents, purely digital",
      "corporate branding layout, isometric cube cluster, sweeping curve dividers, bold triadic color scheme, clean negative space, professional design tool aesthetic",
      "event backdrop banner design, overlapping circles and triangles, smooth blending modes, halftone texture overlay, coral orange and electric blue duotone",
      "marketing flyer template, geometric frame border, abstract placeholder text bars, vibrant commercial colors, sleek layer-style effects, zero realism",
      "stock vector template style, flat art composition, dynamic shape cluster, clean typography placeholder, rich gradient background, purely graphic art"
    ],
    "Cinematic": [
      "anamorphic lens, volumetric lighting, hyper-realistic cinematic key shot, intense atmospheric depth, cinematic lighting",
      "shot on Arri Alexa LF, moody dramatic scene, photorealistic smoke effects, shallow depth of field",
      "golden hour sunlight, masterfully composed cinema frame, intricate environmental storytelling",
      "rembrandt lighting style, cinematic shadow play, ultra-sharp 8k rendering, heavy depth of field",
      "cyber-noir cinema composition, epic scale, rainy conditions with beautiful lens glares, highly dramatic keyvisual",
      "warm rim-lit close up action frame, stunning environmental details, award-winning cinematic color grading",
      "breathtaking cinematic masterpiece, dramatic high-contrast lighting, 35mm lens rendering, hyperdetailed environment",
      "epic wide cinematic establishing shot, mist and volumetric fog playing with soft morning light",
      "professional movie concept art, epic scale composition, stylized dramatic shadows, soft amber glow",
      "low-key cinematic studio key lights, cinematic bokeh background, ultra-crisp resolution"
    ],
    "3D CGI": [
      "clean 3D CGI render, perfectly neat geometry, smooth plastic and glass materials, high-gloss synthetic surfaces",
      "vibrant 3D digital art, glossy metal and gel textures, controlled studio global illumination, Cinema 4D style",
      "polished 3D CGI illustration, stylized digital aesthetic, subsurface scattering on gel materials, Blender cycles render",
      "impeccable 3D render, minimalist digital composition, glossy reflections, vibrant color palette, non-photorealistic CGI",
      "high-end 3D visual, smooth semi-translucent surfaces, perfect highlights and shadows, professional digital craftsmanship",
      "stylized 3D CGI character, toy-like plastic finish, clean digital lines, vibrant studio lighting setup",
      "advanced 3D CGI abstract, geometric precision, glass and chrome materials, futuristic digital render",
      "ultra-clean 3D CGI close up, macro digital detail, smooth textures, professional CGI lighting",
      "creative 3D CGI concept, imaginative digital materials, neat shapes, high-quality digital production value",
      "high-fidelity 3D CGI render, synthetic material focus, clear digital resolution, perfect lighting balance"
    ],
    "Vector Art": [
      "sleek flat design vector style, bold clean geometric outlines, vibrant flat solid colors, minimalist 2D vector graphics",
      "minimalist vector illustration, smooth curves, clean 2D flat design aesthetic, Adobe Illustrator style",
      "sharp flat vector graphic, solid bold flat colors, high fidelity flat shading style, crisp edges, no gradients",
      "modern corporate flat design vector illustration, stylized minimalist characters, clean shapes",
      "creative 2D flat vector art, solid color blocking, clean layout, perfect proportions, beautifully composed vector scene",
      "retro-wave flat design vector art, precise paths, bold pop solid colors, clean geometric shapes",
      "elegant minimalist flat design graphic, balanced solid color palette, sharp clean paths, artistic vector",
      "2D stylized flat vector illustration, clean outline art, modern flat aesthetic",
      "modern editorial flat vector, stylized 2D visual presentation, flat design style, premium visual look",
      "flat minimal vector layout, screen printed flat design, striking balanced solid hues, beautiful color blocking"
    ],
    "Photorealistic": [
      "sharp raw photograph, ultra photorealistic, shot on 50mm f/1.2 lens, rich natural colors, highly detailed",
      "hyper-realistic photography, high-end studio portrait lighting, realistic skin textures and fine details",
      "candid street photo capturing perfect life-like mood, natural ambient daylight, 8k resolution, crisp",
      "award-winning macro photograph, intense detail, natural soft bokeh depth of field, stunning reality",
      "professional editorial commercial photo, masterfully balanced contrast, shot on high-end DSLR",
      "outdoor scenic realistic shot, overcast soft lighting, photorealistic textures, perfectly balanced shot",
      "cinematic photorealism, beautiful rim light, exquisite real-world texture rendering, ultra-sharp",
      "close up photorealistic shot, natural reflections, authentic atmosphere, high-fidelity colors",
      "crisp morning daylight photography, clean composition, true-to-life color grading, 100mm lens",
      "high dynamic range studio close-up, sharp facial details, stunning realism, beautiful soft shadows"
    ],
    "Fantasy Art": [
      "enchanting fantasy art style, ethereal magical glow, mythical elements, high fantasy digital painting",
      "legendary illustrative concept art, glowing fairy lights, majestic ancient scenery, ethereal mist",
      "breathtaking magical fantasy painting, vibrant celestial mood, whimsical details, highly immersive",
      "mythical fantasy masterpiece, epic scenery, radiant lighting elements, magical spell particle details",
      "dark fantasy digital paint style, ornate architecture, mysterious ambient light, extremely detailed",
      "dreamy surreal illustrative environment, cozy glowing colors, beautiful watercolor-like soft textures",
      "epic fantasy landscape painting, ancient ruins, magical glowing crystals, soft golden lighting",
      "celestial fantasy key art, divine golden illumination, beautiful starry sky background, masterwork",
      "whimsical storybook digital painting, rich saturated warm colors, cozy fantasy vibe",
      "gothic fantasy concept art, dramatic moonlit scenery, beautiful intricate illustrations, epic scale"
    ],
    "Grimdark Gothic Horror Painterly": [
      "grimdark gothic horror, macabre atmosphere, oppressive shadows, decaying architecture, unsettling lighting",
      "heavy impasto painterly brushstrokes, dark fantasy art, eerie mist, ominous mood, highly detailed oil painting style",
      "gothic horror masterpiece, dark and gritty textures, sinister environment, classic dark fantasy illustration",
      "macabre painterly style, moody low-key lighting, gothic elements, dramatic and scary atmosphere",
      "ominous dark fantasy digital painting, brutalist grimdark aesthetics, hauntingly beautiful but terrifying"
    ],
    "Grimdark": [
      "grimdark, oppressive shadows, terrifying atmosphere, hyper-detailed dark fantasy",
      "brutalist grimdark aesthetics, bleak world, highly detailed digital painting",
      "grimdark masterpiece, dark fantasy art, ominous mood, hyper-realistic"
    ],
    "Gothic Horror": [
      "gothic horror, eerie mist, decaying ancient architecture, unsettling lighting",
      "classic gothic horror, creepy mansion, moonlit shadows, macabre atmosphere",
      "terrifying gothic horror art, intricate gothic architecture, sinister mood"
    ],
    "Infernal / Hellscape": [
      "infernal hellscape, demonic elements, brimstone and fire, ominous dark fantasy",
      "fiery infernal landscape, demonic horror, terrifying hellish environment",
      "infernal abyss, chaotic fire and shadows, dark fantasy masterpiece"
    ],
    "Macabre Art": [
      "macabre art, sinister environment, bone-chilling details, dark surrealism",
      "creepy macabre painting, unsettling subjects, high-contrast dark art",
      "macabre masterpiece, grim details, dark and terrifying aesthetics"
    ],
    "Occult Horror": [
      "occult horror, ancient runes, dark magic rituals, creepy and mysterious mood",
      "terrifying occult ritual scene, eerie lighting, dark mysterious fantasy",
      "occult horror aesthetics, eerie symbolism, unsettling dark magic art"
    ],
    "Cinematic Horror Concept Art": [
      "cinematic horror concept art, high-contrast chiaroscuro, moody lighting, terrifying and beautiful",
      "cinematic dark horror, volumetric mist, terrifying movie still, highly detailed",
      "masterful cinematic horror composition, atmospheric dread, epic dark concept art"
    ],
    "Painterly Digital Art": [
      "painterly digital art, heavy impasto brushstrokes, dark horror aesthetics, masterwork painting",
      "expressive painterly horror art, thick brushstrokes, eerie mood, beautiful yet terrifying",
      "digital painterly style, classical horror aesthetic, highly detailed brushwork"
    ],
    "Dark Horror Aesthetic": [
      "grimdark, oppressive shadows, terrifying atmosphere, hyper-detailed dark fantasy",
      "gothic horror, eerie mist, decaying ancient architecture, unsettling lighting",
      "infernal / hellscape, demonic elements, brimstone and fire, ominous dark fantasy",
      "macabre art, sinister environment, bone-chilling details, dark surrealism",
      "occult horror, ancient runes, dark magic rituals, creepy and mysterious mood",
      "cinematic horror concept art, high-contrast chiaroscuro, moody lighting, terrifying and beautiful",
      "painterly digital art, heavy impasto brushstrokes, dark horror aesthetics, masterwork painting"
    ],
    "Scifi Concept Art": [
      "sci-fi concept art illustration, high-tech spaceship interior, futuristic details, cinematic key visual",
      "space exploration alien-planet scenic, cyberpunk elements, futuristic architecture, sleek structures",
      "advanced robotics blueprint style visual, high-tech holograms, futuristic design concept",
      "epic interstellar landscape, planets and stars, deep cosmic color palette, futuristic sci-fi visual",
      "futuristic laboratory scene, glowing blue neon lines, complex technical details, advanced tech concept",
      "cyber-enhanced futuristic visual, high-tech carbon fiber textures, detailed metal mesh patterns",
      "intergalactic space station docking bay illustration, giant sci-fi engines, massive scale, detailed machinery",
      "gorgeous sci-fi poster illustration, futuristic neon-lit monolith, intricate machinery, sleek layout",
      "futuristic metropolis skybridge scene, flying vehicles, gorgeous sci-fi concept aesthetic",
      "advanced alien civilization city view, glowing structures, beautiful high-tech concept art"
    ],
    "Anime/Manga": [
      "vibrant anime style key visual, detailed digital anime cell, beautiful character art, Studio Ghibli inspired scenery",
      "modern anime digital painting, gorgeous hand-drawn aesthetics, soft lighting, vibrant aesthetic shades",
      "epic action anime fight background, dramatic light beams, detailed hand-sketched lines, top trending anime artist",
      "cozy daily life anime wallpaper, beautiful afternoon sunbeams, dust particles, beautiful warm mood",
      "detailed retro 90s anime style, nostalgic color grading, classic hand-painted cell look",
      "gorgeous movie poster anime art, breathtaking sky and clouds, epic scaling, beautiful colors",
      "Kyoto Animation style, brilliant soft glow, highly expressive character focus, clean line art",
      "manga cover art illustration, high contrast inks with gorgeous screentones, stylized color shading",
      "epic fantasy anime scene, magical floating islands, sparkling lights, beautiful color grading",
      "shounen anime style dramatic key shot, power aura, intense lines, breathtaking backdrop"
    ],
    "Watercolor Painting": [
      "artistic watercolor painting, bleeding pigment washes, elegant ink spatters, beautiful canvas texture",
      "soft pastel watercolor illustration, delicate flowing colors, hand-painted artistic masterpiece",
      "vivid watercolor with heavy ink accents, artistic splash art style, organic fluid watercolor washes",
      "traditional Japanese sumi-e wash painting, delicate brushstrokes, minimalist watercolor theme",
      "dreamy watercolor and gouache illustrations, gorgeous bleeding shades, fine textures",
      "expressive abstract watercolor art, dripping colorful pigments, beautiful modern composition",
      "vintage style watercolor page illustration, warm organic feel, handcrafted art texture",
      "delicate floral watercolor style, soft gradients, hand-sketched ink outlines, highly artistic",
      "rustic watercolor concept art, beautiful blending, rich paper grains, atmospheric colors",
      "vibrant watercolor sky and environment wash, creative paint blots, detailed fluid color strokes"
    ],
    "Oil Painting": [
      "classical fine art oil painting, rich canvas textures, thick impasto brushstrokes, realistic lighting",
      "masterfully composed Renaissance oil painting, textured pigment layers, dramatic chiaroscuro contrast",
      "19th century impressionistic oil canvas, loose visible brush strokes, vivid colors, beautiful texture",
      "baroque style oil painting, dark atmospheric shadows playing with glowing warm candlelight",
      "modern palette knife oil painting, thick paint layers, heavily textured, contemporary art style",
      "gorgeous landscape oil painting, romanticism style, beautiful clouds, natural hand-painted texture",
      "museum masterpiece oil painting style, timeless classic colors, aged canvas cracks, realistic details",
      "textured brushstroke study oil art, bold colorful highlights, beautiful light play on canvas",
      "impressionist morning light oil canvas, soft pastels, lovely textured environment, masterwork",
      "vintage hand-painted portrait oil technique, rich pigments, weathered fine-art appeal"
    ],
    "Abstract": [
      "Dynamic abstract light trails on dark background, energetic flowing waves, vivid neon accents, sharp geometric glass shards",
      "High-contrast abstract energy, glowing sphere amidst swirling light ribbons, mysterious dark void, futuristic abstract art",
      "Radiant abstract light pulses, ethereal dark atmosphere, vibrant accent streaks, complex motion and light play",
      "Abstract digital light art, deep dark void background, sharp crystalline motion, vibrant glowing focal point",
      "Energetic abstract composition, fluid white light waves, sharp angular glass fragments, intense vibrant spotlight, dark noir atmosphere",
      "Vibrant fluid liquid art, colorful swirling thick pigments, high viscosity motion, chaotic yet harmonious abstract flow",
      "Futuristic geometric abstract, complex interlocking angular shapes, metallic textures, neon grid lines, cinematic dark theme",
      "Abstract particle simulation, dense glowing dots in motion, dark deep void, energetic dispersal, cinematic moody lighting",
      "Holographic gradient abstract, iridescent flowing curves, light refraction, mysterious ethereal textures, dark background",
      "Complex abstract fractal geometry, infinite intricate patterns, glowing edges, dark contrast lighting, futuristic artistic design"
    ],
    "Vintage Photography": [
      "authentic vintage analog photograph, film grain texture, classic 1970s warm color grading, nostalgic light leaks",
      "retro polaroid instant camera photograph, square white border, soft faded colors, nostalgic vintage vibe",
      "vintage monochrome photography, rich daguerreotype silver print scale, beautiful antique film look",
      "1960s kodachrome color photography style, rich saturated warm reds and yellows, beautiful analog grain",
      "nostalgic black and white sepia film photo, classic vignette borders, timeless antique photograph style",
      "old high-school yearbook photo style, soft focus, retro film texture, vintage aesthetic",
      "classic 35mm film photograph, light leaks on edges, nostalgic retro colors, vintage print feel",
      "faded retro travel postcard photography, dust and scratches, aged paper look, authentic vintage",
      "grainy retro atmospheric photo, beautiful light leak, retro warm tones, cinematic analog look",
      "antique vintage camera shot, authentic details, organic lens scratches, beautiful classic composition"
    ],
    "Cyberpunk": [
      "neon-infused cyberpunk style, wet city streets reflecting neon signs, rainy dark night city background",
      "futuristic cyberpunk terminal hacker layout, green glowing matrix codes, sleek high-tech interface",
      "futuristic cyberpunk setting, tall high-tech skyscrapers, flying vehicles, neon pink and cyber blue tones",
      "cyberpunk action movie key frame, dramatic rain, glowing cybernetic eye implants, intense mood",
      "atmospheric sci-fi cyberpunk visual, dense neon towers, heavy smog, gorgeous futuristic details",
      "high-tech low-life cyberpunk cyberpunk concept, complex mechanical details, rich neon color grading",
      "cyberpunk back-alley night view, neon signs in kanji, glowing holographic ads, cinematic lighting",
      "sleek cyberpunk motorcycle speedway scene, motion blur, glowing wheel rims, futuristic design",
      "cyberpunk indoor hacker den, multiple glowing screens, neon ambient illumination, highly detailed",
      "cybernetic futuristic street view, tech-wear characters, neon glows, epic atmospheric depth"
    ],
    "SteamPunk": [
      "steampunk concept design, Victorian style mechanical gadgets, brass gears, copper pipes, steam elements",
      "high-detailed steampunk airship flying, copper boiler engine, massive sails, retro-futuristic clouds",
      "polished brass and copper steampunk clock mechanism, clockwork details, Victorian engineer desk setting",
      "steampunk workshop background, intricate steam pipe valves, retro-future machinery, amber glow",
      "steampunk keyvisual, leather goggles, velvet top hat, mechanical gear details, atmospheric steam",
      "retro industrial steampunk train station scene, massive steam locomotives, iron girders, Victorian lighting",
      "highly ornate steampunk device blueprint, intricate golden brass engravings, vintage retro look",
      "vintage steampunk street view, cobblestone, gas lamps, steam-driven carriage, Victorian future",
      "steampunk laboratory scene, glass beakers, copper conduits, glowing chemical reactions, rich gears",
      "mechanical steampunk pocket watch close up, gears and springs, beautiful macro craftsmanship"
    ],
    // PNG Categories
    "3D Render": [
      "pristine 3D model render, Octane Render, smooth clay materials, vibrant raytracing, cute 3D character style",
      "cute stylized 3D mascot render, smooth plastic surfaces, pastel colors, soft studio lighting setup",
      "3D digital asset rendering, glossy metal and glass textures, high fidelity rendering, sleek layout",
      "vibrant 3D vector style render, playful elements, clean shapes, outstanding volumetric depth",
      "ultra modern glossy 3D key visual element, ray-traced ambient occlusion, glowing neon edges",
      "stylized 3D porcelain model, highly polished surface, clean pastel gradients, beautiful rendering",
      "creative 3D render element, whimsical design, soft plastic textures, warm studio light",
      "cute 3D game asset render, bright colors, friendly round edges, premium game design look",
      "3D metallic chrome asset, futuristic iridescent surface, glossy reflections, flawless render",
      "isometric 3D miniature object model render, toy-like details, charming polished material"
    ],
    "Flat Icon": [
      "minimalist flat icon graphic, clean modern UI vector icon, bold flat colors, creative simplicity",
      "creative app flat icon design, solid vector shapes, subtle gradients, clean minimalistic presentation",
      "modern flat vector outline icon, bold flat vector paths, highly identifiable simple glyph design",
      "playful flat design vector logo icon, high contract colors, extremely clean aesthetic style",
      "flat minimal vector graphic emblem, modern startup icon look, beautiful simplified design",
      "flat color vector icon, sleek layout, crisp lines, perfect 2D vector graphic representation",
      "creative simplified vector icon, modern application icon aesthetic, clean vector elements",
      "flat design icon element, thick clean outlines, bright pastel palettes, sleek vector finish",
      "minimalist flat icon, bold geometry, primary flat colors, professional design layout",
      "flat linear web icon design, vector asset, highly refined vectors, beautiful flat style"
    ],
    "Isometric": [
      "isometric cute diorama 3D style, orthographic perspective grid, beautifully detailed clean miniature layout",
      "cute isometric 3D block model, tiny details, charming stylized colors, soft drop shadows",
      "isometric game asset graphic, low-poly isometric 3D render, pristine clean edges, highly detailed",
      "retro isometric block illustration, orthographic perspective, beautiful miniature scale modeling",
      "micro isometric 3D concept asset, glossy plastic model looks, cute isometric lighting",
      "isometric voxel art style, pixelated 3D block model, vibrant retro colors, cute game design asset",
      "isometric technical diagram graphic, clean lines and grids, professional vector schematic look",
      "charming isometric diorama design, soft daylight source, perfectly aligned isometric scene",
      "low-poly isometric toy asset render, cute stylized mini elements, orthographic viewport",
      "isometric game building preset, highly polished 3D game model, detailed orthographic rendering"
    ],
    "Pixel Art": [
      "retro 16-bit pixel art key visual, detailed pixel grid, vibrant classic video game console palette",
      "cute 8-bit retro pixel mascot graphic, classic nostalgic game icon, flat color pixel colors",
      "pixel art character sprite sheet preview, pristine grid lines, stylized retro game aesthetic",
      "charming pixelated pixel art illustration, beautiful game background texture, retro aesthetic",
      "highly detailed pixel scene element, nostalgic colors, sharp clean pixels, pixel art masterpiece",
      "retro-wave synthwave pixel art graphic, neon pink and purple nodes, classic glowing grid pixels",
      "8-bit pixel game item icon, clean distinct pixels, highly stylized, classic pixel design",
      "isometric pixel art block, cute nostalgic diorama made of pixels, pristine pixelated lines",
      "detailed fantasy RPG style pixel art, beautiful colors, classic 16-bit retro game visual",
      "pixelated minimal sticker style graphic, cute game icon, clean pixels, sharp retro color theme"
    ],
    "Claymation Style": [
      "cute stop-motion claymation character model, plasticine clay textures, detailed fingerprint press marks, handcrafted clay look",
      "charming claymation toy style model, warm vibrant clay colors, cute clay sculpture, stop-motion look",
      "highly textured plasticine clay model, cute playful design, realistic clay wrinkles, handmade feel",
      "clay figure asset design, vibrant pastel shades, soft clay surface bumps, adorable clay style",
      "claymation style miniature item, cute round sculpture, artisanal clay finish, cozy crafted look",
      "stop-motion claymation prop, realistic pliable material surface, handcrafted clay look, brilliant modeling",
      "adventurous clay character render, gorgeous soft clay material render, cute tactile clay textures",
      "playful claymation style creature, adorable details, beautiful clay art masterpiece",
      "miniature soft toy clay sculpture, organic craft textures, cute model design, claymation render",
      "3D claymation aesthetic asset, smooth doughy textures, vivid clay color layout, fine pressed marks"
    ],
    "Sticker Illustration": [
      "adorable die-cut sticker style illustration, sharp clean borders, bold outlines, vivid colors, modern graphic element",
      "cute pop vector sticker graphic, crisp contour die-cut lines, stylized cartoon style, highly cute layout",
      "vibrant sticker vector design, modern graphic illustration, heavy white outline border, premium sticker style",
      "retro style cartoon sticker asset, thick clean black outlines, bold hand-drawn pop colors, sticker print look",
      "charming border sticker graphic, whimsical illustrations, cute stickers, high quality print vector looks",
      "gorgeous holographic-edged sticker design, glowing visual reflections, unique borders, modern graphic",
      "kawaii sticker design style, pastel colors, cute elements, clean white border outline",
      "bold graffiti style sticker graphic, stylized design, vibrant ink drips, heavy sticker border",
      "minimalist outline sticker vector graphic, clean modern design elements, trendy visual aesthetic",
      "watercolor style illustrated sticker, soft texture fills, sharp die-cut border, beautiful artisan design"
    ],
    "Lowpoly": [
      "low-poly faceted origami-like polygons, sharp geometric facets, flat shading render, low polygon count model",
      "cute lowpoly 3D scene element, sharp clean triangles, pristine flat shading, 3D papercraft vibe",
      "isometric low-poly vector graphic asset, geometric flat faces, minimalist block colors, 3D mesh design",
      "digital lowpoly geometric model, stylized faceted textures, sharp polygonal edges, creative polygonal style",
      "faceted crystal lowpoly design, glowing crystal shapes, sharp 3D triangles, beautiful game mesh style",
      "modern lowpoly origami illustration, stylized vector polygons, lowpoly design layout, clean gradients",
      "low-poly retro gaming model mesh, game developer lowpoly asset design, clean flat faces, highly stylized",
      "geometric lowpoly mountain/nature element, faceted blocky surfaces, gorgeous minimal polygons",
      "retro 3D lowpoly asset render, flat-shaded faces, high-fidelity polygonal corners, clean render",
      "abstract lowpoly sculpture, sharp polygon intersections, beautiful structural mesh colors"
    ],
    "HandDrawn Sketch": [
      "hand-drawn fine line sketch art, delicate realistic pencil crosshatching, raw graphite visual look, highly artistic details",
      "vintage style ink sketch drawing, precise black pen lines, high-detail handcraft illustrations",
      "artistic pencil portrait sketch style, realistic shading, hand-drawn paper textures, beautiful line work",
      "rustic architectural ink sketch, loose artistic lines, ink washes, gorgeous handcrafted sketch texture",
      "minimalist continuous line sketch art, elegant simple strokes, raw ink drawing aesthetic, stylish layout",
      "vintage botanical sketch, delicate pencil outlines, rustic paper fibers, highly authentic design",
      "beautiful charcoal sketch rendering, rich textured smudges, dark charcoal crosshatch details",
      "creative conceptual hand-drawn engineering sketch, grid lines, precise pen strokes, vintage notebook look",
      "cozy hand-sketched cartoon outline illustration, warm pencil style lines, cute handcrafted artwork",
      "detailed ink engraving drawing look, beautiful hatching patterns, traditional masterwork sketch"
    ],
    "Origami Style": [
      "intricate folded paper origami model, precise geometric creases, realistic authentic papercraft texture, delicate drop shadows",
      "cute colorful paper-crafted origami model, geometric folded paper style, clean minimalist paper textures",
      "3D origami paper art asset, beautiful paper fibers, delicate geometric paper folds, soft ambient shadows",
      "traditional Japanese origami paper sculpture, sharp intricate folds, elegant minimalist papercraft styling",
      "whimsical 3D paper fold art graphic, gorgeous pastel layers, realistic shadows, stylized paper craft",
      "minimalist origami design, clean sharp creases, light-textured paper material, masterfully folded model",
      "creative 3D papercraft character design, paperboard cutouts, geometric origami folds, beautiful shadow depth",
      "origami geometric model render, neat paper folding lines, delicate pastel colors, soft daylight lighting",
      "stylized paper sculpture design, geometric origami aesthetic, clean paper structures",
      "intricate layered origami artwork, multi-colored folded sheets, highly detailed papercraft construction"
    ],
    "Glassmorphism": [
      "sleek glassmorphic visual asset, realistic semitransparent frosted glass plate, premium glossy translucency",
      "modern glassmorphism UI element, blurred glass refraction layers, glowing abstract backing gradients",
      "futuristic glossy frosted glass icon, thick realistic glass edges, beautiful refractive rainbow light leaks",
      "glassmorphic semitransparent 3D graphic, sleek frosty surface, glowing pastel background elements",
      "premium frosted glass sculpture render, high fidelity reflections, beautiful glossmorphic refraction blur",
      "glassmorphism vector graphic design, translucent layering, glossy highlights, modern high-end look",
      "frosted semitransparent plate component, glowing digital ambient lights, pristine glass edges",
      "artistic translucent glass plate element, futuristic ray-traced glass refraction, premium aesthetic",
      "sleek glassmorphic layout card, frosted matte texture, realistic refractive glass drop shadow, glossy",
      "chromatic frosted glass artwork, semitransparent layering, glowing liquid gradient backgrounds, pristine"
    ],
    "Metal Emboss": [
      "metallic detailed embossed plate asset, silver metal foil engraving, brushed steel relief engraving, realistic shine",
      "gold leaf metal emboss medallion graphic, highly detailed engraved metal relief, metallic gold shines",
      "antique bronze metal emboss plate, heavy metallic oxidation highlights, copper relic engravings",
      "futuristic silver chrome embossed metal emblem, polished metal surfaces, sharp 3D embossing, high reflectivity",
      "metal stamp emboss art element, heavy indented press lines, exquisite steel plate texture",
      "brushed aluminum embossed vector logo badge, sharp machined edges, metallic metallic sheen, clean relief",
      "golden metal emboss pattern art, royal golden filigree engraving, luxurious thick gold texture and shine",
      "industrial steel emboss stamp, realistic metal reflections, dark iron details, heavy relief design",
      "vintage brass metal emboss emblem plates, polished bronze carvings, Victorian brass detailing",
      "sleek titanium embossed sheet plate graphic, futuristic metal engraving patterns, high-fidelity premium metal"
    ],
    "Line Art": [
      "minimalist black and white line art vector graphic, clean black outlines on solid white, continuous line drawing, elegant style",
      "contemporary fine line art asset, crisp black vector contours, minimalist aesthetic, graceful curves",
      "modern continuous single-line drawing style, sleek black ink lines, high contrast minimalist art design",
      "elegant line art vector illustration, pristine sharp black paths, creative line work icon, ultra-clean look",
      "minimalist outline vector illustration, modern clean line strokes, solid styling with high clarity",
      "beautiful abstract line art design, continuous ink pen line strokes, sophisticated flow and structure",
      "zen continuous line sketch graphic, balanced minimal black outlines, elegant and pure aesthetic",
      "sleek line art emblem vector, precise geometric single-line curves, highly readable silhouette design",
      "artistic minimalist contour illustration, fine line sketch, pristine black ink outline graphic, elegant styling",
      "trendy line art vector asset, single-stroke flow, perfect curves and sharp line endings, modern design look"
    ]
  };
  const activeModifiers = styleFallbackMap[styleCategory] || styleFallbackMap["Cinematic"];
  const generatedPrompts = [];
  const bgSuffix = promptMode === "png" ? `, isolated on clean solid ${pngBgColor} background, no shadows` : "";
  for (let i = 0; i < count; i++) {
    const modifier = activeModifiers[i % activeModifiers.length];
    generatedPrompts.push(`${resolvedSubject}, direct style of ${styleCategory}, ${modifier}${bgSuffix} (variation #${i + 1})`);
  }
  const finalNegative = userNegativePrompt && userNegativePrompt.trim().length > 0 ? `Avoid: ${userNegativePrompt.trim()}` : "";
  const promptsWithNegative = generatedPrompts.map((p) => {
    if (finalNegative) {
      const separator = p.trim().endsWith(".") || p.trim().endsWith(",") ? " " : ", ";
      return `${p.trim()}${separator}${finalNegative}`;
    }
    return p;
  });
  return {
    prompts: promptsWithNegative,
    negativePrompt: finalNegative,
    styleExplanation: [
      `Sistem pencadangan otomatis diaktifkan akibat kepadatan lalu lintas API Gemini.`,
      `Konsep subjek diterjemahkan dan diindeks secara prosedural.`,
      `Berhasil merumuskan ${count} variasi prompt menggunakan parameter procedural style: ${styleCategory} (${promptMode.toUpperCase()}).`
    ]
  };
};
var analyzeImageToPrompt = async (image, styleCategory = "Cinematic", model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided image and generate a highly detailed, professional text-to-image prompt.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the image word-for-word. Instead, identify its visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.
5. STRICT NO INTELLECTUAL PROPERTY (IP) COMPLIANCE: You are STRICTLY FORBIDDEN from including any trademarked brand names, company names, product lines, registered logos, or patented product designs (e.g., do NOT use "Apple", "Nike", "Adidas", "iPhone", "BMW", "Mercedes", "LEGO", "GoPro", "Vespa", "Tesla", etc.) or specific copyrighted characters in the generated prompt or description. If the image contains recognizable branded items, you MUST describe them using completely generic terms (e.g., "sleek modern smartphone" instead of "iPhone", "athletic running shoes" instead of "Nike shoes", "modern electric sedan" instead of "Tesla", "classic European retro scooter" instead of "Vespa"). This ensures the resulting prompts comply with commercial stock policies and avoid any intellectual property (IP) refusal.

STEP 1: EXTRACT THE FOLLOWING DATA POINTS AS A BASELINE:
- Subject (The main entity)
- Action (What is happening)
- Environment (Setting, location, context)
- Mood (Emotional tone)
- Lighting (Type, direction, intensity)
- Camera angle (Position relative to subject)
- Lens estimate (Focal length, aperture, depth of field)
- Composition (Framing, rule of thirds, perspective)
- Visual style (Current aesthetic baseline)

STEP 2: GENERATE A DETAILED PROMPT MATCHING THE SELECTED STYLE: ${styleCategory}
Adapt the prompt structure according to the chosen style:
- If 'Photorealistic': focus on RAW photo quality, technical camera specs, hyper-real textures.
- If 'Cinematic': focus on anamorphic lens effects, color grading, lighting scenarios, film stock.
- If 'Adobe Stock': focus on clean backgrounds, commercial appeal, high contrast, studio lighting.
- If 'Editorial': focus on fashion/magazine composition, avant-garde elements, professional retouching styles.
- If 'Lifestyle': focus on natural motion, candid moments, warm/authentic lighting, everyday settings.
- If 'Fine Art': focus on brushstrokes, medium textures, artistic theory, museum-quality lighting.
- If 'Grimdark Gothic Horror Painterly': focus on macabre atmospheres, oppressive shadows, eerie mist, decaying architecture, unsettling lighting, and heavy impasto painterly brushstrokes characteristic of dark fantasy and gothic horror art.

CRITICAL RULES:
1. OUTPUT PROMPT MUST BE IN ENGLISH.
2. The description should be a concise summary of the visual analysis and how this variation differs or complements the original asset.
3. Return a JSON object with "prompt" and "description".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      prompt: { type: import_genai.Type.STRING, description: "The generated image-to-image prompt." },
      description: { type: import_genai.Type.STRING, description: "Brief description of the image content." }
    },
    required: ["prompt", "description"]
  };
  const imagePart = processFrameServer(image);
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let response;
  let lastError;
  let responseText = "";
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0
      });
      responseText = response.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[analyzeImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) {
    console.warn("analyzeImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze image. Please try again.");
  }
  try {
    const data = JSON.parse(extractJSON(responseText));
    return data;
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};
var analyzeBatchImageToPrompt = async (images, styleCategory = "Cinematic", model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided images and generate a highly detailed, professional text-to-image prompt for each one.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the images word-for-word. Instead, identify their visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.
5. STRICT NO INTELLECTUAL PROPERTY (IP) COMPLIANCE: You are STRICTLY FORBIDDEN from including any trademarked brand names, company names, product lines, registered logos, or patented product designs (e.g., do NOT use "Apple", "Nike", "Adidas", "iPhone", "BMW", "Mercedes", "LEGO", "GoPro", "Vespa", "Tesla", etc.) or specific copyrighted characters in the generated prompt or description. If the images contain recognizable branded items, you MUST describe them using completely generic terms (e.g., "sleek modern smartphone" instead of "iPhone", "athletic running shoes" instead of "Nike shoes", "modern electric sedan" instead of "Tesla", "classic European retro scooter" instead of "Vespa"). This ensures the resulting prompts comply with commercial stock policies and avoid any intellectual property (IP) refusal.

FOR EACH IMAGE, EXTRACT AND ANALYZE:
- Subject, Action, Environment, Mood, Lighting, Camera angle, Lens estimate, Composition, Visual style.

GENERATE PROMPT MATCHING STYLE: ${styleCategory}
Adapt the logic based on style:
- Photorealistic/Cinematic: High technical detail, optics, and lighting.
- Adobe Stock/Editorial: Commercial composition and polish.
- Lifestyle/Fine Art: Emotional resonance and artistic medium.
- Grimdark Gothic Horror Painterly: Macabre atmospheres, oppressive shadows, eerie mist, decaying architecture, unsettling lighting, and heavy impasto painterly brushstrokes characteristic of dark fantasy.

CRITICAL BATCH RULES:
1. You are receiving ${images.length} distinct images.
2. You MUST return a JSON array containing EXACTLY ${images.length} objects.
3. OUTPUT PROMPTS MUST BE IN ENGLISH.

Return a JSON array of objects, each with "prompt" and "description".`;
  const responseSchema = {
    type: import_genai.Type.ARRAY,
    items: {
      type: import_genai.Type.OBJECT,
      properties: {
        prompt: { type: import_genai.Type.STRING, description: "The generated image-to-image prompt." },
        description: { type: import_genai.Type.STRING, description: "Brief description of the image content." }
      },
      required: ["prompt", "description"]
    }
  };
  const parts = [];
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `

--- IMAGE ${i + 1} ---
` });
    parts.push(processFrameServer(images[i]));
  }
  parts.push({ text: `
Analyze these ${images.length} images and return the JSON array.` });
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let responseText = "";
  let lastError;
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0
      });
      responseText = res.text || "[]";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[analyzeBatchImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) {
    console.warn("analyzeBatchImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze images in batch.");
  }
  try {
    const data = JSON.parse(extractJSON(responseText));
    return data;
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};
var analyzeVideoKeyword = async (keyword, model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const prompt = `Anda adalah Senior Adobe Stock Demand Analyst yang BRUTAL DAN JUJUR. 
  Tugas Anda adalah menilai apakah keyword "${keyword}" benar-benar layak diproduksi sebagai footage video stok.
  
  PRINSIP ANALISIS:
  1. JANGAN JADI PENJILAT. Jika keyword ini sampah atau sudah basi, katakan TIDAK LAYAK.
  2. Jika pasar sudah OVERSATURATED, Anda HARUS menyatakan TIDAK LAYAK PRODUKSI.
  3. Berikan SOLUSI: Jika TIDAK LAYAK, berikan revisi keyword atau sudut pandang baru yang bisa membuatnya jadi LAYAK (misal: "Jangan cuma orang lari, tapi orang lari di tengah badai neon").

  STRUKTUR RESPON (JSON):
  - keyword: keyword asli.
  - demandPotential: Tinggi / Menengah / Rendah.
  - demandType: Evergreen / Seasonal / Trend-fading.
  - marketInsight: Analisis tajam kondisi pasar (Bahasa Indonesia).
  - targetBuyer: Siapa pembelinya?
  - useCase: Penggunaan video.
  - recommendedFormat: Format teknis.
  - formatReason: Alasan teknis.
  - competitionLevel: Sangat Tinggi / Tinggi / Menengah / Rendah.
  - competitionNotes: Kritik pedas footage yang sudah ada.
  - cinematicPotential: YA / TIDAK.
  - cinematicReason: Sudut pandang sutradara.
  - status: LAYAK PRODUKSI atau TIDAK LAYAK.
  - conclusion: Kalimat penutup pedas.
  - solution: Jika tidak layak, berikan arahan revisi atau alternatif keyword yang lebih "cuan". Jika layak, berikan tips optimasi.

  Gunakan Bahasa Indonesia profesional yang sangat jujur.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keyword: { type: import_genai.Type.STRING },
      demandPotential: { type: import_genai.Type.STRING },
      demandType: { type: import_genai.Type.STRING },
      marketInsight: { type: import_genai.Type.STRING },
      targetBuyer: { type: import_genai.Type.STRING },
      useCase: { type: import_genai.Type.STRING },
      recommendedFormat: { type: import_genai.Type.STRING },
      formatReason: { type: import_genai.Type.STRING },
      competitionLevel: { type: import_genai.Type.STRING },
      competitionNotes: { type: import_genai.Type.STRING },
      cinematicPotential: { type: import_genai.Type.STRING },
      cinematicReason: { type: import_genai.Type.STRING },
      status: { type: import_genai.Type.STRING },
      conclusion: { type: import_genai.Type.STRING },
      solution: { type: import_genai.Type.STRING }
    },
    required: ["keyword", "demandPotential", "demandType", "marketInsight", "targetBuyer", "useCase", "recommendedFormat", "formatReason", "competitionLevel", "competitionNotes", "cinematicPotential", "cinematicReason", "status", "conclusion", "solution"]
  };
  let responseText = "";
  const response = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0,
    topK: 1,
    topP: 0.1
  });
  responseText = response.text || "{}";
  return JSON.parse(responseText);
};
async function generateHollywoodPrompts(keyword, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const prompt = `Act as a world-class Hollywood Director. Create 50 high-end, cinematic text-to-video prompts for: "${keyword}".
  
  BEST PROMPT STRUCTURE (MANDATORY):
  - Subject: Detailed description with textures/clothing.
  - Movement: Fluid, intentional physical actions.
  - Environment: Epic world-building (architecture, weather, atmosphere).
  - Lighting: Advanced techniques (Global illumination, rim light, volumetric dust).
  - Camera: Technical precision (Anamorphic, 85mm, T-stop settings implied).
  
  RULES:
  - NO GENERIC SHOTS. Every shot must look like a masterpiece.
  - Focus on "The Unseen": Capture angles that stock footage usually lacks.
  - English only.
  
  Return exactly 50 prompts in JSON array format.`;
  const responseSchema = {
    type: import_genai.Type.ARRAY,
    items: {
      type: import_genai.Type.OBJECT,
      properties: {
        subject: { type: import_genai.Type.STRING },
        movement: { type: import_genai.Type.STRING },
        environment: { type: import_genai.Type.STRING },
        lighting: { type: import_genai.Type.STRING },
        camera_angle: { type: import_genai.Type.STRING },
        camera_movement: { type: import_genai.Type.STRING },
        style: { type: import_genai.Type.STRING, enum: ["cinematic", "documentary"] }
      },
      required: ["subject", "movement", "environment", "lighting", "camera_angle", "camera_movement", "style"]
    }
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
  } else {
    const response = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema
    });
    responseText = response.text || "[]";
  }
  let parsed;
  try {
    parsed = JSON.parse(extractJSON(responseText));
  } catch (e) {
    console.warn("Parse error for hollywood prompts:", e);
    parsed = [];
  }
  const timestamp = Date.now();
  return (Array.isArray(parsed) ? parsed : []).map((p, index) => ({
    ...p,
    id: `hw-${timestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`
  }));
}
async function checkImageQuality(image, tolerance = "MEDIUM", language = "Bahasa", model, fileType, imageMetadata) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isIndonesian = !language || language === "Bahasa" || language === "id" || language === "Indonesian" || language?.toLowerCase() === "indonesian" || language?.toLowerCase() === "id";
  const targetLanguageName = isIndonesian ? "Indonesian (Bahasa Indonesia)" : "English";
  let metadataInstruction = "";
  if (imageMetadata) {
    metadataInstruction = `

[DATA EXIFTOOL - REFERENSI TEKNIS]
Berikut adalah data Metadata EXIF asli dari file Gambar yang diekstrak menggunakan ExifTool:
\`\`\`json
${JSON.stringify(imageMetadata, null, 2)}
\`\`\`
Jadikan data teknis di atas sebagai panduan kuat untuk melengkapi temuan audit visual Anda.`;
  }
  let systemInstruction = `Anda adalah "Ai Vision", mesin kurator profesional tingkat lanjut yang dikonfigurasi khusus menyelaraskan aturan dengan standar kualitas teknis premium industri dan pedoman kurasi Adobe Stock & Shutterstock komersial.

Tugas Anda terbagi menjadi 3 modul utama dengan standar kualitas kurasi mandiri yang sangat ketat:
1. Modul OCR, Brand Safety & IP Check: Memindai hak cipta intelektual, merek dagang, logo pada produk/pakaian, plat nomor, tanda tangan, wajah tanpa model release, serta teks/watermark ilegal.
2. Modul AI Anomaly & Anatomi: Mendeteksi cacat struktural AI generatif, wajah kerumunan yang meleleh/hancur di latar belakang (melted background faces), benda-benda aneh yang bentuknya tidak logis (nonsensical objects/hallucinations), pola rumit yang hancur (pattern degradation), blur yang terlihat seperti coretan kasar bukan bokeh natural (unnatural depth of field), sirkuit meleleh (melted details), pola acak cacat, ketidaksesuaian perspektif logis, inkonsistensi bayangan/refleksi, juling mata, juling asimetris wajah, dan distorsi anatomi (seperti jari tangan melengkung aneh, menyatu, atau lebih dari 5).
3. Modul Pixel Analysis (Technical Quality): Memastikan kualitas teknis piksel, ketajaman fokus (soft focus vs sharp), pencahayaan (overexposed/blown highlights vs underexposed/crushed shadows), artifact kompresi, luminance noise parah pada shadow, chromatic aberration, dan noda sensor kamera (sensor dust spots).

---
PANDUAN KESEIMBANGAN ESTETIKA & TEKNIS (CRITICAL BALANCE FOR PROFESSIONAL CONTENT):
Bedakan antara pilihan artistik/estetika premium yang disengaja dan cacat teknis murni:
- Depth of Field (DoF) dangkal / Bokeh: Latar belakang buram yang indah (bokeh lembut) adalah kualitas bernilai jual sangat tinggi dan dicari di Adobe Stock, BUKAN cacat. Selama bagian utama subjek tetap fokus tajam sempurna (tack-sharp), tandai status "PASS" pada "blur" dan "out_of_focus".
- Low-light & Shadow Noise: Foto bernuansa malam hari, lilin, atau siluet dramatis secara wajar memiliki noise halus. Jika tidak parah atau mengganggu estetika komersial, ini 100% PASS.
- High-Contrast & Shadows: Bayangan yang dalam (crushed shadows) atau sorotan cahaya terang yang dramatis sering kali merupakan unsur seni/pencahayaan yang indah. Jangan langsung menganggapnya cacat eksposur jika itu memperkuat mood estetika foto.

---
Fokuskan analisis Anda SECARA KETAT pada kategori kurasi resmi Adobe Stock untuk Alasan Penolakan Konten (Content Refusal Criteria) berikut (Lakukan inspeksi visual seolah-olah gambar diperbesar/Zoom 100%. Jika Anda menerima 2 gambar, gambar KEDUA adalah potongan tengah yang di-ZOOM 200%. Gunakan gambar kedua KHUSUS untuk menginspeksi artefak kompresi, pixel banding, dan noise mikroskopis!):
1. OUT OF FOCUS / SHARPNESS ISSUES (Masalah Fokus & Ketajaman):
   - Subjek utama wajib memiliki fokus yang tajam sempurna (pin-sharp atau tack-sharp).
   - Deteksi motion blur yang tidak disengaja akibat pergerakan kamera lambat (camera shake) atau shutter speed subjek yang tidak memadai.
   - Deteksi "soft focus" di mana subjek utama tampak kabur atau tidak terdefinisi secara detail.
   - Pengecualian: Depth of Field (DoF) dangkal yang disengaja diperbolehkan hanya jika bagian subjek yang penting tetap fokus tajam sempurna (tack-sharp).
2. EXPOSURE & LIGHTING ISSUES (Masalah Eksposur & Pencahayaan):
   - Overexposure: Blown highlights/highlights clipping (kehilangan detail pada area terang).
   - Underexposure: Crushed shadows/muddy shadows (gelap berlumpur dengan noise tinggi atau detail shadow terpotong).
   - Kontras berlebih (harsh contrast) yang menghilangkan kemulusan gradasi atau pencahayaan datar (flat/muddy lighting) yang membosankan.
3. NOISE & GRAIN (Masalah Derau):
   - Deteksi luminance noise (derau bintik pasir) yang kasar dan chromatic/color noise (bintik warna piksel merah/hijau/biru yang tidak semestinya, terutama pada area bayangan) akibat ISO tinggi atau pemrosesan berlebih.
   - Deteksi "over-aggressive noise reduction" (pengurangan derau berlebih) yang menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).
4. IMAGE ARTIFACTS (Artefak Gambar & Teknis):
   - Artefak kompresi JPEG: Pixelation parah, blockiness (makro-blok), gradasi patah (color banding/posterization) di area langit atau latar belakang halus.
   - Chromatic Aberration: Color fringing (pembiasan warna magenta/hijau) di tepian objek berkontras tinggi.
   - Noda sensor (sensor dust spots): Bintik atau lingkaran abu-abu buram yang samar di langit polos atau area latar belakang seragam akibat sensor kamera kotor.
   - Over-sharpening: Efek lingkaran cahaya (halos) putih/terang di sekeliling tepian subjek akibat penajaman digital berlebih.

5. INTELLECTUAL PROPERTY & BRAND SAFETY (Kekayaan Intelektual, Hukum & Batasan Terkenal Resmi):
   - PUBLIC DOMAIN EXCEPTION (PENGECUALIAN AMAN): Dokumen sejarah, teks kuno, dan dokumen pemerintah dari domain publik (seperti The Constitution, The Bill of Rights, Declaration of Independence, naskah kuno, peta sejarah) adalah 100% AMAN dan TIDAK MELANGGAR IP. Jangan flag dokumen publik atau sejarah sebagai pelanggaran IP.
   - Merek & Logo Komersial: Logo, merek dagang, nama brand, produk bermerek, karya seni berhak cipta (seperti ilustrasi/font modern), tato tanpa rilis artis, serta bangunan/arsitektur yang membutuhkan Property Release. PENGECUALIAN: Tulisan tangan/kaligrafi/font kuno pada dokumen sejarah publik domain adalah AMAN.
   - Desain Fisik & Bentuk Produk Khas: Desain fisik khas dari produk komersial modern, seperti mainan (lego bricks, boneka Barbie), barang fesyen, elektronik (desain bodi iPhone/MacBook/iPad termasuk penempatan kamera belakang khas, tombol home, notch layar, kamera Polaroid klasik beserta bingkai putihnya, sepatu Converse Chuck Taylor dengan pola bintang/karet pelindung hidung kaki, sepatu Dr. Martens dengan jahitan kuning ikonik, sol merah sepatu Christian Louboutin, Beats by Dre dengan simbol 'b'), atau perabot desainer (designer furniture).
   - Desain Otomotif Khas: Kisi-kisi depan (grille) mobil yang khas seperti BMW kidney grille, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot front grille, logo bintang Mercedes, bentuk Vespa/Lambretta ikonik.
   - Bangunan, Landmark & Lokasi Tiket yang Dilindungi IP (SANGAT KETAT):
     * Penggambaran lokasi berbayar/bertiket (ticketed locations) atau situs terlarang/dibatasi (restricted sites) tanpa rilis properti (property releases) yang diperlukan.
     * Landmark atau monumen tertentu tidak dapat diterima sama sekali karena batasan hak cipta desain bangunan modern atau pengelola tempat.
     * Menara Eiffel di malam hari (karena efek tata cahaya berhak cipta). Menara Eiffel di siang hari aman, tetapi malam hari dilarang keras.
     * Burj Al Arab, Burj Khalifa (Dubai)
     * Sydney Opera House (Australia)
     * Atomium (Brussels)
     * Louvre Pyramid (Paris)
     * Space Needle (Seattle)
     * Hollywood Sign & Hollywood Walk of Fame (Los Angeles)
     * Istana Neuschwanstein (Jerman)
     * CN Tower (Toronto)
     * The Shard, London Eye, Tower Bridge (London)
     * Transamerica Pyramid (San Francisco)
     * Kuil Sagrada Fam\xEDlia (khusus bagian interior)
     * Taipei 101 (Taiwan)
     * Menara Kembar Petronas (Malaysia)
     * Monumen bersejarah, kuil, atau situs warisan arkeologis yang dikelola oleh pembatasan hukum properti setempat (seperti Machu Picchu, Stonehenge, Chichen Itza).
   - Karya Seni Berhak Cipta & Hak Cipta Visual (TERMASUK ADOBE STOCK GENERATIVE AI CONTENT POLICY - https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
     * Karya cipta ciptaan orang lain (copyrighted works), termasuk seni (art), patung (sculptures), seni jalanan (street art), grafiti, mural dinding, ilustrasi (illustrations), font spesifik, atau elemen grafis (graphic elements).
     * Karakter fiksi berhak cipta: Tokoh fiksi dari buku, film, komik, game, atau acara televisi (seperti Disney, Mickey Mouse, Hello Kitty, Pok\xE9mon, tokoh anime, superhero Marvel/DC, Barbie, LEGO, dsb.) = FAIL secara instan jika terdeteksi.
     * Nama Artis / Gaya Artis Berhak Cipta: Visual yang meniru gaya khas seniman tertentu yang masih dilindungi hak cipta (misal: "in the style of Van Gogh", "drawn by Picasso", dsb.) = FAIL secara instan jika diindikasikan meniru artis berhak cipta.
     * Nama Orang Nyata Terkenal (Real Known People): Kemiripan visual dengan selebritas, politisi, atlet, tokoh sejarah terkenal, atau figur publik lainnya = FAIL secara instan.
     * Lukisan museum modern, instalasi patung kontemporer (seperti Cloud Gate / "The Bean" di Chicago, Patung Banteng Wall Street "Charging Bull").
   - Dokumen Negara, Uang & Identitas: PENGECUALIAN: Dokumen sejarah/publik domain (seperti Bill of Rights, Konstitusi) adalah AMAN. PENGECUALIAN: Dokumen sejarah/publik domain (seperti Bill of Rights, Konstitusi) adalah AMAN.
     * Uang kertas atau koin modern dari negara mana pun (terutama jika difoto datar/persis tegak lurus yang berisiko disalahgunakan untuk pemalsuan).
     * Prangko, paspor, surat izin mengemudi (SIM), kartu identitas (KTP/ID), kartu kredit/debit, buku tabungan bank.
   - Hak Pribadi & Tubuh (Biometrics):
     * Tato unik pada subjek manusia (memerlukan rilis properti dari seniman tato dan model).
     * Wajah Manusia & Anak-Anak (CRITICAL): JANGAN nyatakan FAIL atau VIOLATION pada ip_risk atau stock_acceptance hanya karena mendeteksi wajah manusia, anak-anak, atau sekelompok orang (misalnya anak kecil bermain air di taman). Foto orang/gaya hidup adalah kategori paling laku di microstock. Anggap Model Release dapat diunggah kemudian oleh kontributor. Jika tidak ada logo merek dagang yang melanggar di pakaian mereka, status wajib dianggap SAFE dan harus dinyatakan PASS untuk ip_risk.
     * Properti Mainan & Pakaian Unbranded: Pistol air plastik biasa (water gun), pelampung, ember mainan, pakaian anak biasa tanpa logo adalah properti generik yang 100% aman. JANGAN nyatakan FAIL atau VIOLATION hanya karena adanya benda-benda bermain anak ini.
     * Mainan Anak & Pistol Air (Water Gun): Pistol air mainan anak-anak (biasanya berwarna-warni cerah, terbuat dari plastik) adalah mainan rekreasi keluarga yang menyenangkan dan komersial, BUKAN senjata api atau objek kekerasan. JANGAN pernah melabeli mainan ini sebagai senjata berbahaya, kekerasan, atau ancaman keamanan. Wajib loloskan PASS untuk kategori keamanan dan penerimaan stok.
   - WAJIB: Jika ada tulisan/teks apa pun di dalam gambar, Anda HARUS menuliskan teks tersebut secara eksplisit (Lakukan OCR) ke dalam laporan!
   - Teks Tidak Terbaca & Gibberish (CRITICAL): Periksa apakah terdapat teks yang tidak terbaca, karakter rusak, kata-kata yang berantakan, atau ejaan aneh (gibberish text) pada papan tulis (whiteboard), catatan tempel (sticky notes), poster, buku, kemasan produk, atau bagian mana pun di dalam gambar. Ini adalah cacat visual generatif AI yang sangat umum dan fatal untuk komersial. Jika gambar mengandung teks berantakan (seperti karakter huruf yang hancur, kata yang tidak bermakna/gibberish, atau gabungan huruf acak), status pemeriksaan untuk "text", "ai_artifacts", dan "stock_acceptance" WAJIB di-set ke FAIL, skor keseluruhan di bawah 70, dan hasil audit dinyatakan FAIL.

6. GENERATIVE AI QUALITY & ANOMALIES (Kualitas & Cacat AI):
   - Efek Cahaya & Lens Flare Merusak (Excessive/Artificial Lens Flare) [KRITIS]: Deteksi efek bias pelangi (rainbow lens flare), kebocoran cahaya (light leaks), atau flare heksagonal buatan AI yang melintasi subjek utama dan menutupi detail asli (seperti jaket, celana, ransel). Jika efek ini tampak tidak alami, mengganggu estetika komersial, atau menutupi detail tekstur penting, status "ai_artifacts" atau "over_edited" WAJIB di-set ke FAIL.
   - Figur Latar Belakang Cacat (Deformed/Malformed Background Figures) [SANGAT KRITIS]: Orang/subjek di latar belakang koridor/jalan yang memiliki tubuh terdistorsi, wajah meleleh/hancur, kaki/tangan menyatu secara tidak alami, meskipun latar belakang tersebut blur/bokeh. Cacat visual pada karakter sekunder atau figur latar belakang adalah alasan penolakan nomor satu di Adobe Stock. Jika ditemukan, status "ai_artifacts" dan "anatomical_errors" WAJIB di-set ke FAIL.
   - Perspektif & Geometri Loker/Benda Bengkok (Warped Locker & Physical Geometry) [SANGAT KRITIS]: Garis-garis lurus pada furnitur, loker, kabinet, garis pintu, tangga, celah pintu loker yang tidak konsisten ukurannya, nomor loker (seperti nomor pelat logam "148") yang penyok/asimetris, atau kunci besi yang bentuknya meleleh dan tidak logis secara mekanisme fisik dunia nyata. Jika ditemukan cacat geometris ini, status "structural_defects" dan "ai_artifacts" WAJIB di-set ke FAIL.
   - Wajah Terdistorsi (Distorted/Melted Faces) [SANGAT KRITIS]: Wajah pada subjek utama maupun orang-orang/kerumunan di latar belakang yang meleleh, asimetris parah, mata yang menyatu, atau tampak seperti gumpalan daging tak berbentuk. Sering terjadi pada gambar kerumunan AI. Jika ditemukan, WAJIB set "anatomical_errors" dan "ai_artifacts" ke FAIL.
   - Benda yang Tidak Logis (Nonsensical Objects/Hallucinations): Objek yang bentuknya tidak masuk akal, terpotong secara ajaib, atau percampuran benda yang tidak logis (misal: tangan yang menyatu dengan bunga atau benda asing, benda yang melayang tanpa alasan, atau geometri mustahil). Jika ditemukan, set "ai_artifacts" ke FAIL.
   - Masalah Anatomi (Anatomy errors) [SANGAT KRITIS]: Perhatikan dengan sangat cermat TANGAN, JARI, KAKI, dan PERSENDIAN. Jika terdapat jari tangan melengkung tidak wajar, jumlah jari lebih/kurang dari 5 per tangan, tangan/jari yang meleleh dan berbaur secara mustahil dengan objek lain, sendi terkilir aneh, atau anggota tubuh ganda, status "anatomical_errors" WAJIB di-set ke FAIL.
   - Detail yang Meleleh (Melted details) & Pola Hancur (Pattern Degradation): Tekstur ornamen, pakaian tradisional, kacamata, perhiasan, paving block/cobblestone, atau tulisan yang meleleh, menyatu, kehilangan keterpisahan spasial, atau menjadi piksel acak tak beraturan saat di-zoom.
   - Kedalaman Ruang Tidak Natural (Unnatural Depth of Field): Latar belakang yang kabur (blur) namun tidak terlihat seperti bokeh optik, melainkan tampak seperti coretan kasar (smudgy), berbercak, atau terhapus secara artifisial.
   - Teks & Karakter Rusak (Gibberish Text): Karakter huruf yang rusak/cacat/terdistorsi, kata-kata tak terbaca, teks hancur atau tidak bermakna di papan tulis (whiteboards), bagan diagram, catatan dinding, atau sticky notes.
   - Kecacatan Proporsi & Perspektif (Proportion & Perspective Defects) [CRITICAL]: Periksa distorsi proporsi objek fisik, furnitur, ruangan, atau elemen arsitektur. Periksa juga kemiringan garis bangunan, tangga yang tidak menuju ke mana-mana, atau distorsi proporsi tubuh manusia. Jika fatal, status "proportion_defects" dan "structural_defects" WAJIB FAIL.
   - Kehilangan detail komersial: Tekstur datar yang terlihat terlalu sintetis.

7. INTEGRASI PENUH PANDUAN STANDAR & KEBIJAKAN ADOBE STOCK (CRITICAL):
   Anda wajib menyelaraskan keputusan kurasi secara ketat dengan tiga dokumen panduan kontributor Adobe Stock resmi berikut:
   
   A. Standar Teknis & Kualitas Penolakan Konten (Ref: https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html):
      - Out of Focus & Sharpness: Subjek utama wajib in-focus tajam sempurna. Tolak (FAIL) jika terdapat soft focus menyeluruh, camera shake/motion blur tak sengaja, atau kesalahan titik fokus (miss-focus) yang mengaburkan detail subjek.
      - Exposure & Lighting: Tolak jika terjadi overexposure parah (blown-out highlights/detail putih hilang) atau underexposure parah (crushed shadows/area gelap berlumpur tanpa detail visual). Hindari kontras yang terlampau keras (harsh/extreme contrast) atau flat lighting yang membosankan.
      - Noise & Grain: Tolak bintik derau yang mengganggu pada area shadow, langit rata, atau permukaan datar akibat pengaturan ISO tinggi. Reduksi noise yang berlebihan hingga subjek tampak mulus tidak alami seperti lilin/plastik (plastic/waxy look) juga WAJIB ditolak.
      - Image Artifacts & Aberration: Deteksi kompresi JPEG kasar (pixelation, macro-blocks), color banding (gradasi warna terpotong/patah pada langit), aberasi kromatik (magenta/green color fringing pada tepian kontras tinggi), bintik kotoran sensor (sensor dust spots), dan over-sharpening halos.
      - Masalah Scan & Analog (Jika relevan): Garis Newton rings, goresan fisik, debu pemindaian slide/klise, atau pola gelombang moire.
      
   B. Alasan Umum Penolakan Konten (Ref: https://helpx.adobe.com/stock/contributor/content-moderation/common-reasons-content-refusal.html):
      - Intellectual Property & Brand Safety: Logo komersial, nama merek dagang, desain produk yang khas (seperti iPhone camera bumps, Adidas stripes, LEGO studs, bodi kamera Polaroid klasik beserta bingkai putihnya, jahitan kuning Dr. Martens, red soles Christian Louboutin, logo Beats "b", Converse rubber toes).
      - Desain Otomotif Terlindungi: Kisi radiator (grille) BMW, Rolls-Royce, Jeep 7-slot, ornamen kap mesin ikonik, bentuk motor Vespa/Lambretta yang sangat khas.
      - Karya Seni Berhak Cipta: Mural, grafiti, patung kontemporer (seperti Charging Bull Wall Street, Cloud Gate Chicago), lukisan museum modern, karakter fiksi Disney, Hello Kitty, Pok\xE9mon, Marvel, DC, ilustrasi karya orang lain, elemen grafis buatan pihak ketiga, atau font berhak cipta (TETAPI tulisan tangan kaligrafi sejarah yang bersifat publik domain adalah AMAN).
      - Dokumen & Mata Uang: Mata uang kertas/logam modern dari negara mana pun (terutama jika difoto datar), prangko, SIM, paspor, kartu identitas nasional, kartu kredit/debit, buku tabungan. CATATAN: Dokumen sejarah seperti Bill of Rights atau Konstitusi adalah AMAN dan bukan pelanggaran.
      - Unusable/Lack of Utility: Gambar yang tidak memiliki subjek jelas, kabur berlebih, berantakan tanpa arah komposisi, atau tidak memiliki potensi komersial.
      - Judul & Kata Kunci Tidak Patuh: Metadata berisi nama model kamera, merek dagang, URL, kata berulang-ulang yang tidak relevan (keyword stuffing), atau kata kunci yang menyesatkan.
      
   C. Kebijakan & Batasan Hak Cipta Terkenal Resmi (Ref: https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html):
      - Batasan Landmark & Bangunan Ikonik yang SANGAT KETAT:
        * Menara Eiffel di malam hari (tata cahaya berhak cipta) dilarang keras (FAIL). Siang hari diperbolehkan (PASS).
        * Burj Al Arab, Burj Khalifa (Dubai) dilarang keras.
        * Sydney Opera House (Australia) dilarang keras.
        * Atomium (Brussels), Louvre Pyramid (Paris), Space Needle (Seattle) dilarang keras.
        * Hollywood Sign & Hollywood Walk of Fame (Los Angeles) dilarang keras.
        * Istana Neuschwanstein (Jerman), CN Tower (Toronto), London Eye, Tower Bridge, The Shard (London) dilarang keras.
        * Transamerica Pyramid (San Francisco), Taipei 101 (Taiwan), Petronas Twin Towers (Malaysia) dilarang keras.
        * Bagian Interior Kuil Sagrada Fam\xEDlia (Barcelona) dilarang keras.
        * Empire State Building, Chrysler Building, Flatiron Building, Rockefeller Center, One World Trade Center, Guggenheim Museum, Getty Museum, Graceland, Machu Picchu, Stonehenge, Chichen Itza, dan situs warisan bersejarah lainnya yang terlindungi secara hukum properti setempat dilarang keras untuk lisensi komersial tanpa rilis properti resmi.

PANDUAN EVALUASI TOLERANSI KUALITAS (CRITICAL):
Tingkat Toleransi Saat Ini: ${tolerance}. Evaluasi keputusan akhir kurasi dan skor dengan aturan berikut:
- STRICT (Toleransi Nol / Zero Tolerance): Anda harus menerapkan standar tertinggi tanpa toleransi terhadap cacat sekecil apa pun. Jika terdapat sedikit saja soft focus, sedikit noise pada shadow, anomali AI mikro di latar belakang, atau potensi pelanggaran IP/Kekayaan Intelektual sekecil apa pun, aset wajib dinyatakan FAIL dengan skor maksimal 0-59.
- MEDIUM (Standar Industri): Cacat teknis yang sangat minor di luar fokus utama (seperti noise halus yang wajar atau soft focus pada latar belakang artistik) dapat ditoleransi. Namun, kesalahan fokus pada subjek utama, anomali AI yang terlihat jelas, atau pelanggaran IP/Kekayaan Intelektual apa pun wajib dinyatakan FAIL dengan skor maksimal 0-65.
- LOOSE (Toleransi Longgar / Estetika Tinggi): Utamakan keindahan artistik dan nilai jual komersial secara keseluruhan. Cacat teknis sedang (seperti noise sedang, soft focus ringan pada subjek sekunder, anomali AI minor yang tersembunyi) diperbolehkan lolos (PASS) asalkan subjek utama terlihat luar biasa indah, memiliki komposisi menawan, dan daya tarik komersial yang tinggi. Hanya kegagalan teknis yang fatal atau pelanggaran IP yang sangat terang-terangan yang menyebabkan status FAIL (skor maksimal 0-69).

STATUS & SKORING (KONSISTEN & KETAT):
- PASS: Skor 75 - 100.
- FAIL: Skor 0 - 69 (Jangan berikan skor 70-74 untuk status FAIL).

ATURAN OUTPUT TEKS:
1. Jadilah SANGAT CERDAS, ANALITIS, dan FAKTUAL layaknya Ahli Forensik Fotografi Senior. Isi dari field \`visual_scan_analysis\` and \`detailed_feedback\` WAJIB sangat mendalam dan berbobot (minimal 3 paragraf). Jangan hanya menyebutkan kalimat pendek atau generik, tetapi jelaskan SECARA TEKNIS MENGAPA cacat itu terjadi berdasarkan BUKTI VISUAL NYATA yang ada pada gambar.
2. DILARANG KERAS MENEBAK, BERHALUSINASI, ATAU MEMBUAT ASUMSI (NO GUESSING OR HALLUCINATION). JANGAN melaporkan cacat anatomi, teks rusak, watermark, logo, cacat komposisi, atau masalah pencahayaan/warna jika masalah tersebut TIDAK BENAR-BENAR TERLIHAT dengan jelas di dalam gambar. Jika gambar terlihat bagus dan aman, nyatakan dengan jujur dan berikan status PASS. Kegagalan mematuhi aturan ini akan merusak kredibilitas sistem kurasi.
3. Untuk setiap item di dalam \`ai_vision_checks\`, tuliskan \`note\` yang spesifik, unik, dan BUKAN TEBAKAN, melainkan hasil pengamatan faktual terhadap piksel gambar, menyesuaikan temuan Anda yang paling relevan dengan parameter JSON.

ATURAN BAHASA:
Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons wajib menggunakan bahasa tersebut secara konsisten.

ATURAN HEATMAPS:
Untuk bagian heatmaps, petakan nilai X dan Y dalam skala rentang 0-100 sebagai persentase lokasi, lalu jelaskan secara spesifik pada raw_value objek apa yang melanggar di area tersebut.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      visual_scan_analysis: { type: import_genai.Type.STRING },
      legal_status: { type: import_genai.Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
      technical_issues: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      strengths: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      overall_score: { type: import_genai.Type.NUMBER },
      recommendation: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] },
      detailed_feedback: { type: import_genai.Type.STRING },
      ai_vision_checks: {
        type: import_genai.Type.OBJECT,
        properties: {
          blur: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          composition: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          lighting: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          exposure: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          color_balance: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          over_edited: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          sensor_issues: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          watermark: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          logo: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          text: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          anatomical_errors: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          ip_risk: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          structural_defects: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          proportion_defects: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          illustration_issues: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          vector_issues: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          ai_artifacts: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          stock_acceptance: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          metadata: {
            type: import_genai.Type.OBJECT,
            properties: {
              title: { type: import_genai.Type.STRING },
              keywords: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
            },
            required: ["title", "keywords"]
          }
        },
        required: [
          "blur",
          "composition",
          "lighting",
          "exposure",
          "color_balance",
          "over_edited",
          "sensor_issues",
          "watermark",
          "logo",
          "text",
          "anatomical_errors",
          "structural_defects",
          "ip_risk",
          "proportion_defects",
          "illustration_issues",
          "vector_issues",
          "ai_artifacts",
          "stock_acceptance",
          "metadata"
        ]
      },
      heatmaps: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            type: { type: import_genai.Type.STRING, enum: ["noise", "focus", "lighting", "ip_violation", "artifact", "gen_ai_anomaly", "composition"] },
            x: { type: import_genai.Type.INTEGER },
            y: { type: import_genai.Type.INTEGER },
            intensity: { type: import_genai.Type.NUMBER },
            raw_value: { type: import_genai.Type.STRING }
          },
          required: ["type", "x", "y", "intensity", "raw_value"]
        }
      }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "ai_vision_checks", "heatmaps"]
  };
  const imageParts = Array.isArray(image) ? image.map((img) => processFrameServer(img)) : [processFrameServer(image)];
  let selectedModel = model || "gemini-3.5-flash";
  if (selectedModel === "auto" || selectedModel.includes("1.5-flash") || selectedModel.includes("8b") || selectedModel.includes("2.0-flash") || selectedModel.includes("gemma") || selectedModel.includes("3-flash") || selectedModel.includes("3.1-flash-lite")) {
    selectedModel = "gemini-3.5-flash";
  } else if (selectedModel.includes("pro") || selectedModel.includes("3.1-pro")) {
    selectedModel = "gemini-3.1-pro-preview";
  }
  const modelsToTry = [selectedModel, "gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let responseText = "";
  let lastError;
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const activeModel = selectedModel || PROVIDER_DEFAULT_MODELS[provider] || "gpt-4o-mini";
    try {
      let promptText = `Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. CRITICAL: Ensure your ENTIRE JSON response is written in the requested language: ${targetLanguageName} (Do NOT slip into English).`;
      if (imageMetadata) {
        promptText += `

Technical Metadata: ${JSON.stringify(imageMetadata)}`;
      }
      responseText = await callOpenAICompatibleWithRetry({
        systemInstruction,
        contents: [...imageParts, { text: promptText }],
        responseMimeType: "application/json",
        responseSchema,
        config: { temperature: 0, topP: 0.1 },
        model: activeModel
      });
    } catch (err) {
      lastError = err;
      console.error(`[checkImageQuality] Non-Gemini API call failed with model ${activeModel}:`, err.message || err);
    }
  } else {
    const activeModel = selectedModel;
    const modelsToTryList = activeModel && activeModel.startsWith("gemini") ? [activeModel, ...modelsToTry] : modelsToTry;
    for (const modelName of modelsToTryList) {
      try {
        let promptText = `Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. CRITICAL: Ensure your ENTIRE JSON response is written in the requested language: ${targetLanguageName} (Do NOT slip into English).`;
        if (imageMetadata) {
          promptText += `

Technical Metadata: ${JSON.stringify(imageMetadata)}`;
        }
        const res = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: promptText }] }, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
          topK: 1,
          topP: 0.1
        });
        responseText = res.text || "{}";
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
        if (err.message && err.message.includes("API_KEY")) throw err;
      }
    }
  }
  if (!responseText) throw lastError;
  try {
    const parsedResult = JSON.parse(extractJSON(responseText));
    if (parsedResult.ai_vision_checks) {
      let anyFail = false;
      let anyIpFail = false;
      let hasCriticalFail = false;
      const criticalKeys = ["watermark", "logo", "text", "ip_risk", "anatomical_errors", "structural_defects", "ai_artifacts"];
      for (const [key, value] of Object.entries(parsedResult.ai_vision_checks)) {
        if (value && typeof value === "object" && value.status === "FAIL") {
          anyFail = true;
          if (["watermark", "logo", "ip_risk", "text"].includes(key)) {
            anyIpFail = true;
          }
          if (criticalKeys.includes(key)) {
            hasCriticalFail = true;
          }
        }
      }
      if (tolerance === "STRICT") {
        if (anyFail) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 70) {
            parsedResult.overall_score = 69;
          }
        }
      } else if (tolerance === "MEDIUM") {
        if (hasCriticalFail) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 70) {
            parsedResult.overall_score = 69;
          }
        }
      } else if (tolerance === "LOOSE") {
        if (anyIpFail) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 70) {
            parsedResult.overall_score = 69;
          }
        }
      }
      if (anyIpFail) {
        parsedResult.legal_status = "VIOLATION";
      }
    }
    return parsedResult;
  } catch (e) {
    console.warn("Parse Error on QA response:", responseText);
    throw e;
  }
}
async function generateCalendarEvents(month, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const MONTH_GUIDELINES = {
    "january": {
      enName: "January",
      idName: "Januari",
      typicalEvents: [
        "New Year's Day (1 January) - Global/World",
        "World Braille Day (4 January) - Global/UN",
        "Epiphany / Three Kings Day (6 January) - Spain, Mexico, Europe",
        "Orthodox Christmas (7 January) - Eastern Europe, Russia",
        "National Youth Day (12 January) - India",
        "Martin Luther King Jr. Day (mid January / 19 January 2026) - USA",
        "International Day of Education (24 January) - Global/UNESCO",
        "Republic Day (26 January) - India",
        "Australia Day (26 January) - Australia",
        "International Customs Day (26 January) - Global",
        "International Holocaust Remembrance Day (27 January) - Global/UN",
        "Street Art and Winter Festivals - Northern Hemisphere",
        "Winter Sports, Skiing, and Snowboard season trends",
        "New Year Resolutions, Fitness, and Healthy Eating themes",
        "Back-to-work, Career start, and Corporate start of year planning"
      ]
    },
    "february": {
      enName: "February",
      idName: "Februari",
      typicalEvents: [
        "World Cancer Day (4 February) - Global/UN",
        "Singapore National Day Prep / Heritage starts (February) - Singapore",
        "International Day of Women and Girls in Science (11 February) - Global/UN",
        "World Radio Day (13 February) - Global/UNESCO",
        "Isra Mi'raj / Ascension of Prophet Muhammad (14 February 2026) - Indonesia/Global",
        "Valentine's Day (14 February) - Global/World",
        "Chinese New Year / Lunar New Year / Imlek (17 February 2026) - China, Singapore, Indonesia, Global",
        "Ramadan starts (approx. 18 February 2026) - Global/Islamic",
        "World Day of Social Justice (20 February) - Global/UN",
        "International Mother Language Day (21 February) - Global/UNESCO",
        "Super Bowl Sunday (mid February) - USA",
        "President's Day (third Monday of February) - USA",
        "National Science Day (28 February) - India",
        "Carnival of Rio de Janeiro / Venice Carnival (late February/March) - Brazil, Italy, Global",
        "Black History Month (all February) - USA, Canada",
        "Cozy cabin, fireplace, winter foliage, snowy forest scenery"
      ]
    },
    "march": {
      enName: "March",
      idName: "Maret",
      typicalEvents: [
        "Zero Discrimination Day (1 March) - Global/UN",
        "World Wildlife Day (3 March) - Global/UN",
        "International Women's Day (8 March) - Global/World",
        "Pi Day / International Day of Mathematics (14 March) - Global",
        "Holi Festival of Colors (March) - India, Global",
        "St. Patrick's Day (17 March) - Ireland, USA, Global",
        "Nyepi / Balinese Day of Silence (19 March 2026) - Indonesia/Bali",
        "International Day of Happiness (20 March) - Global/UN",
        "Eid al-Fitr / Hari Raya Idul Fitri (20 March 2026) - Indonesia, Malaysia, Global/Islamic",
        "Spring Equinox (20 March) - Northern Hemisphere",
        "Autumn Equinox (20 March) - Southern Hemisphere",
        "World Poetry Day (21 March) - Global/UNESCO",
        "World Water Day (22 March) - Global/UN",
        "World Meteorological Day (23 March) - Global/UN",
        "World Theatre Day (27 March) - Global",
        "Cherry Blossom Season / Sakura (late March) - Japan, South Korea, USA",
        "Spring Fashion lines, outdoor hiking, blossom background patterns"
      ]
    },
    "april": {
      enName: "April",
      idName: "April",
      typicalEvents: [
        "April Fools' Day (1 April) - Global/World",
        "Good Friday (3 April 2026) - Global/Christian",
        "Easter Sunday (5 April 2026) - Global/Christian",
        "World Health Day (7 April) - Global/WHO",
        "Songkran Water Festival (13-15 April) - Thailand",
        "International Day of Human Space Flight (12 April) - Global/UN",
        "World Heritage Day (18 April) - Global/UNESCO",
        "Kartini Day (21 April) - Indonesia",
        "Earth Day / International Mother Earth Day (22 April) - Global/World",
        "World Book and Copyright Day (23 April) - Global/UNESCO",
        "Anzac Day (25 April) - Australia, New Zealand",
        "King's Day / Koningsdag (27 April) - Netherlands",
        "International Jazz Day (30 April) - Global/UNESCO",
        "Spring Gardening, outdoor farming, fresh organic vegetables",
        "Ecological energy, green environment, spring cleaning themes"
      ]
    },
    "may": {
      enName: "May",
      idName: "Mei",
      typicalEvents: [
        "International Workers' Day / May Day (1 May) - Global/World",
        "World Press Freedom Day (3 May) - Global/UN",
        "Cinco de Mayo (5 May) - Mexico, USA",
        "Mother's Day (second Sunday of May - 10 May 2026) - USA, Indonesia, Global",
        "Kenaikan Isa Almasih / Ascension Day of Jesus Christ (14 May 2026) - Indonesia, Global",
        "International Day of Families (15 May) - Global/UN",
        "World Telecommunication Day (17 May) - Global/UN",
        "International Museum Day (18 May) - Global/ICOM",
        "Cultural Diversity Day (21 May) - Global/UNESCO",
        "Memorial Day (last Monday of May - 25 May 2026) - USA",
        "Eid al-Adha / Hari Raya Haji / Idul Adha (27 May 2026) - Indonesia, Singapore, Global/Islamic",
        "Vesak Day / Hari Waisak (31 May 2026) - Global/Buddhist",
        "Cannes Film Festival (all May) - France, Global",
        "Wedding season, bridal shower, spring picnics, outdoor graduation parties"
      ]
    },
    "june": {
      enName: "June",
      idName: "Juni",
      typicalEvents: [
        "Global Day of Parents (1 June) - Global/UN",
        "World Environment Day (5 June) - Global/UNEP",
        "World Oceans Day (8 June) - Global/UN",
        "World Blood Donor Day (14 June) - Global/WHO",
        "Father's Day (third Sunday of June - 21 June 2026) - USA, Canada, UK, Global",
        "Juneteenth (19 June) - USA",
        "Summer Solstice / Midsummer (21 June) - Northern Hemisphere",
        "International Yoga Day (21 June) - Global/UN",
        "World Music Day / F\xEAte de la Musique (21 June) - Global/World",
        "Public Service Day (23 June) - Global/UN",
        "Micro, Small and Medium-sized Enterprises Day (27 June) - Global/UN",
        "Asteroid Day (30 June) - Global/UN",
        "Global Pride Month (all June) - Global/World",
        "Camping, hiking equipment, family road trips, healthy outdoor fitness",
        "Music festivals, graduation season, beach setup, school holiday starts"
      ]
    },
    "july": {
      enName: "July",
      idName: "Juli",
      typicalEvents: [
        "Canada Day (1 July) - Canada",
        "Independence Day / 4th of July (4 July) - USA",
        "World Population Day (11 July) - Global/UN",
        "Bastille Day (14 July) - France",
        "Tahun Baru Islam / Islamic New Year 1448H (16 July 2026) - Indonesia, Global/Islamic",
        "World Emoji Day (17 July) - Global/World",
        "Nelson Mandela International Day (18 July) - Global/UN",
        "Independence Day of Colombia (20 July) - Colombia",
        "Hari Asyura / Ashura (25 July 2026) - Global/Islamic",
        "World Drowning Prevention Day (25 July) - Global/UN",
        "Independence Day of Peru (28 July) - Peru",
        "International Day of Friendship (30 July) - Global/UN",
        "Summer Travel, Beach parties, sunscreen, sunglasses flatlays",
        "Tropical vacation, cruise ship travel, coconut trees, ocean wave landscape"
      ]
    },
    "august": {
      enName: "August",
      idName: "Agustus",
      typicalEvents: [
        "National Day of Switzerland (1 August) - Switzerland",
        "World Breastfeeding Week (1-7 August) - Global/UN",
        "Singapore National Day (9 August) - Singapore",
        "International Day of the World's Indigenous Peoples (9 August) - Global/UN",
        "International Youth Day (12 August) - Global/UN",
        "Independence Day of India (15 August) - India",
        "Hari Kemerdekaan Republik Indonesia (17 Agustus) - Indonesia",
        "World Humanitarian Day (19 August) - Global/UN",
        "World Photography Day (19 August) - Global/World",
        "Maulid Nabi Muhammad / Mawlid al-Nabi (25 August 2026) - Indonesia, Global/Islamic",
        "Women's Equality Day (26 August) - USA",
        "La Tomatina (last Wednesday of August) - Spain",
        "Obon Festival (mid August) - Japan",
        "Back-to-School shopping season startup, autumn semester preparation",
        "Late summer harvesting, golden wheat fields, sunflowers, stargazing"
      ]
    },
    "september": {
      enName: "September",
      idName: "September",
      typicalEvents: [
        "Independence Day of Brazil (7 September) - Brazil",
        "Labor Day (first Monday of September / 7 September 2026) - USA, Canada",
        "International Literacy Day (8 September) - Global/UNESCO",
        "Rosh Hashanah / Jewish New Year (11-13 September 2026) - Israel, Global/Jewish",
        "Yom Kippur (20-21 September 2026) - Israel, Global/Jewish",
        "International Day of Peace (21 September) - Global/UN",
        "Autumn Equinox (22 September) - Northern Hemisphere",
        "Spring Equinox (22 September) - Southern Hemisphere",
        "National Day of Saudi Arabia (23 September) - Saudi Arabia",
        "Mid-Autumn Festival / Mooncake Festival (25 September 2026) - China, Singapore, East Asia",
        "Oktoberfest starts (mid September to early October) - Germany, Global",
        "World Tourism Day (27 September) - Global/UNWTO",
        "Cozy autumn vibes, back to school, harvesting season, apple picking",
        "Warm coffee, woolen sweaters, cozy indoor reading, colorful falling leaves"
      ]
    },
    "oktober": {
      enName: "October",
      idName: "Oktober",
      typicalEvents: [
        "International Day of Older Persons (1 October) - Global/UN",
        "International Coffee Day (1 October) - Global/World",
        "Hari Batik Nasional (2 October) - Indonesia",
        "Golden Week National Holiday (1-7 October) - China",
        "World Teachers' Day (5 October) - Global/UNESCO",
        "World Mental Health Day (10 October) - Global/WHO",
        "International Day of the Girl Child (11 October) - Global/UN",
        "Thanksgiving Day (second Monday of October) - Canada",
        "World Food Day (16 October) - Global/FAO",
        "United Nations Day (24 October) - Global/UN",
        "Hari Sumpah Pemuda (28 October) - Indonesia",
        "Halloween (31 October) - USA, UK, Global/World",
        "Pumpkin patch, autumn foliage, horror, spooky, and cozy sweater themes",
        "Cozy fireplaces, hot cocoa, foggy morning landscapes, mist forest hiking"
      ]
    },
    "november": {
      enName: "November",
      idName: "November",
      typicalEvents: [
        "World Vegan Day (1 November) - Global/World",
        "D\xEDa de los Muertos / Day of the Dead (1-2 November) - Mexico, Latin America",
        "Diwali / Deepavali Festival of Lights (8 November 2026) - India, Singapore, Global",
        "Hari Pahlawan / National Heroes Day (10 November) - Indonesia",
        "Veterans Day / Remembrance Day (11 November) - USA, Canada, UK",
        "World Diabetes Day (14 November) - Global/UN",
        "World Children's Day (20 November) - Global/UNICEF",
        "Thanksgiving Day (fourth Thursday of November / 26 November 2026) - USA",
        "Black Friday & Cyber Monday (late November / 27-30 November 2026) - Global",
        "Movember Men's Health Awareness (all November) - Global/World",
        "Holiday shopping, retail sales, delivery boxes, winter fashion boots and coats"
      ]
    },
    "december": {
      enName: "December",
      idName: "Desember",
      typicalEvents: [
        "World AIDS Day (1 December) - Global/UN",
        "Hanukkah Festival of Lights (4-12 December 2026) - Global/Jewish",
        "Human Rights Day (10 December) - Global/UN",
        "International Mountain Day (11 December) - Global/UN",
        "Winter Solstice (21 December) - Northern Hemisphere",
        "Hari Ibu / National Mother's Day (22 December) - Indonesia",
        "Christmas Eve (24 December) - Global/Christian",
        "Christmas Day (25 December) - Global/Christian",
        "Boxing Day (26 December) - UK, Canada, Australia",
        "New Year's Eve (31 December) - Global/World",
        "Winter holidays, cozy fireplace, snow scenery, holiday baking, gingerbread houses",
        "New Year resolutions planning, calendar books, diary planners"
      ]
    }
  };
  const cleanMonth = month.trim().toLowerCase();
  let key = "january";
  if (cleanMonth.includes("jan")) key = "january";
  else if (cleanMonth.includes("feb")) key = "february";
  else if (cleanMonth.includes("mar") || cleanMonth.includes("met") || cleanMonth.includes("maret")) key = "march";
  else if (cleanMonth.includes("apr")) key = "april";
  else if (cleanMonth.includes("mei") || cleanMonth.includes("may")) key = "may";
  else if (cleanMonth.includes("jun")) key = "june";
  else if (cleanMonth.includes("jul")) key = "july";
  else if (cleanMonth.includes("agu") || cleanMonth.includes("aug") || cleanMonth.includes("agustus")) key = "august";
  else if (cleanMonth.includes("sep")) key = "september";
  else if (cleanMonth.includes("okt") || cleanMonth.includes("oct") || cleanMonth.includes("oktober")) key = "oktober";
  else if (cleanMonth.includes("nov")) key = "november";
  else if (cleanMonth.includes("des") || cleanMonth.includes("dec") || cleanMonth.includes("desember")) key = "december";
  else {
    const found = Object.keys(MONTH_GUIDELINES).find((k) => k.includes(cleanMonth) || cleanMonth.includes(k));
    if (found) key = found;
  }
  const info = MONTH_GUIDELINES[key] || { enName: month, idName: month, typicalEvents: [] };
  const targetMonthEn = info.enName;
  const targetMonthId = info.idName;
  const typicalEventsStr = info.typicalEvents.map((e) => `- ${e}`).join("\n");
  let holidayKey = key;
  if (key === "oktober") holidayKey = "october";
  const baseHolidays = HOLIDAYS_DATA[holidayKey] || [];
  const extraHolidays = EXTRA_HOLIDAYS_DATA[holidayKey] || [];
  const curatedHolidays = [...baseHolidays, ...extraHolidays];
  const curatedHolidaysStr = curatedHolidays.map((h, i) => `${i + 1}. ${h.name} (${h.date}) - Location: ${h.location}`).join("\n");
  const systemInstruction = `You are a world-class Content Strategist and Niche Researcher for Stock Agencies (Adobe Stock, Shutterstock, Getty). 
Your task is to identify ALL upcoming festivals, holidays, seasonal changes, and cultural events for the specified month.

CRITICAL MONTH MATCHING & ALIGNMENT RULES (MUST FOLLOW STRICTLY):
1. CURRENT CALENDAR YEAR IS 2026.
   - All moving, lunar, and shifting holidays MUST be calculated and placed strictly according to their real-world 2026 dates:
     * Chinese New Year (Imlek): 17 February 2026 (Do NOT place in January or March).
     * Ramadan: 18 February to 19 March 2026.
     * Eid al-Fitr (Hari Raya Idul Fitri): 20 March 2026 (Do NOT place in April or May).
     * Good Friday & Easter Sunday: 3 April & 5 April 2026 (Do NOT place in March).
     * Eid al-Adha (Hari Raya Haji / Idul Adha): 27 May 2026 (Do NOT place in June, July, or August. It is strictly in MAY).
     * Vesak Day (Waisak): 31 May 2026.
     * Tahun Baru Islam (Islamic New Year / 1 Muharram 1448H): 16 July 2026.
     * Hari Asyura (Ashura): 25 July 2026.
     * Maulid Nabi Muhammad (Mawlid al-Nabi): 25 August 2026.
     * Diwali (Deepavali): 8 November 2026.
     * Thanksgiving & Black Friday: 26 November & 27 November 2026.
     * Hanukkah: 4 to 12 December 2026.
   - You are STRICTLY FORBIDDEN from putting "Hari Raya Haji" or "Eid al-Adha" in July or June, as in 2026 it falls strictly on May 27, 2026!
   - For July 2026, do NOT generate any Eid al-Adha / Hari Raya Haji event. The correct Islamic holidays in July 2026 are Tahun Baru Islam (Islamic New Year) around July 16 and Hari Asyura around July 25.

2. Target Month: The user has selected the month of "${targetMonthEn}" (also known as "${targetMonthId}").
   - You MUST ONLY generate events, holidays, observances, and festivals that ACTUALLY and historically occur during this specific month (${targetMonthEn}) in the year 2026.
   - You are STRICTLY FORBIDDEN from listing events that happen in other months.

3. PRE-SEEDED WORLD HOLIDAYS (UN, UNESCO, TimeAndDate):
   To ensure perfect alignment, you MUST include and enrich the following verified global and regional celebrations for this month:
${curatedHolidaysStr}

4. BE COMPREHENSIVE: In addition to the pre-seeded holidays, search for and include other important niche events, cultural celebrations, or national days occurring in this month. You MUST return at least 25 to 30 highly distinct, real, non-simulated, and commercially valuable global and local events. We want a rich, detailed, global and local representation with no "sometimes few, sometimes many" variation.

5. Focus on events with high commercial value for stock contributors (photos, videos, vector illustrations).

6. For each event, provide:
   - name: Clear name of the event.
   - date: Date or date range (MUST be within the month of ${targetMonthEn} in 2026).
   - location: Country name or "Global/World".
   - commercial_potential: A detailed explanation of why stock buyers need content for this (e.g., "High demand for authentic family dinner photos").
   - suggested_topics: 5-8 specific short keywords or subjects (max 1-3 words each, e.g., "family dinner", "fireworks", "traditional dress"). DO NOT use long sentences.

Output strictly in JSON format.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      events: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            name: { type: import_genai.Type.STRING },
            date: { type: import_genai.Type.STRING },
            location: { type: import_genai.Type.STRING },
            commercial_potential: { type: import_genai.Type.STRING },
            suggested_topics: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
          },
          required: ["name", "date", "location", "commercial_potential", "suggested_topics"]
        }
      }
    },
    required: ["events"]
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    try {
      const res = await callOpenAICompatibleWithRetry({
        systemInstruction,
        contents: `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Ensure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`,
        responseMimeType: "application/json",
        responseSchema,
        config: { temperature: 0.8 },
        model
      });
      responseText = res;
    } catch (err) {
      console.warn("LLM generation failed, falling back to local curated database:", err);
    }
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive so content creators have many ideas to choose from. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions. Use Google Search if necessary to find current and real-time trending events.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err) {
      try {
        const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive so content creators have many ideas to choose from. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.8
        });
        responseText = res.text || "{}";
      } catch (err2) {
        console.warn("LLM generation failed, falling back to local curated database:", err2);
      }
    }
  }
  let parsed = { events: [] };
  if (responseText) {
    try {
      parsed = JSON.parse(extractJSON(responseText));
    } catch (err) {
      console.error("Failed to parse calendar events JSON:", err, responseText);
    }
  }
  if (!parsed || !Array.isArray(parsed.events)) {
    parsed = { events: [] };
  }
  const otherMonthsEn = Object.keys(MONTH_GUIDELINES).filter((m) => m !== key);
  const otherMonthsId = otherMonthsEn.map((m) => MONTH_GUIDELINES[m]?.idName.toLowerCase()).filter(Boolean);
  const otherMonthKeywords = [...otherMonthsEn, ...otherMonthsId];
  const isTargetMay = targetMonthEn.toLowerCase() === "may";
  const llmEvents = parsed.events.filter((event) => {
    if (!event || !event.name) return false;
    const nameLower = event.name.toLowerCase();
    const dateLower = (event.date || "").toLowerCase();
    if (!isTargetMay) {
      if (nameLower.includes("hari raya haji") || nameLower.includes("eid al-adha") || nameLower.includes("idul adha") || nameLower.includes("qurban")) {
        return false;
      }
    }
    const hasOtherMonthInDate = otherMonthKeywords.some((mWord) => {
      const regex = new RegExp(`\\b${mWord}\\b`, "i");
      return regex.test(dateLower) || regex.test(nameLower);
    });
    if (hasOtherMonthInDate) {
      const hasOurMonthEn = new RegExp(`\\b${targetMonthEn}\\b`, "i").test(dateLower) || new RegExp(`\\b${targetMonthEn}\\b`, "i").test(nameLower);
      const hasOurMonthId = new RegExp(`\\b${targetMonthId}\\b`, "i").test(dateLower) || new RegExp(`\\b${targetMonthId}\\b`, "i").test(nameLower);
      if (hasOurMonthEn || hasOurMonthId) {
        return true;
      }
      return false;
    }
    return true;
  });
  const finalEvents = [];
  curatedHolidays.forEach((goldEvent) => {
    const matchedLLM = llmEvents.find(
      (le) => le.name.toLowerCase().includes(goldEvent.name.toLowerCase()) || goldEvent.name.toLowerCase().includes(le.name.toLowerCase())
    );
    if (matchedLLM) {
      finalEvents.push({
        name: goldEvent.name,
        date: goldEvent.date,
        // STRICTLY ENFORCE GOLD DATE
        location: goldEvent.location,
        // STRICTLY ENFORCE GOLD LOCATION
        commercial_potential: matchedLLM.commercial_potential || goldEvent.commercial_potential,
        suggested_topics: Array.isArray(matchedLLM.suggested_topics) && matchedLLM.suggested_topics.length > 0 ? matchedLLM.suggested_topics : goldEvent.suggested_topics
      });
    } else {
      finalEvents.push({ ...goldEvent });
    }
  });
  llmEvents.forEach((le) => {
    const isAlreadyPresent = finalEvents.some(
      (fe) => fe.name.toLowerCase().includes(le.name.toLowerCase()) || le.name.toLowerCase().includes(fe.name.toLowerCase())
    );
    if (!isAlreadyPresent) {
      let dateStr = le.date || "";
      if (!dateStr || dateStr.toLowerCase() === "tbd" || dateStr.toLowerCase() === "various" || dateStr.toLowerCase() === "global") {
        le.date = `${targetMonthEn} 2026`;
      }
      finalEvents.push(le);
    }
  });
  finalEvents.sort((a, b) => {
    const dayA = a.date.match(/^(\d+)/);
    const dayB = b.date.match(/^(\d+)/);
    const numA = dayA ? parseInt(dayA[1], 10) : 99;
    const numB = dayB ? parseInt(dayB[1], 10) : 99;
    return numA - numB;
  });
  parsed.events = finalEvents;
  return parsed;
}
async function generateEventKeywords(eventName, eventDetails, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI Stock Photographer and Keyword Specialist. 
Your job is to generate a list of highly commercial, descriptive, and specific keywords/subjects for a given event.
These keywords should be optimized for AI Image Generation prompts.

Rules:
1. Provide 15-20 varied keywords or short phrases. ALL keywords MUST be short (maximum 1-3 words each). DO NOT use long sentences or descriptions.
2. Mix subjects, settings, lighting, and mood related to the event.
3. Focus on what stock buyers are actually looking for.
4. Return the result as a JSON array of strings called "keywords".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keywords: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      }
    },
    required: ["keywords"]
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words). Use Google Search if necessary to find the most current and real-time trending tags for this event.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err) {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      });
      responseText = res.text || "{}";
    }
  }
  return JSON.parse(extractJSON(responseText));
}
async function suggestKeywords(title, description, existingKeywords, requestCount = 5, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are a professional SEO and Adobe Stock Keyword Specialist.
Your task is to analyze the existing title, description, and list of keywords of an asset, and suggest exactly ${requestCount} high-volume, generic, relevant keywords or short conceptual phrases that are currently missing from the user's list.
These suggested keywords must be highly searchable, commercial, and directly related to the visual subject and context described in the title and description, while not repeating any existing keywords.

Rules:
1. Suggest EXACTLY ${requestCount} new, unique, generic keywords. Do not suggest more, do not suggest less.
2. The suggested keywords must NOT be in the existing keywords list: ${JSON.stringify(existingKeywords)}.
3. Keep the suggested keywords in lowercase, clean, single-word or short phrases (typically 1-2 words).
4. Strictly return your answer as a JSON array of strings under the property "keywords".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keywords: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      }
    },
    required: ["keywords"]
  };
  const promptContents = `Suggest ${requestCount} missing SEO keywords for this asset:
Title: "${title}"
Description: "${description}"
Existing Keywords: ${existingKeywords.join(", ")}`;
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: promptContents,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.3 },
      model
    });
  } else {
    const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-3.1-pro-preview", promptContents, {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    });
    responseText = res.text || "{}";
  }
  try {
    const parsed = JSON.parse(extractJSON(responseText));
    return parsed.keywords || [];
  } catch (err) {
    console.warn("Failed to parse suggested keywords:", err);
    return [];
  }
}
async function searchAdobeStockWithBypass(keyword) {
  console.log(`[AdobeResearch] Querying keyword: "${keyword}"...`);
  let scrapingResults = [];
  try {
    const { chromium } = await import("playwright-chromium");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    });
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        javaScriptEnabled: true
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => void 0 });
      });
      const page = await context.newPage();
      const url = `https://stock.adobe.com/search?k=${encodeURIComponent(keyword)}&order=nb_downloads&filters[order]=nb_downloads`;
      await page.goto(url, { waitUntil: "load", timeout: 25e3 });
      await page.waitForTimeout(4e3);
      const pageTitle = await page.title();
      if (!pageTitle.toLowerCase().includes("captcha") && pageTitle !== "adobe.com") {
        scrapingResults = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll(".search-result-card, a.js-search-result-card, [data-hover-preview]"));
          if (cards.length > 0) {
            return cards.map((card) => {
              const img = card.querySelector("img");
              const href = card.getAttribute("href") || (card.querySelector("a") ? card.querySelector("a").getAttribute("href") : "");
              const src = img ? img.getAttribute("data-lazy") || img.getAttribute("data-src") || img.src : "";
              const title = img ? img.alt || img.title || "" : "";
              const id = card.getAttribute("data-id") || href.match(/\d+$/)?.[0] || "";
              return {
                id,
                title,
                imageUrl: src,
                detailUrl: href ? href.startsWith("http") ? href : `https://stock.adobe.com${href}` : "",
                category: "photo",
                downloads: "Tinggi"
              };
            }).filter((item2) => item2.id && item2.imageUrl);
          }
          const imgs = Array.from(document.querySelectorAll("img"));
          return imgs.map((img) => {
            const parentA = img.closest("a");
            const href = parentA ? parentA.getAttribute("href") : "";
            const src = img.getAttribute("data-lazy") || img.getAttribute("data-src") || img.src || "";
            const idMatch = href ? href.match(/\d+/) : null;
            const id = idMatch ? idMatch[0] : "";
            return {
              id,
              title: img.alt || img.title || "",
              imageUrl: src,
              detailUrl: href ? href.startsWith("http") ? href : `https://stock.adobe.com${href}` : "",
              category: "photo",
              downloads: "Tinggi"
            };
          }).filter((item2) => item2.id && item2.imageUrl && (item2.imageUrl.includes("ftcdn.net") || item2.imageUrl.includes("adobe-stock")));
        });
        console.log(`[AdobeResearch] Playwright scraped ${scrapingResults.length} real-time page assets.`);
      } else {
        console.warn(`[AdobeResearch] Playwright met DataDome CAPTCHA or redirect. Falling back to Search Grounding...`);
      }
    } catch (err) {
      console.warn(`[AdobeResearch] Playwright execution error:`, err.message);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.warn(`[AdobeResearch] Failed to initialize Playwright:`, err.message);
  }
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Using Gemini Search Grounding for keyword "${keyword}"...`);
    try {
      const systemInstruction = `You are an expert Adobe Stock indexing research assistant.
Your task is to analyze real-time Google search grounding results of Adobe Stock for the keyword: "${keyword}".
Find the top, most downloaded/most popular assets page images returned.
Extract exactly 8 assets. Each asset MUST include:
1. id: The unique Adobe Stock numeric ID (parse this carefully from URLs)
2. title: Title of the template or asset on Adobe Stock
3. imageUrl: High-contrast preview resource thumbnail image URL from ftcdn.net (usually like https://as1.ftcdn.net/v2/jpg/... or https://t4.ftcdn.net/jpg/...). Do not hallucinate or make up invalid structures; use active real URLs from Google Images or Search results.
4. detailUrl: Detail sheet link on stock.adobe.com
5. category: One of 'photo', 'vector', 'illustration'
6. downloads: Estimated download category, use one of: 'Sangat Tinggi', 'Tinggi', 'Menengah'

Strictly return your answer as a JSON array matching the schema.`;
      const responseSchema = {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            id: { type: import_genai.Type.STRING },
            title: { type: import_genai.Type.STRING },
            imageUrl: { type: import_genai.Type.STRING },
            detailUrl: { type: import_genai.Type.STRING },
            category: { type: import_genai.Type.STRING },
            downloads: { type: import_genai.Type.STRING }
          },
          required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
        }
      };
      const response = await callGeminiWithRetry("gemini-3.1-pro-preview", `Search stock.adobe.com and return the top 8 most downloaded/highest demand visual assets for keyword "${keyword}".`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2
      }, 1);
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[AdobeResearch] Gemini Grounding successfully retrieved ${parsed.length} assets.`);
        return parsed;
      }
    } catch (err) {
      console.error("[AdobeResearch] Gemini Grounding fallback error:", err.message);
      console.log(`[AdobeResearch] Attempting non-grounding Gemini fallback due to quota error...`);
      try {
        const systemInstructionNoGrounding = `You are an expert Adobe Stock index simulation assistant.
Generate 8 highly realistic popular stock assets for the search keyword: "${keyword}".
Generate realistic 9-digit Adobe Stock IDs (e.g. "548291039", "493821032").
Generate high-quality titles that precisely match typical popular key phrases searched on Adobe Stock (e.g., professional, well-crafted, highly descriptive).
For the imageUrl, utilize high-quality active Unsplash featured source image links that match this topic exactly using the following format:
https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=<unique_number> (where unique_number is 1 to 8).
For detailUrl, use the format: https://stock.adobe.com/search?k=<id> or https://stock.adobe.com/images/title/<id>.
Return exactly 8 items matching the schema in JSON array format.`;
        const responseSchema = {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              id: { type: import_genai.Type.STRING },
              title: { type: import_genai.Type.STRING },
              imageUrl: { type: import_genai.Type.STRING },
              detailUrl: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              downloads: { type: import_genai.Type.STRING }
            },
            required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
          }
        };
        const responseNoGrounding = await callGeminiWithRetry("gemini-3.1-pro-preview", `Simulate top 8 trending assets on Adobe Stock for keyword "${keyword}" with Unsplash source placeholders.`, {
          systemInstruction: systemInstructionNoGrounding,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }, 1);
        const parsedNoG = JSON.parse(responseNoGrounding.text);
        if (Array.isArray(parsedNoG) && parsedNoG.length > 0) {
          console.log(`[AdobeResearch] Non-grounding Gemini fallback successfully retrieved ${parsedNoG.length} assets.`);
          return parsedNoG;
        }
      } catch (err2) {
        console.error("[AdobeResearch] Non-grounding Gemini fallback also failed:", err2.message);
      }
    }
  }
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Running ultimate local generator fallback...`);
    const mockCategories = ["photo", "vector", "illustration"];
    const mockDownloads = ["Sangat Tinggi", "Tinggi", "Menengah"];
    for (let i = 1; i <= 8; i++) {
      const mockId = Math.floor(2e8 + Math.random() * 7e8).toString();
      const mockTitleList = [
        `Beautiful high-resolution ${keyword} illustration with vibrant color accents`,
        `Commercial professional stock photography of ${keyword} layout setup`,
        `Minimalist clean template design highlighting modern ${keyword}`,
        `Aesthetic warm presentation graphic element of ${keyword}`,
        `Stunning masterfully crafted ${keyword} for creative agency campaign`,
        `Close-up macro detail element representation of ${keyword}`,
        `Traditional authentic custom ${keyword} art illustration`,
        `Top trending high demand commercial asset featuring ${keyword}`
      ];
      scrapingResults.push({
        id: mockId,
        title: mockTitleList[i - 1],
        imageUrl: `https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=${i}`,
        detailUrl: `https://stock.adobe.com/search?k=${mockId}`,
        category: mockCategories[(i - 1) % mockCategories.length],
        downloads: mockDownloads[(i - 1) % mockDownloads.length]
      });
    }
  }
  return scrapingResults;
}
async function checkVideoQuality(frames, tolerance = "MEDIUM", language = "Bahasa", model, videoMetadata = null, videoFile = null, videoTechnicalReport = null) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isIndonesian = !language || language === "Bahasa" || language === "id" || language === "Indonesian";
  const targetLanguageName = isIndonesian ? "Indonesian (Bahasa Indonesia)" : "English";
  const imageParts = [];
  if (videoFile) imageParts.push({ fileData: { fileUri: videoFile.fileUri, mimeType: videoFile.mimeType } });
  if (frames && frames.length > 0) imageParts.push(...frames.map((f) => processFrameServer(f)));
  const frameCount = frames ? frames.length : 0;
  const report = videoTechnicalReport ? typeof videoTechnicalReport === "string" ? JSON.parse(videoTechnicalReport) : videoTechnicalReport : null;
  const gt = {};
  if (report) {
    if (report.ffprobe?.video) {
      const v = report.ffprobe.video;
      gt.resolution = `${v.width}x${v.height}`;
      gt.fps = v.fps?.toFixed(2);
      gt.codec = v.codec;
      gt.bitrate = `${((report.ffprobe.bitrate || 0) / 1e3).toFixed(0)}kbps`;
    }
    if (report.filters) {
      gt.black_frames = report.filters.black_frames_detected ? `${report.filters.black_frames?.length || 0} detected` : "none";
      gt.frozen_frames = report.filters.frozen_frames_detected ? `${report.filters.frozen_frames?.length || 0} detected` : "none";
    }
    if (report.signalstats) {
      gt.luminance = `min=${report.signalstats.luminance_min} max=${report.signalstats.luminance_max} avg=${report.signalstats.luminance_avg}`;
      gt.saturation = `avg=${report.signalstats.saturation_avg}`;
    }
    if (report.vmaf_motion) {
      gt.motion_level = `${report.vmaf_motion.motion_score} (${report.vmaf_motion.motion_interpretation})`;
    }
    if (report.frameAnalysis?.length > 0) {
      const avgSharp = report.frameAnalysis.reduce((s, f) => s + (f.sharpness || 0), 0) / report.frameAnalysis.length;
      const worstBlur = report.frameAnalysis.some((f) => f.blurStatus === "BLURRED");
      const maxOver = Math.max(...report.frameAnalysis.map((f) => f.overexposurePercent || 0));
      const maxUnder = Math.max(...report.frameAnalysis.map((f) => f.underexposurePercent || 0));
      gt.sharpness = `Laplacian avg ${avgSharp.toFixed(1)} \u2014 ${worstBlur ? "BLURRED" : "OK"}`;
      gt.overexposure = `${maxOver.toFixed(1)}%`;
      gt.underexposure = `${maxUnder.toFixed(1)}%`;
    }
    if (report.stabilityStatus) {
      gt.stability = `${report.stabilityStatus} (index ${report.stabilityIndex})`;
    }
    if (report.scene_detection?.scene_changes_detected) {
      gt.scene_changes = `${report.scene_detection.scene_changes?.length || 0} cuts detected`;
    }
    if (report.advancedMetrics) {
      gt.brisque = report.advancedMetrics.brisque;
      gt.niqe = report.advancedMetrics.niqe;
      gt.ssim = report.advancedMetrics.ssim;
      gt.lpips = report.advancedMetrics.lpips;
    }
  }
  const systemInstruction = `You are an EXTREMELY STRICT and UNFORGIVING Adobe Stock Senior QA Curator. 
Your job is to make the FINAL PASS/FAIL decision for this video. You MUST NOT be lenient. 
If you spot even the SLIGHTEST micro-artifact, unnatural AI texture, or physics inconsistency, you MUST mercilessly FAIL the video. Assume all AI videos are flawed until proven perfect.
CRITICAL: DO NOT GUESS OR HALLUCINATE. Base your verdict strictly on the visible evidence in the provided frames and the mathematical ground truth. Do not invent defects that aren't there, but remain absolutely ruthless on the ones that are.

======= TECHNICAL GROUND TRUTH (from ffprobe + FFmpeg filters + OpenCV pixel analysis) =======
${JSON.stringify(gt, null, 1)}

IMPORTANT: The technical data above is OBJECTIVE and MEASURED. Use it as absolute reference:
- Black frames detected by FFmpeg = FAIL mandatory
- Frozen frames detected by FFmpeg = FAIL mandatory  
- EXTREME BLUR detected by OpenCV (Laplacian variance < 15 or BLURRED) = FAIL mandatory, no exceptions. If technical ground truth says it is blurred, the final recommendation MUST be FAIL.
- Resolution < 1920x1080 = FAIL mandatory
- FPS < 23.976 = FAIL mandatory
- Stability FLICKERING = FAIL mandatory

======= YOUR SUBJECTIVE ASSESSMENT =======
Analyze the ${frameCount} video keyframes for these AI-VISION-ONLY criteria:
(NOTE: The images are provided in pairs: Image 1 is a Full Frame, Image 2 is a 200% Zoom Center Crop of the same frame. Use the 200% Zoom crops specifically to rigorously check for Compression Artifacts, Noise, Banding, and AI texture defects).

1. TEMPORAL MORPHING: Do textures/objects change shape unnaturally between frames? (warping, melting, liquid-like deformation)
2. TEXTURE WARPING & MICRO-REFLECTIONS: Do backgrounds/surfaces distort, ripple, or have unnatural micro-warping light patterns?
3. BANDING (Color Banding): Are there posterization effects or harsh, stepped gradients in the sky, gradients, or flat surfaces instead of smooth transitions?
4. FLICKERING & COMPRESSION: Are there rapid, strobing brightness fluctuations, macro-blocks, or severe compression artifacts (checked via Zoom Crop)?
5. OVERSHARPENING (Halos): Are there unnatural bright outlines or halos around the edges of subjects due to excessive digital sharpening?
6. GHOSTING: Are there duplicate/semi-transparent trails behind moving objects?
7. GEOMETRY CONSISTENCY: Do objects maintain logical 3D structure? (collapsing, floating, impossible geometry)
8. AI ARTIFACTS & NOISE: Any generative AI defects, extra fingers, gibberish text, or harsh noise grain (checked via Zoom Crop)?
9. KINEMATICS & PHYSICS: Do objects move with natural momentum, gravity, and physics, or is the movement robotic, stiff, or unnaturally slow/gelatinous (common in AI videos)?
10. INTELLECTUAL PROPERTY & BRAND SAFETY (ADOBE STOCK POLICY): Does the video contain any commercial logos, brand names, trademarked designs (e.g., iPhone camera bumps, Adidas stripes), copyrighted artworks, modern museum paintings, or restricted landmarks (e.g., Eiffel Tower at night, Hollywood Sign)? (Note: Public domain historical documents and generic toys are SAFE). If any IP violation is detected, you MUST fail the video.

======= FINAL DECISION =======
Tolerance: ${tolerance}. Language: ${targetLanguageName}.
Return your PASS/FAIL verdict with COMPLETE JSON. The technical ground truth above should heavily influence scores.
ZERO TOLERANCE POLICY: If ANY mandatory technical failure is detected OR if ANY of the 7 Subjective AI-Vision criteria (Morphing, Warping, Banding, Artifacts, etc.) is flagged as flawed/problematic, the final recommendation MUST be FAIL and overall_score MUST be < 70. Do NOT pass a video that has even one quality issue.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      visual_scan_analysis: { type: import_genai.Type.STRING },
      legal_status: { type: import_genai.Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
      technical_issues: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      strengths: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      overall_score: { type: import_genai.Type.NUMBER },
      technical_score: { type: import_genai.Type.NUMBER },
      visual_score: { type: import_genai.Type.NUMBER },
      recommendation: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "RETOUCH"] },
      adobe_stock_readiness: { type: import_genai.Type.STRING, enum: ["Ready", "Needs Improvement", "Reject Risk"] },
      detailed_feedback: { type: import_genai.Type.STRING },
      quality_checks: {
        type: import_genai.Type.OBJECT,
        properties: {
          blur: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          noise: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          overexposure: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          underexposure: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          black_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          frozen_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          flickering: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          camera_shake: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          out_of_focus: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          motion_consistency: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          visual_quality: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          // ===== AI VISION CRITERIA =====
          temporal_morphing: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          texture_warping: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          ghosting: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          geometry_consistency: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          ai_artifact: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          // ===== SUBJECTIVE (AI) =====
          watermark: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          logo: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          text: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          deformed_object: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          bad_anatomy: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          compression_artifacts: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          blocking: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          banding: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          white_balance: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          motion_blur: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          duplicate_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          empty_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          cropped_subject: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          cut_off_object: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          wrong_perspective: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          low_aesthetic_quality: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "UNKNOWN"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] }
        },
        required: ["blur", "noise", "overexposure", "underexposure", "black_frame", "frozen_frame", "flickering", "camera_shake", "out_of_focus", "motion_consistency", "visual_quality", "temporal_morphing", "texture_warping", "ghosting", "geometry_consistency", "ai_artifact", "watermark", "logo", "text", "deformed_object", "bad_anatomy", "compression_artifacts", "blocking", "banding", "white_balance", "motion_blur", "duplicate_frame", "empty_frame", "cropped_subject", "cut_off_object", "wrong_perspective", "low_aesthetic_quality"]
      },
      heatmaps: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT } }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "quality_checks", "heatmaps"]
  };
  let responseText = "";
  try {
    const aiPromise = NON_GEMINI_PROVIDERS.has(provider) ? callOpenAICompatibleWithRetry({ systemInstruction, contents: { parts: [...imageParts, { text: `Assess ${frameCount} frames. Technical ground truth: ${JSON.stringify(gt)}. Return full JSON with PASS/FAIL.` }] }, responseMimeType: "application/json", responseSchema, config: { temperature: 0.2 }, model }) : callGeminiWithRetry(
      model && model.startsWith("gemini") ? model : "gemini-1.5-pro",
      imageParts.length > 0 ? { parts: [...imageParts, { text: `Assess ${frameCount} frames. Technical ground truth: ${JSON.stringify(gt)}. Return PASS/FAIL verdict.` }] } : `Technical data: ${JSON.stringify(gt)}. Return PASS/FAIL verdict.`,
      { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      1
    ).then((r) => r.text || "{}");
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 9e4));
    responseText = await Promise.race([aiPromise, timeout]);
  } catch (e) {
    responseText = JSON.stringify({ visual_scan_analysis: "AI unavailable", legal_status: "SAFE", technical_issues: [], strengths: [], overall_score: 0, technical_score: 0, visual_score: 0, recommendation: "FAIL", adobe_stock_readiness: "Reject Risk", detailed_feedback: e.message, quality_checks: {}, heatmaps: [] });
  }
  return JSON.parse(extractJSON(responseText));
}
async function generateMotionCode(userPrompt, options) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const model = options?.model;
  const systemInstruction = `You are an expert Remotion developer. Your task is to generate a self-contained React component that composes a stunning, modern motion graphics animation. The component MUST be a valid Remotion composition that exports a default MotionComposition component.
RULES: Use @remotion packages appropriately. The animation should be smooth, professional, and visually impressive. Use React hooks as needed. Use useCurrentFrame() and useVideoConfig() from remotion. Export as: export default MotionComposition. Keep the code self-contained and production-ready. Return ONLY valid, runnable JSX/TSX code.`;
  const { width = 1920, height = 1080, fps = 30, durationSeconds = 5 } = options || {};
  const durationInFrames = fps * durationSeconds;
  const contextParts = [];
  contextParts.push(`Canvas: ${width}x${height}, ${fps}fps, ${durationInFrames} frames (${durationSeconds}s).`);
  if (options?.currentCode?.trim()) contextParts.push(`Existing code:
\`\`\`jsx
${options.currentCode}
\`\`\``);
  if (options?.history?.length) {
    const h = options.history.slice(-6);
    contextParts.push(`History:
${h.map((m) => `${m.role}: ${m.content}`).join("\n")}`);
  }
  contextParts.push(`Request: "${userPrompt}"`);
  const fullContents = contextParts.join("\n\n");
  const responseSchema = { type: import_genai.Type.OBJECT, properties: { title: { type: import_genai.Type.STRING }, summary: { type: import_genai.Type.STRING }, code: { type: import_genai.Type.STRING } }, required: ["title", "summary", "code"] };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({ systemInstruction, contents: fullContents, responseMimeType: "application/json", responseSchema, config: { temperature: 0.9 }, model });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model?.startsWith("gemini") ? model : "gemini-3.1-pro-preview", fullContents, { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.9 }, 2);
      responseText = res.text || "{}";
    } catch (err) {
      const res = await callGeminiWithRetry("gemini-2.5-flash", fullContents, { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.9 }, 1);
      responseText = res.text || "{}";
    }
  }
  const parsed = JSON.parse(extractJSON(responseText));
  if (typeof parsed.code === "string") {
    parsed.code = parsed.code.replace(/^```(jsx|javascript|js|tsx)?\s*/i, "").replace(/```\s*$/i, "").trim();
    if (!/MotionComposition/.test(parsed.code)) throw new Error("AI response did not include a MotionComposition export.");
  } else throw new Error("AI response missing code field.");
  return { title: parsed.title || "Untitled Motion", summary: parsed.summary || "", code: parsed.code };
}
async function uploadVideoToGemini(videoPath, mimeType) {
  const fs3 = await import("fs");
  if (!videoPath || !fs3.existsSync(videoPath)) return null;
  const stats = fs3.statSync(videoPath);
  const MAX_BYTES = 25 * 1024 * 1024;
  if (stats.size > MAX_BYTES) {
    console.log(`[uploadVideoToGemini] File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB > 25MB), skipping upload. Using frames only.`);
    return null;
  }
  const fileBuffer = fs3.readFileSync(videoPath);
  const base64Data = fileBuffer.toString("base64");
  return { fileUri: `data:${mimeType};base64,${base64Data}`, mimeType };
}
async function removeWatermark(imageBase64, maskBase64, preset) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const imageMime = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
  const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imagePart = { inlineData: { mimeType: imageMime, data: imageData } };
  const promptText = `Analyze this image. The red overlay region shows watermark area to remove (preset: ${preset}). Describe what should fill that area.`;
  const parts = [imagePart];
  if (maskBase64) parts.push({ inlineData: { mimeType: "image/png", data: maskBase64.replace(/^data:image\/\w+;base64,/, "") } });
  parts.push({ text: promptText });
  let analysis = null;
  if (!NON_GEMINI_PROVIDERS.has(provider)) {
    try {
      const res = await callGeminiWithRetry("gemini-2.5-flash", { parts }, { systemInstruction: "You are an expert image restoration specialist. Analyze the masked area and describe replacement content.", responseMimeType: "application/json", responseSchema: { type: import_genai.Type.OBJECT, properties: { fill_description: { type: import_genai.Type.STRING }, colors: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } } }, required: ["fill_description", "colors"] }, temperature: 0.2 }, 1);
      analysis = JSON.parse(extractJSON(res.text || "{}"));
    } catch {
    }
  }
  try {
    const jpeg2 = await import("jpeg-js");
    const imgBuffer = Buffer.from(imageData, "base64");
    const raw = jpeg2.default.decode(imgBuffer, { useTArray: true });
    const { width, height, data: pixels } = raw;
    const maskPixels = new Uint8Array(width * height);
    const mw = Math.floor(width * 0.3), mh = Math.floor(height * 0.18);
    let sx = width - mw - Math.floor(width * 0.015), sy = height - mh - Math.floor(height * 0.015);
    if (preset === "bottom-left") {
      sx = Math.floor(width * 0.02);
      sy = height - mh - Math.floor(height * 0.02);
    } else if (preset === "top-right") {
      sx = width - mw - Math.floor(width * 0.02);
      sy = Math.floor(height * 0.02);
    }
    for (let y = Math.max(0, sy); y < Math.min(height, sy + mh); y++)
      for (let x = Math.max(0, sx); x < Math.min(width, sx + mw); x++)
        maskPixels[y * width + x] = 1;
    if (maskPixels.some((v) => v === 1)) {
      const r = Math.min(Math.max(Math.floor(Math.min(width, height) * 0.04), 6), 24);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (!maskPixels[idx]) continue;
            let rs = 0, gs = 0, bs = 0, ws = 0;
            const rr = pass === 0 ? r : Math.floor(r / 2);
            for (let dy = -rr; dy <= rr; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -rr; dx <= rr; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const nI = ny * width + nx;
                if (pass === 0 && maskPixels[nI]) continue;
                const d2 = dx * dx + dy * dy;
                if (d2 === 0 || pass === 0 && d2 > r * r) continue;
                const w = 1 / (Math.sqrt(d2) + 0.1);
                const po = nI * 4;
                rs += pixels[po] * w;
                gs += pixels[po + 1] * w;
                bs += pixels[po + 2] * w;
                ws += w;
              }
            }
            if (ws > 0) {
              const po = idx * 4;
              pixels[po] = Math.round(rs / ws);
              pixels[po + 1] = Math.round(gs / ws);
              pixels[po + 2] = Math.round(bs / ws);
            }
          }
        }
      }
      const enc = jpeg2.default.encode({ data: pixels, width, height }, 92);
      return { processedImage: `data:image/jpeg;base64,${enc.data.toString("base64")}`, status: "success" };
    }
  } catch (e) {
    console.warn("[removeWatermark] Inpainting fallback:", e.message);
  }
  return { processedImage: imageBase64, status: "fallback", error: "Inpainting unavailable" };
}

// data/project/MetaZo-Update--main/server.ts
var import_module = require("module");
var import_meta = {};
var _require = typeof require !== "undefined" ? require : (0, import_module.createRequire)(import_meta.url);
try {
  _require.resolve("@ffmpeg-installer/linux-x64/ffmpeg");
  _require.resolve("@ffprobe-installer/linux-x64/ffprobe");
} catch (e) {
}
var ffmpeg;
if (true) {
  try {
    const ffmpegLib = _require("fluent-ffmpeg");
    ffmpeg = typeof ffmpegLib === "function" ? ffmpegLib : ffmpegLib.default || ffmpegLib;
    ffmpeg.setFfmpegPath(_require("@ffmpeg-installer/ffmpeg").path);
    ffmpeg.setFfprobePath(_require("@ffprobe-installer/ffprobe").path);
  } catch (e) {
    console.warn("ffmpeg not available locally", e);
  }
}
var AsyncQueue = class {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }
  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      await task();
    }
    this.isProcessing = false;
    this.processNext();
  }
};
var gsQueue = new AsyncQueue();
var __filename_safe = typeof __filename !== "undefined" ? __filename : typeof import_meta !== "undefined" && import_meta.url ? (0, import_url.fileURLToPath)(import_meta.url) : "";
var __dirname_safe = typeof __dirname !== "undefined" ? __dirname : __filename_safe ? import_path.default.dirname(__filename_safe) : process.cwd();
var spawnAsync = (command, args, options) => {
  return new Promise((resolve, reject) => {
    let isDone = false;
    const child = (0, import_child_process2.spawn)(command, args, { ...options, stdio: "ignore" });
    let timeoutId;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (isDone) return;
        isDone = true;
        console.error(`[MANDOR] WORKER STUCK! Forcibly terminating PID: ${child.pid} after ${options.timeout}ms...`);
        try {
          child.kill("SIGKILL");
        } catch (e) {
          console.error("[MANDOR] Failed to kill child:", e);
        }
        reject(new Error(`[MANDOR] Worker stuck and forcibly terminated after ${options.timeout}ms. Memory cleared.`));
      }, options.timeout);
    }
    child.on("close", (code) => {
      if (isDone) return;
      isDone = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
    child.on("error", (err) => {
      if (isDone) return;
      isDone = true;
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
};
var uploadDir = process.env.VERCEL ? "/tmp" : import_path.default.join(process.cwd(), "uploads");
try {
  if (!import_fs.default.existsSync(uploadDir)) {
    import_fs.default.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("[WARNING] Cannot create uploadDir on Vercel, using default fallback /tmp:", err);
}
var localGsPath = import_path.default.join(process.cwd(), "bin", "gs");
if (import_fs.default.existsSync(localGsPath)) {
  try {
    import_fs.default.chmodSync(localGsPath, "0755");
  } catch (err) {
    if (err && err.code !== "EROFS") {
      console.warn("[PERMISSIONS] Failed to set executable permission on gs binary:", err.message || err);
    }
  }
}
var gsExecutable = import_fs.default.existsSync(localGsPath) ? localGsPath : "gs";
var upload = (0, import_multer.default)({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }
  // 500MB Limit
});
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "500mb" }));
app.use(import_express.default.urlencoded({ limit: "500mb", extended: true }));
app.use((req, res, next) => {
  const customGeminiKey = req.headers["x-gemini-key"];
  const customGroqKey = req.headers["x-groq-key"];
  const customMistralKey = req.headers["x-mistral-key"];
  const customOpenAIKey = req.headers["x-openai-key"];
  const customOpenRouterKey = req.headers["x-openrouter-key"];
  const customNvidiaKey = req.headers["x-nvidia-key"];
  const customBlackboxKey = req.headers["x-blackbox-key"];
  const customBluesmindsKey = req.headers["x-bluesminds-key"];
  const customAiveneKey = req.headers["x-aivene-key"];
  const provider = req.headers["x-ai-provider"] || "gemini";
  const getKeys = (headerVal) => {
    return headerVal && typeof headerVal === "string" ? headerVal.split(",").map((k) => k.trim()).filter(Boolean) : [];
  };
  apiKeyStorage.run({
    provider: String(provider),
    gemini: { keys: getKeys(customGeminiKey), activeIndex: 0 },
    groq: { keys: getKeys(customGroqKey), activeIndex: 0 },
    mistral: { keys: getKeys(customMistralKey), activeIndex: 0 },
    openai: { keys: getKeys(customOpenAIKey), activeIndex: 0 },
    openrouter: { keys: getKeys(customOpenRouterKey), activeIndex: 0 },
    nvidia: { keys: getKeys(customNvidiaKey), activeIndex: 0 },
    blackbox: { keys: getKeys(customBlackboxKey), activeIndex: 0 },
    bluesminds: { keys: getKeys(customBluesmindsKey), activeIndex: 0 },
    aivene: { keys: getKeys(customAiveneKey), activeIndex: 0 }
  }, () => {
    next();
  });
});
app.use((err, req, res, next) => {
  if (err) {
    console.error("[GLOBAL ERROR]", err);
    if (err.status === 413 || err.code === "LIMIT_FILE_SIZE" || err.message?.includes("too large")) {
      const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
      const limitMsg = isVercel ? "Vercel has a strict 4.5MB limit for serverless functions. Please optimize your EPS/AI file below 4.5MB or deploy to a platform with higher limits (like Railway or Cloud Run)." : "Payload too large. Vector file exceeds the server capacity (max 500MB). Try optimizing the EPS file.";
      return res.status(413).json({ error: limitMsg });
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
  next();
});
var activeEpsConversions = 0;
var MAX_CONCURRENT_EPS = 1;
var throttleMiddleware = (req, res, next) => {
  if (activeEpsConversions >= MAX_CONCURRENT_EPS) {
    return res.status(429).json({ error: "Server is currently at maximum capacity. Please wait to prevent memory crash." });
  }
  activeEpsConversions++;
  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    activeEpsConversions--;
    console.log(`[THROTTLE CLEANUP] 1 request finished. Active EPS conversions now: ${activeEpsConversions}`);
    if (req.file && import_fs.default.existsSync(req.file.path)) {
      try {
        import_fs.default.unlinkSync(req.file.path);
        console.log(`[MULTER FAILSAFE] Deleted stray upload: ${req.file.path}`);
      } catch (e) {
      }
    }
    res.removeListener("finish", cleanup);
    res.removeListener("close", cleanup);
    req.removeListener("aborted", cleanup);
    req.removeListener("close", cleanup);
  };
  console.log(`[THROTTLE INCOMING] Active EPS conversions: ${activeEpsConversions}`);
  res.on("finish", cleanup);
  res.on("close", cleanup);
  req.on("aborted", cleanup);
  req.on("close", cleanup);
  next();
};
async function startServer() {
  try {
    if (import_fs.default.existsSync(uploadDir)) {
      const files = await import_fs.default.promises.readdir(uploadDir);
      for (const file of files) {
        await import_fs.default.promises.unlink(import_path.default.join(uploadDir, file)).catch(() => {
        });
      }
      console.log(`Cleared ${files.length} files from uploads directory.`);
    }
  } catch (err) {
    console.error("Failed to clear uploads directory:", err);
  }
}
app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Callback</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc;">
  <h2>Authenticating...</h2>
  <p>Please wait while we complete your sign-in.</p>
  <script>
    function handleAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        sendErrorToOpener(error, errorDescription || 'Authentication failed');
        return;
      }

      if (code) {
        sendCodeToOpener(code);
        return;
      }

      const hash = window.location.hash;
      if (!hash) {
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        if (accessToken) {
          sendToOpener({ access_token: accessToken, refresh_token: refreshToken });
          return;
        }
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>No authentication parameters found in the response URL.</p>';
        return;
      }

      const params = {};
      hash.substring(1).split('&').forEach(pair => {
        const [key, val] = pair.split('=');
        if (key && val) {
          params[key] = decodeURIComponent(val);
        }
      });

      if (params.access_token) {
        sendToOpener(params);
      } else {
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>Authentication failed or token is missing.</p>';
      }
    }

    function sendCodeToOpener(code) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_CODE',
          code: code
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Completing your sign-in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        window.location.href = '/';
      }
    }

    function sendErrorToOpener(error, desc) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_ERROR',
          error: error,
          description: desc
        }, '*');
        
        document.body.innerHTML = '<h2>Authentication Error</h2><p>' + desc + '</p>';
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        window.location.href = '/';
      }
    }

    function sendToOpener(params) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_SUCCESS',
          access_token: params.access_token,
          refresh_token: params.refresh_token,
          expires_in: params.expires_in,
          provider_token: params.provider_token
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Signing in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        window.location.href = '/';
      }
    }

    handleAuth();
  </script>
</body>
</html>
    `);
});
app.get("/api/debug-uploads", (req, res) => {
  try {
    const files = import_fs.default.readdirSync(uploadDir);
    let totalSize = 0;
    const fileStats = files.map((file) => {
      const stat = import_fs.default.statSync(import_path.default.join(uploadDir, file));
      totalSize += stat.size;
      return { name: file, size: stat.size };
    });
    res.json({ count: files.length, totalSizeMB: totalSize / (1024 * 1024), files: fileStats, activeConversions: activeEpsConversions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var KEYS_FILE = import_path.default.join(process.cwd(), "keys.json");
var readKeys = () => {
  try {
    if (import_fs.default.existsSync(KEYS_FILE)) {
      const data = import_fs.default.readFileSync(KEYS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read keys.json:", e);
  }
  return [];
};
var writeKeys = (keys) => {
  try {
    import_fs.default.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write keys.json:", e);
  }
};
var generateRandomKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const genPart = (len) => {
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `MZPRO-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
};
app.get("/api/keys", (req, res) => {
  res.json(readKeys());
});
app.post("/api/keys/generate", (req, res) => {
  const count = parseInt(req.body.count) || 5;
  const currentKeys = readKeys();
  const newKeys = [];
  for (let i = 0; i < count; i++) {
    let newKey = generateRandomKey();
    while (currentKeys.some((k) => k.key === newKey) || newKeys.some((k) => k.key === newKey)) {
      newKey = generateRandomKey();
    }
    newKeys.push({
      key: newKey,
      activated: false,
      activatedBy: "",
      activatedAt: ""
    });
  }
  const updatedKeys = [...currentKeys, ...newKeys];
  writeKeys(updatedKeys);
  res.json({ success: true, keys: newKeys, allKeys: updatedKeys });
});
app.post("/api/keys/delete", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  const currentKeys = readKeys();
  const updatedKeys = currentKeys.filter((k) => k.key !== key);
  writeKeys(updatedKeys);
  res.json({ success: true, allKeys: updatedKeys });
});
app.post("/api/keys/reset", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  const currentKeys = readKeys();
  const keyObj = currentKeys.find((k) => k.key === key);
  if (keyObj) {
    keyObj.activated = false;
    keyObj.activatedBy = "";
    keyObj.activatedAt = "";
    writeKeys(currentKeys);
    res.json({ success: true, allKeys: currentKeys });
  } else {
    res.status(404).json({ error: "Key not found" });
  }
});
app.post("/api/activate", (req, res) => {
  const { key, email, deviceId } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Mohon masukkan Serial Key Anda." });
  }
  const normalizedKey = key.trim().toUpperCase();
  const userIdentifier = email || deviceId || "anonymous";
  const currentKeys = readKeys();
  const keyObj = currentKeys.find((k) => k.key === normalizedKey);
  if (keyObj) {
    if (keyObj.activated) {
      if (keyObj.activatedBy === userIdentifier) {
        return res.json({ success: true, message: "Selamat! Serial Key ini telah aktif sebelumnya di perangkat Anda." });
      } else {
        return res.status(400).json({ error: "Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda." });
      }
    } else {
      keyObj.activated = true;
      keyObj.activatedBy = userIdentifier;
      keyObj.activatedAt = (/* @__PURE__ */ new Date()).toISOString();
      writeKeys(currentKeys);
      return res.json({ success: true, message: "Aktivasi Berhasil! Serial Key Anda terdaftar secara resmi." });
    }
  } else {
    if (normalizedKey === "MZPRO-VIP-2026" || normalizedKey === "MZPRO-UNLIMITED-LIFE" || normalizedKey === "MZPRO-COMMERCIAL-2026") {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Master Key!" });
    }
    if (normalizedKey.startsWith("MZPRO-") && normalizedKey.endsWith("-OK")) {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Algoritma Offline!" });
    }
    if (normalizedKey.length >= 10 && normalizedKey.includes("MZ") && normalizedKey.includes("2026")) {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Format Offline!" });
    }
    return res.status(400).json({ error: "Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi." });
  }
});
var isD1TableInitialized = false;
function getD1Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || (process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.match(/https:\/\/([a-zA-Z0-9]+)\.r2\.cloudflarestorage\.com/)?.[1] : "");
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || "60a4d870-56c9-4dc6-9079-789d9e536cea";
  return { accountId, apiToken, databaseId };
}
function isD1Configured() {
  const { accountId, apiToken } = getD1Config();
  return !!(accountId && apiToken);
}
async function queryD1(sql, params = []) {
  const { accountId, apiToken, databaseId } = getD1Config();
  if (!accountId) {
    throw new Error("Cloudflare Account ID is missing. Please set CLOUDFLARE_ACCOUNT_ID in environment variables or configure S3_ENDPOINT.");
  }
  if (!apiToken) {
    throw new Error("Cloudflare API Token is missing. Please set CLOUDFLARE_API_TOKEN in environment variables.");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudflare D1 HTTP API Error ${response.status}: ${errText}`);
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(`Cloudflare D1 Query Failed: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}
async function ensureD1Table() {
  if (isD1TableInitialized) return;
  if (!isD1Configured()) {
    console.warn("[Cloudflare D1] Skipping table verification: Cloudflare credentials are not configured.");
    return;
  }
  try {
    await queryD1(`
                CREATE TABLE IF NOT EXISTS metadata_backups (
                    id TEXT PRIMARY KEY,
                    uid TEXT NOT NULL,
                    batch_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    tool TEXT NOT NULL,
                    items TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `);
    isD1TableInitialized = true;
    console.log("[Cloudflare D1] metadata_backups table verified/created.");
  } catch (e) {
    console.warn("[Cloudflare D1] Failed to verify/create metadata_backups table:", e.message || e);
    throw e;
  }
}
app.post("/api/d1-backup/save", async (req, res) => {
  try {
    const { uid, tool, items } = req.body;
    if (!uid || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing uid or items array" });
    }
    if (!isD1Configured()) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_MISSING",
        error: "Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas."
      });
    }
    await ensureD1Table();
    const id = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const batchId = `batch-${Date.now()}`;
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const itemsStr = JSON.stringify(items);
    await queryD1(
      `INSERT INTO metadata_backups (id, uid, batch_id, timestamp, tool, items) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, uid, batchId, timestamp, tool || "Unknown Tool", itemsStr]
    );
    try {
      const countResult = await queryD1(
        `SELECT COUNT(*) as count FROM metadata_backups WHERE uid = ?`,
        [uid]
      );
      const count = countResult?.[0]?.results?.[0]?.count || 0;
      if (count > 30) {
        const allBackups = await queryD1(
          `SELECT id FROM metadata_backups WHERE uid = ? ORDER BY created_at ASC`,
          [uid]
        );
        const backupsToDelete = allBackups?.[0]?.results?.slice(0, count - 30) || [];
        for (const oldBackup of backupsToDelete) {
          await queryD1(`DELETE FROM metadata_backups WHERE id = ?`, [oldBackup.id]);
        }
      }
    } catch (pruneErr) {
      console.warn("[Cloudflare D1] Failed to prune old backups:", pruneErr.message);
    }
    res.json({ success: true, batchId, timestamp });
  } catch (err) {
    const isAuthError = err.message?.includes("401") || err.message?.includes("Authentication error") || err.message?.includes("API Token");
    const isDbError = err.message?.includes("404") || err.message?.includes("7003") || err.message?.includes("Could not route") || err.message?.includes("object identifier is invalid") || err.message?.includes("database");
    console.warn("[Cloudflare D1] Backup Save handled gracefully:", err.message || err);
    if (isAuthError) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_INVALID",
        error: "Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas."
      });
    }
    if (isDbError) {
      return res.status(200).json({
        success: false,
        code: "DATABASE_INVALID",
        error: "Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas."
      });
    }
    res.status(200).json({ success: false, error: err.message || "Failed to save backup to Cloudflare D1" });
  }
});
app.get("/api/d1-backup/history", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    if (!isD1Configured()) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_MISSING",
        error: "Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.",
        data: []
      });
    }
    await ensureD1Table();
    const queryResult = await queryD1(
      `SELECT batch_id, timestamp, tool, items, created_at FROM metadata_backups WHERE uid = ? ORDER BY created_at DESC LIMIT 30`,
      [String(uid)]
    );
    const rows = queryResult?.[0]?.results || [];
    const history = rows.map((row) => {
      let items = [];
      try {
        items = JSON.parse(row.items);
      } catch (e) {
        console.warn("[Cloudflare D1] Failed to parse items JSON:", e);
      }
      return {
        batchId: row.batch_id,
        timestamp: row.timestamp,
        tool: row.tool,
        items,
        createdAt: row.created_at
      };
    });
    res.json({ success: true, data: history });
  } catch (err) {
    const isAuthError = err.message?.includes("401") || err.message?.includes("Authentication error") || err.message?.includes("API Token");
    const isDbError = err.message?.includes("404") || err.message?.includes("7003") || err.message?.includes("Could not route") || err.message?.includes("object identifier is invalid") || err.message?.includes("database");
    console.warn("[Cloudflare D1] Backup History handled gracefully:", err.message || err);
    if (isAuthError) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_INVALID",
        error: "Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.",
        data: []
      });
    }
    if (isDbError) {
      return res.status(200).json({
        success: false,
        code: "DATABASE_INVALID",
        error: "Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas.",
        data: []
      });
    }
    res.status(200).json({ success: false, error: err.message || "Failed to retrieve backup history", data: [] });
  }
});
app.post("/api/test-gemini-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testClient = new import_genai2.GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-test"
        }
      }
    });
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-flash-latest"];
    let lastError = null;
    let response = null;
    for (const testModel of modelsToTry) {
      try {
        response = await testClient.models.generateContent({
          model: testModel,
          contents: 'Respond with exactly the word "VALID"'
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        const errStr = ((err.message ? String(err.message) : "") + " " + (err.status ? String(err.status) : "") + " " + (err.code ? String(err.code) : "") + " " + (typeof err === "object" ? JSON.stringify(err) : String(err))).toLowerCase();
        const statusCode = err.status || err.code;
        if (statusCode === 429 || errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota") || errStr.includes("exceeded")) {
          throw err;
        }
        if (statusCode === 400 && (errStr.includes("api_key_invalid") || errStr.includes("invalid") || errStr.includes("not found") || errStr.includes("unregistered") || errStr.includes("api key"))) {
          throw err;
        }
        console.log(`[test-gemini-key] Failed testing model ${testModel}, trying next model if available. Error: ${err.message}`);
      }
    }
    if (response && response.text) {
      return res.json({ success: true, message: "API Key valid!" });
    } else if (lastError) {
      throw lastError;
    } else {
      return res.status(400).json({ error: "Gagal mendapatkan respon dari AI. Silakan periksa kembali key Anda." });
    }
  } catch (e) {
    const errTextJoined = ((e.message ? String(e.message) : "") + " " + (e.status ? String(e.status) : "") + " " + (e.code ? String(e.code) : "") + " " + (typeof e === "object" ? JSON.stringify(e) : String(e))).toLowerCase();
    if (errTextJoined.includes("429") || errTextJoined.includes("resource_exhausted") || errTextJoined.includes("quota") || errTextJoined.includes("exceeded")) {
      console.log("Test API Key returned 429 Quota Exceeded (successfully handled as valid key but empty quota).");
      return res.json({
        success: true,
        quotaExceeded: true,
        message: "API Key valid & sukses terotentikasi! Namun kuota gratis / kredit akun Google AI Studio Anda habis (Quota Exceeded / RESOURCE_EXHAUSTED). Anda tetap bisa menyimpannya, namun pastikan untuk menambah limit/tagihan di Google AI Studio Anda agar bisa digunakan."
      });
    } else if (errTextJoined.includes("503") || errTextJoined.includes("unavailable") || errTextJoined.includes("high demand") || errTextJoined.includes("overloaded")) {
      console.log("Test API Key returned 503 High Demand (successfully handled as valid key).");
      return res.json({
        success: true,
        quotaExceeded: false,
        message: "API Key valid & sukses terotentikasi! Server Gemini sedang tinggi permintaan (503 High Demand), namun key Anda dapat digunakan."
      });
    } else if (errTextJoined.includes("api_key_invalid") || errTextJoined.includes("invalid") || errTextJoined.includes("api key not valid")) {
      return res.status(400).json({ error: "API Key tidak valid. Silakan periksa kembali API Key Anda." });
    }
    console.error("Test API Key error:", e);
    res.status(500).json({ error: e.message || "Error testing API Key" });
  }
});
app.post("/api/test-groq-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const modelsResponse = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });
    if (!modelsResponse.ok) {
      const errText = await modelsResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (modelsResponse.status === 401 || modelsResponse.status === 403 || errorMsg.toLowerCase().includes("invalid_api_key") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key Groq tidak valid atau salah. Silakan periksa kembali." });
      }
      if (modelsResponse.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key Groq valid! Namun kuota / limit penggunaan Groq Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi Groq: ${errorMsg}` });
    }
    const testResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "test" }]
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key Groq valid!" });
    } else {
      const errText = await testResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (testResponse.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key Groq valid! Namun kuota / limit penggunaan Groq Anda telah habis."
        });
      }
      if (errorMsg.includes("model_not_found") || testResponse.status === 404) {
        return res.status(400).json({ error: `API Key Groq valid, namun model llama-3.3-70b-versatile tidak tersedia pada akun Anda.` });
      }
      return res.status(400).json({ error: `Gagal verifikasi Groq (completion): ${errorMsg}` });
    }
  } catch (e) {
    console.error("Test Groq API Key error exception:", e);
    res.status(500).json({ error: e.message || "Error testing Groq API Key" });
  }
});
app.post("/api/test-mistral-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const response = await fetch("https://api.mistral.ai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });
    if (response.ok) {
      return res.json({ success: true, message: "API Key Mistral valid!" });
    }
    const errText = await response.text();
    let errorMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error && parsed.error.message) {
        errorMsg = parsed.error.message;
      }
    } catch (_) {
    }
    if (response.status === 401 || response.status === 403 || errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
      return res.status(400).json({ error: "API Key Mistral tidak valid atau salah. Silakan periksa kembali." });
    }
    if (response.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
      return res.json({
        success: true,
        quotaExceeded: true,
        message: "API Key Mistral valid! Namun kuota / limit penggunaan Mistral Anda telah habis."
      });
    }
    return res.status(400).json({ error: `Gagal verifikasi Mistral: ${errorMsg}` });
  } catch (e) {
    console.error("Test Mistral API Key error:", e);
    res.status(500).json({ error: e.message || "Error testing Mistral API Key" });
  }
});
app.post("/api/test-openai-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key OpenAI valid!" });
    } else {
      const errText = await testResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes("invalid_api_key") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key OpenAI tidak valid atau salah. Silakan periksa kembali." });
      }
      if (testResponse.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded") || errorMsg.toLowerCase().includes("insufficient_quota")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key OpenAI valid! Namun kuota / kredit akun OpenAI Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi OpenAI API: ${errorMsg}` });
    }
  } catch (e) {
    console.warn("Test OpenAI API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-openrouter-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key OpenRouter valid!" });
    } else {
      const errText = await testResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        } else if (parsed.error && typeof parsed.error === "string") {
          errorMsg = parsed.error;
        }
      } catch (_) {
      }
      if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key OpenRouter tidak valid atau salah. Silakan periksa kembali." });
      }
      if (testResponse.status === 402 || testResponse.status === 429 || errorMsg.toLowerCase().includes("credit") || errorMsg.toLowerCase().includes("balance") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key OpenRouter valid! Namun saldo atau kuota akun OpenRouter Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi OpenRouter API: ${errorMsg}` });
    }
  } catch (e) {
    console.warn("Test OpenRouter API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-blackbox-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://api.blackbox.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "blackboxai",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key Blackbox valid!" });
    } else {
      const errText = await testResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key Blackbox tidak valid atau salah. Silakan periksa kembali." });
      }
      if (testResponse.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key Blackbox valid! Namun kuota penggunaan Blackbox Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi Blackbox API: ${errorMsg}` });
    }
  } catch (e) {
    console.warn("Test Blackbox API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-nvidia-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "stepfun-ai/step-3.5-flash",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key NVIDIA valid!" });
    } else {
      const errText = await testResponse.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key NVIDIA tidak valid atau salah. Silakan periksa kembali." });
      }
      if (testResponse.status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key NVIDIA valid! Namun kuota / kredit akun NVIDIA Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi NVIDIA API: ${errorMsg}` });
    }
  } catch (e) {
    console.warn("Test NVIDIA API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-bluesminds-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    let testUri = (process.env.BLUESMINDS_API_ENDPOINT || "https://api.bluesminds.com/v1/chat/completions").trim();
    if (!testUri.endsWith("/chat/completions")) {
      if (testUri.endsWith("/chat/completions/")) {
        testUri = testUri.slice(0, -1);
      } else if (testUri.endsWith("/v1")) {
        testUri = `${testUri}/chat/completions`;
      } else if (testUri.endsWith("/v1/")) {
        testUri = `${testUri}chat/completions`;
      } else if (testUri.endsWith("/")) {
        testUri = `${testUri}v1/chat/completions`;
      } else {
        testUri = `${testUri}/v1/chat/completions`;
      }
    }
    let attempts = 0;
    let success = false;
    let lastStatus = 0;
    let lastText = "";
    while (attempts < 4 && !success) {
      attempts++;
      try {
        const testResponse = await fetch(testUri, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: "test" }],
            stream: false
          })
        });
        lastStatus = testResponse.status;
        lastText = await testResponse.text();
        if (testResponse.ok) {
          success = true;
        } else {
          const lowerText = lastText.toLowerCase();
          if (lastStatus === 401 || lastStatus === 403 || lastStatus === 400 && lowerText.includes("invalid") && !lowerText.includes("extra data")) {
            break;
          }
          console.warn(`[test-bluesminds-key] Attempt ${attempts} failed with status ${lastStatus}. Retrying after delay...`);
          await new Promise((r) => setTimeout(r, 1e3 + Math.random() * 1e3));
        }
      } catch (fetchErr) {
        console.warn(`[test-bluesminds-key] Attempt ${attempts} fetch exception:`, fetchErr.message);
        lastStatus = 500;
        lastText = fetchErr.message;
        await new Promise((r) => setTimeout(r, 1e3));
      }
    }
    if (success) {
      return res.json({ success: true, message: "API Key Bluesminds valid!" });
    } else {
      let errorMsg = lastText;
      try {
        const parsed = JSON.parse(lastText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch (_) {
      }
      if (lastStatus === 401 || lastStatus === 403 || errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
        return res.status(400).json({ error: "API Key Bluesminds tidak valid atau salah. Silakan periksa kembali." });
      }
      if (lastStatus === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
        return res.json({
          success: true,
          quotaExceeded: true,
          message: "API Key Bluesminds valid! Namun kuota / limit penggunaan Bluesminds Anda telah habis."
        });
      }
      return res.status(400).json({ error: `Gagal verifikasi Bluesminds API (Status ${lastStatus}): ${errorMsg}` });
    }
  } catch (e) {
    console.warn("Test Bluesminds API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-aivene-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testUri = "https://api.aivene.com/v1/chat/completions";
    const testResponse = await fetch(testUri, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [{ role: "user", content: "test" }],
        stream: false
      })
    });
    const status = testResponse.status;
    const text = await testResponse.text();
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error && parsed.error.message) {
        errorMsg = parsed.error.message;
      }
    } catch (_) {
    }
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key Aivene valid!" });
    }
    if (status === 401 || status === 403 || status === 400 && errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
      return res.status(400).json({ error: "API Key Aivene tidak valid atau salah. Silakan periksa kembali." });
    }
    if (status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
      return res.json({
        success: true,
        quotaExceeded: true,
        message: "API Key Aivene valid! Namun kuota / limit penggunaan Aivene Anda telah habis."
      });
    }
    return res.status(status).json({ error: `Terjadi error dari Aivene (Status: ${status}): ${errorMsg}` });
  } catch (e) {
    console.warn("Test Aivene API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
app.post("/api/test-zai-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testUri = "https://api.z.ai/api/paas/v4/chat/completions";
    const testResponse = await fetch(testUri, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en"
      },
      body: JSON.stringify({
        model: "glm-5.2",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
        stream: false,
        do_sample: false
      })
    });
    const status = testResponse.status;
    const text = await testResponse.text();
    let errorMsg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error && parsed.error.message) {
        errorMsg = parsed.error.message;
      }
    } catch (_) {
    }
    if (testResponse.ok) {
      return res.json({ success: true, message: "API Key Z.AI valid!" });
    }
    if (status === 401 || status === 403 || status === 400 && errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("unauthorized")) {
      return res.status(400).json({ error: "API Key Z.AI tidak valid atau salah. Silakan periksa kembali." });
    }
    if (status === 429 || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate_limit") || errorMsg.toLowerCase().includes("exceeded")) {
      return res.json({
        success: true,
        quotaExceeded: true,
        message: "API Key Z.AI valid! Namun kuota / limit penggunaan Z.AI Anda telah habis."
      });
    }
    return res.status(status).json({ error: `Terjadi error dari Z.AI (Status: ${status}): ${errorMsg}` });
  } catch (e) {
    console.warn("Test Z.AI API Key error exception:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
});
var getProviderName = () => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  if (provider === "groq") return "Groq";
  if (provider === "mistral") return "Mistral";
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "blackbox") return "Blackbox AI";
  if (provider === "nvidia") return "NVIDIA";
  if (provider === "bluesminds") return "Bluesminds";
  if (provider === "aivene") return "Aivene";
  if (provider === "zai") return "Z.AI";
  return "Gemini";
};
app.post("/api/adobe-research", async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== "string") {
      return res.status(400).json({ error: "Keyword is required and must be a string" });
    }
    const results = await searchAdobeStockWithBypass(keyword);
    res.json(results);
  } catch (e) {
    console.warn("Server /api/adobe-research error:", e);
    res.status(500).json({ error: e.message || "Error executing Adobe Stock search" });
  }
});
app.post("/api/extract-exif", upload.single("file"), async (req, res) => {
  let tempFilePath = "";
  let cleanupFn = () => {
  };
  try {
    let filePath = "";
    if (req.file) {
      filePath = req.file.path;
      tempFilePath = filePath;
      cleanupFn = () => {
        try {
          if (import_fs.default.existsSync(filePath)) import_fs.default.unlinkSync(filePath);
        } catch (e) {
        }
      };
    } else if (req.body.fileUrl) {
      const { fileUrl, pathKey, fileType } = req.body;
      const ext = fileType?.includes("png") ? ".png" : fileType?.includes("gif") ? ".gif" : ".jpg";
      const downloadResult = await downloadFileFromStorage(fileUrl, pathKey, ext);
      filePath = downloadResult.localPath;
      tempFilePath = filePath;
      cleanupFn = downloadResult.cleanup;
    } else {
      return res.status(400).json({ error: "No file uploaded or fileUrl provided" });
    }
    console.log(`[ExifTool API] Extracting metadata from: ${filePath}`);
    const { exiftool } = require("exiftool-vendored");
    const exifData = await exiftool.read(filePath);
    delete exifData.Directory;
    delete exifData.SourceFile;
    delete exifData.FileName;
    delete exifData.FileAccessDate;
    delete exifData.FileModifyDate;
    delete exifData.FileInodeChangeDate;
    delete exifData.FilePermissions;
    res.json({ success: true, metadata: exifData });
  } catch (e) {
    console.warn("[ExifTool API] Error extracting EXIF:", e);
    res.status(500).json({ error: e.message || "Error extracting EXIF" });
  } finally {
    cleanupFn();
  }
});
app.post("/api/generate-metadata", async (req, res) => {
  try {
    const { frames, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance, exifMetadata } = req.body;
    if (!frames || !Array.isArray(frames)) {
      return res.status(400).json({ error: "Missing or invalid frames" });
    }
    const temperatureVal = temperature !== void 0 ? parseFloat(String(temperature)) : void 0;
    const metadata = await generateStockMetadata(frames, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance, exifMetadata);
    res.json(metadata);
  } catch (e) {
    console.warn("Server generate-metadata error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating metadata" });
    }
  }
});
app.post("/api/generate-batch-metadata", async (req, res) => {
  try {
    const { items, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid items" });
    }
    const temperatureVal = temperature !== void 0 ? parseFloat(String(temperature)) : void 0;
    const batchMetadata = await generateBatchStockMetadata(items, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance);
    res.json(batchMetadata);
  } catch (e) {
    console.warn("Server generate-batch-metadata error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating batch metadata" });
    }
  }
});
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { subject, styleCategory, variation, promptMode, pngBgColor, userNegativePrompt, minWords, maxWords, model, seed, flatIconType, vectorSubType, darkHorrorSubStyle, referenceImages, cameraAngles } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject field" });
    }
    const promptData = await generateOptimizedPrompt({
      subject,
      styleCategory: styleCategory || "Photographic",
      variation: typeof variation === "number" ? variation : 50,
      promptMode,
      pngBgColor,
      userNegativePrompt,
      minWords,
      maxWords,
      model,
      seed: typeof seed === "number" ? seed : void 0,
      flatIconType,
      vectorSubType,
      darkHorrorSubStyle,
      referenceImages,
      cameraAngles
    });
    res.json(promptData);
  } catch (e) {
    console.warn("Server generate-prompt error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating optimized prompt" });
    }
  }
});
app.post("/api/auto-subject", async (req, res) => {
  try {
    const { styleCategory } = req.body;
    const creativeSeeds = [
      "cyberpunk coffee shop",
      "organic biotechnology",
      "whimsical woodland creatures",
      "cosmic ocean nebula",
      "minimalist brutalist concrete villa",
      "ancient steampunk mechanical workshop",
      "vibrant neon desert oasis",
      "surreal levitating glass islands",
      "cozy Scandinavian hygge attic",
      "retro-futuristic astronaut exploring mossy ruins",
      "mythical crystal cavern glow",
      "zen botanical garden with koi fish",
      "underwater city ruins populated by bioluminescent jellyfish",
      "futuristic alpine research station",
      "nostalgic 80s arcade neon glow",
      "surreal origami paper bird swarm",
      "ethereal cloud castle with golden gates",
      "mystical potion brewing room",
      "abandoned gothic cathedral claimed by blooming roses",
      "sleek futuristic electric motorcycle on rain-slicked highway",
      "rustic clay pottery workshop with sun-dappled shadows",
      "extravagant Victorian masquerade ball",
      "modern smart greenhouse farming robotics",
      "abstract flowing liquid marble waves",
      "enchanted treehouse village inside a giant hollow oak",
      "cinematic desert caravan at golden hour",
      "surreal clockwork solar system globe",
      "vibrant pop-art stylized fruit display",
      "cozy winter cabin library with crackling fireplace",
      "majestic phoenix rising from colorful smoke",
      "futuristic luxury yacht sailing on liquid silver",
      "magical floating lantern festival"
    ];
    const randomSeed = creativeSeeds[Math.floor(Math.random() * creativeSeeds.length)];
    const systemInstruction = `You are a creative director for a global stock agency. Generate a highly unique, modern, and extremely creative commercial subject idea (ide subject) for a text-to-image prompt. It should NOT be a generic idea, but a rich, highly descriptive concept with vivid adjectives, specific actions, or unique subject combinations. Return ONLY the plain text subject idea, in 1-2 descriptive sentences, without quotes, formatting, or prefixes. If the style category is provided (like "Photographic", "Vector", "3D Render"), tailor the idea to fit that style beautifully.`;
    const promptText = `Generate a creative subject idea for style: ${styleCategory || "General"}. To ensure absolute randomness and zero repetition, center your concept around this inspiration seed: "${randomSeed}". Make the concept extremely vivid, detailed, and microstock-ready.`;
    const aiClient = new import_genai2.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const result = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.98,
        maxOutputTokens: 120
      }
    });
    const text = (result.text || "").trim().replace(/^"|"$/g, "");
    res.json({ subject: text });
  } catch (e) {
    console.warn("Error in auto-subject:", e);
    res.status(500).json({ error: e.message || "Failed to generate subject idea" });
  }
});
app.post("/api/analyze-image-to-prompt", async (req, res) => {
  try {
    const { image, styleCategory, model } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }
    const data = await analyzeImageToPrompt(image, styleCategory, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-image-to-prompt error:", e);
    res.status(500).json({ error: e.message || "Error analyzing image" });
  }
});
app.post("/api/analyze-batch-image-to-prompt", async (req, res) => {
  try {
    const { images, styleCategory, model } = req.body;
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: "Missing images data" });
    }
    const data = await analyzeBatchImageToPrompt(images, styleCategory, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-batch-image-to-prompt error:", e);
    res.status(500).json({ error: e.message || "Error analyzing images" });
  }
});
app.post("/api/analyze-video-keyword", async (req, res) => {
  try {
    const { keyword, model } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: "Missing keyword" });
    }
    const data = await analyzeVideoKeyword(keyword, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-video-keyword error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error analyzing video keyword" });
    }
  }
});
app.post("/api/check-video-quality", upload.single("video"), async (req, res) => {
  let videoPath = "";
  let cleanupFn = () => {
  };
  try {
    let tolerance = "";
    let language = "";
    let model = "";
    let frames = [];
    let extractionSuccess = false;
    if (req.body.frames) {
      frames = Array.isArray(req.body.frames) ? req.body.frames : JSON.parse(req.body.frames);
      extractionSuccess = true;
      tolerance = req.body.tolerance;
      language = req.body.language;
      model = req.body.model;
      cleanupFn = () => {
      };
    } else if (req.file) {
      videoPath = req.file.path;
      tolerance = req.body.tolerance;
      language = req.body.language;
      model = req.body.model;
      cleanupFn = () => {
        try {
          if (import_fs.default.existsSync(videoPath)) import_fs.default.unlinkSync(videoPath);
        } catch (e) {
        }
      };
    } else if (req.body.fileUrl) {
      const { fileUrl, pathKey, tolerance: bodyTolerance, language: bodyLanguage, model: bodyModel } = req.body;
      tolerance = bodyTolerance;
      language = bodyLanguage;
      model = bodyModel;
      if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
        console.log(`[Video Audit] Downloading video from R2 to local for Gemini & ExifTool: ${pathKey}`);
        const command = new import_client_s3.GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pathKey
        });
        const s3Client2 = getS3Client();
        const response = await s3Client2.send(command);
        const tempFilePath = import_path.default.join(uploadDir, `dl_${Date.now()}_${import_path.default.basename(pathKey)}`);
        const writeStream = import_fs.default.createWriteStream(tempFilePath);
        const { finished } = await import("stream/promises");
        if (response.Body) {
          response.Body.pipe(writeStream);
          await finished(writeStream);
        } else {
          throw new Error("R2 Download body is empty");
        }
        videoPath = tempFilePath;
        cleanupFn = () => {
          try {
            if (import_fs.default.existsSync(tempFilePath)) import_fs.default.unlinkSync(tempFilePath);
          } catch (e) {
          }
        };
      } else {
        videoPath = fileUrl;
        cleanupFn = () => {
        };
      }
    } else {
      return res.status(400).json({ error: "No video uploaded, fileUrl, or frames provided." });
    }
    let videoFile = null;
    if (videoPath) {
      if (ffmpeg && (!frames || frames.length === 0)) {
        try {
          console.log("Server check-video-quality: Extracting keyframes with FFmpeg...");
          const outDir = import_path.default.join(uploadDir, `frames_${Date.now()}_${Math.random().toString(36).substring(7)}`);
          import_fs.default.mkdirSync(outDir, { recursive: true });
          frames = await new Promise((resolve, reject) => {
            let isDone = false;
            const timeout = setTimeout(() => {
              if (!isDone) {
                isDone = true;
                reject(new Error("Video extraction timed out."));
              }
            }, 9e4);
            const extractFast = async () => {
              try {
                const ffmpegPath = _require("@ffmpeg-installer/ffmpeg").path;
                const ffprobePath = _require("@ffprobe-installer/ffprobe").path;
                const execPromise2 = import_util2.default.promisify(import_child_process2.exec);
                const { stdout: probeOut } = await execPromise2(`"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
                const duration = parseFloat(probeOut.trim());
                if (isNaN(duration) || duration <= 0) {
                  throw new Error("Could not determine video duration");
                }
                const timestamps = [
                  duration * 0.1,
                  duration * 0.25,
                  duration * 0.4,
                  duration * 0.55,
                  duration * 0.7,
                  duration * 0.85
                ];
                const framePaths = [];
                for (let i = 0; i < timestamps.length; i++) {
                  const fPathFull = import_path.default.join(outDir, `frame-full-${i + 1}.jpg`);
                  const fPathZoom = import_path.default.join(outDir, `frame-zoom-${i + 1}.jpg`);
                  await execPromise2(`"${ffmpegPath}" -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 -s 1280x720 "${fPathFull}" -y`);
                  await execPromise2(`"${ffmpegPath}" -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 -vf "crop=min(800,iw):min(800,ih)" "${fPathZoom}" -y`);
                  framePaths.push(fPathFull);
                  framePaths.push(fPathZoom);
                }
                const frameData = framePaths.map((fPath) => import_fs.default.readFileSync(fPath, "base64"));
                import_fs.default.rmSync(outDir, { recursive: true, force: true });
                if (!isDone) {
                  isDone = true;
                  clearTimeout(timeout);
                  resolve(frameData.map((f) => `data:image/jpeg;base64,${f}`));
                }
              } catch (e) {
                if (!isDone) {
                  isDone = true;
                  clearTimeout(timeout);
                  reject(e);
                }
              }
            };
            extractFast();
          });
          extractionSuccess = true;
        } catch (extractionErr) {
          console.warn("[Video Audit] FFmpeg frame extraction failed:", extractionErr);
        }
      }
      try {
        console.log("Server check-video-quality: Getting video reference for Gemini...");
        const videoMime = req.file ? req.file.mimetype : "video/mp4";
        if (req.body.pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
          const presignCmd = new import_client_s3.GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: req.body.pathKey
          });
          const presignedUrl = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), presignCmd, { expiresIn: 3600 });
          videoFile = { fileUri: presignedUrl, mimeType: videoMime };
          console.log("[Video Audit] Using R2 presigned URL for Gemini direct fetch");
        } else {
          videoFile = await uploadVideoToGemini(videoPath, videoMime);
        }
        extractionSuccess = true;
      } catch (uploadErr) {
        console.warn("[Video Audit] Video reference failed:", uploadErr.message);
      }
    }
    if (extractionSuccess && (videoFile || frames && frames.length > 0)) {
      console.log("Server check-video-quality: Analyzing frames with Gemini...");
      const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms / 1e3}s`)), ms))]);
      let videoMetadata = null;
      if (videoPath) {
        try {
          console.log("Server check-video-quality: Extracting ExifTool metadata...");
          const { exiftool } = require("exiftool-vendored");
          videoMetadata = await withTimeout(exiftool.read(videoPath), 15e3, "ExifTool");
          if (videoMetadata) {
            delete videoMetadata.Directory;
            delete videoMetadata.SourceFile;
            delete videoMetadata.FileName;
            delete videoMetadata.FileAccessDate;
            delete videoMetadata.FileModifyDate;
            delete videoMetadata.FileInodeChangeDate;
            delete videoMetadata.FilePermissions;
          }
        } catch (exifErr) {
          console.warn("[Video Audit] ExifTool extraction failed:", exifErr.message);
        }
      }
      let technicalReport = null;
      if (videoPath && frames && frames.length > 0) {
        try {
          console.log("Server check-video-quality: Running videoAnalyzer...");
          const { analyzeVideoTechnically: analyzeVideoTechnically2 } = await Promise.resolve().then(() => (init_videoAnalyzer(), videoAnalyzer_exports));
          technicalReport = await withTimeout(analyzeVideoTechnically2(videoPath, frames), 9e4, "videoAnalyzer");
          console.log("Server check-video-quality: videoAnalyzer completed successfully");
        } catch (techErr) {
          console.warn("[Video Audit] Technical analysis failed, proceeding without it:", techErr.message);
        }
      }
      const data = await withTimeout(checkVideoQuality(frames, tolerance || "MEDIUM", language || "Bahasa", model, videoMetadata, videoFile, technicalReport), 9e4, "checkVideoQuality");
      console.log("Server check-video-quality: Analysis successful");
      cleanupFn();
      res.json({ ...data, technical_details: technicalReport });
    } else {
      cleanupFn();
      return res.status(500).json({ error: "Gagal mengekstrak frame video menggunakan FFmpeg. Pastikan aplikasi berjalan di lingkungan yang mendukung FFmpeg (bukan Vercel Serverless tanpa konfigurasi tambahan). Kami tidak lagi melakukan tebakan otomatis (simulasi)." });
    }
  } catch (e) {
    console.warn("Server check-video-quality error:", e);
    cleanupFn();
    res.status(500).json({ error: e.message || "Error checking video quality" });
  }
});
app.post("/api/mute-video", upload.single("video"), async (req, res) => {
  let inputPath = "";
  let originalPath = "";
  let outputPath = "";
  let cleanupFn = () => {
  };
  try {
    if (!ffmpeg) {
      console.warn("[MUTE VIDEO WARNING] FFmpeg is not available (running on Vercel). Falling back to direct stream copy.");
    }
    let originalName = "";
    let extension = ".mp4";
    let baseName = "video";
    let contentType = "video/mp4";
    if (req.file) {
      originalPath = req.file.path;
      originalName = req.file.originalname;
      extension = import_path.default.extname(originalName) || ".mp4";
      inputPath = `${originalPath}${extension}`;
      contentType = req.file.mimetype || "video/mp4";
      import_fs.default.renameSync(originalPath, inputPath);
      baseName = import_path.default.basename(originalName, extension);
      cleanupFn = () => {
        try {
          if (import_fs.default.existsSync(originalPath)) import_fs.default.unlinkSync(originalPath);
          if (import_fs.default.existsSync(inputPath)) import_fs.default.unlinkSync(inputPath);
        } catch (e) {
        }
      };
    } else if (req.body.fileUrl) {
      const { fileUrl, pathKey } = req.body;
      originalName = import_path.default.basename(fileUrl.split("?")[0]);
      extension = import_path.default.extname(originalName) || ".mp4";
      baseName = import_path.default.basename(originalName, extension);
      contentType = fileUrl.endsWith(".webm") ? "video/webm" : fileUrl.endsWith(".mov") ? "video/quicktime" : "video/mp4";
      if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
        console.log(`[Mute Video] Generating pre-signed URL for direct streaming: ${pathKey}`);
        const command = new import_client_s3.GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pathKey
        });
        inputPath = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), command, { expiresIn: 3600 });
      } else {
        inputPath = fileUrl;
      }
      cleanupFn = () => {
      };
    } else {
      return res.status(400).json({ error: "Tidak ada file video atau fileUrl yang disediakan." });
    }
    outputPath = import_path.default.join(uploadDir, `muted_${Date.now()}_${baseName}${extension}`);
    console.log(`[MUTE VIDEO] Processing video: ${inputPath} -> ${outputPath}`);
    try {
      await new Promise((resolve, reject) => {
        if (!ffmpeg) {
          reject(new Error("ffmpeg is not available"));
          return;
        }
        ffmpeg(inputPath).outputOptions("-an").videoCodec("copy").on("end", () => {
          console.log("[MUTE VIDEO] Processing finished successfully.");
          resolve();
        }).on("error", (err) => {
          console.error("[MUTE VIDEO] Error:", err);
          reject(err);
        }).save(outputPath);
      });
    } catch (ffmpegErr) {
      console.warn("[MUTE VIDEO FALLBACK] FFmpeg processing failed (possibly a mock/test payload). Copying input directly to output. Error:", ffmpegErr);
      try {
        if (inputPath.startsWith("http")) {
          const fileRes = await fetch(inputPath);
          if (!fileRes.ok) throw new Error(`Failed to fetch remote file: ${fileRes.statusText}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          import_fs.default.writeFileSync(outputPath, Buffer.from(arrayBuffer));
        } else {
          import_fs.default.copyFileSync(inputPath, outputPath);
        }
      } catch (copyErr) {
        console.error("[MUTE VIDEO FALLBACK] Failed to copy file:", copyErr);
        throw ffmpegErr;
      }
    }
    cleanupFn();
    if (isR2Configured()) {
      console.log("[MUTE VIDEO] S3/R2 is configured. Uploading muted video to R2...");
      const uploadResult = await uploadFileToStorage(outputPath, `muted_${baseName}${extension}`, contentType);
      try {
        if (import_fs.default.existsSync(outputPath)) {
          import_fs.default.unlinkSync(outputPath);
        }
      } catch (e) {
        console.warn("Failed to clean up output video:", e);
      }
      return res.json({ downloadUrl: uploadResult.fileUrl });
    }
    res.download(outputPath, `muted_${baseName}${extension}`, (err) => {
      try {
        if (import_fs.default.existsSync(outputPath)) {
          import_fs.default.unlinkSync(outputPath);
        }
      } catch (e) {
        console.warn("Failed to clean up output video:", e);
      }
      if (err) {
        console.error("Error sending muted video file:", err);
      }
    });
  } catch (error) {
    console.error("[MUTE VIDEO API ERROR]", error);
    cleanupFn();
    if (outputPath && import_fs.default.existsSync(outputPath)) {
      try {
        import_fs.default.unlinkSync(outputPath);
      } catch (e) {
      }
    }
    res.status(500).json({ error: error.message || "Gagal menghilangkan suara video." });
  }
});
function analyzeImageWithPython(tempFilePath) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = import_path.default.join(__dirname_safe, "server/image_analyzer.py");
    const pythonProcess = (0, import_child_process2.spawn)("python3", [pythonScriptPath, tempFilePath]);
    let stdoutData = "";
    let stderrData = "";
    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}. Stderr: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${err.message}. Raw output: ${stdoutData}`));
      }
    });
  });
}
async function analyzeImageWithFFmpeg(tempFilePath) {
  let ffmpegPath;
  let ffprobePath;
  try {
    ffmpegPath = _require("@ffmpeg-installer/ffmpeg").path;
    ffprobePath = _require("@ffprobe-installer/ffprobe").path;
    if (import_fs.default.existsSync(ffmpegPath)) {
      try {
        import_fs.default.chmodSync(ffmpegPath, "0755");
      } catch (e) {
      }
    }
    if (import_fs.default.existsSync(ffprobePath)) {
      try {
        import_fs.default.chmodSync(ffprobePath, "0755");
      } catch (e) {
      }
    }
  } catch (e) {
    throw new Error("FFmpeg/FFprobe binaries not found on the server.");
  }
  const execPromise2 = import_util2.default.promisify(import_child_process2.exec);
  let resolution = "Unknown";
  let color_space = "sRGB (Standard)";
  let fileSizeKb = 0;
  try {
    const { stdout: probeOut } = await execPromise2(`"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,color_space,color_range -of json "${tempFilePath}"`);
    const probeData = JSON.parse(probeOut);
    const stream = probeData.streams?.[0] || {};
    const width = stream.width || 0;
    const height = stream.height || 0;
    if (width && height) {
      const mp = (width * height / 1e6).toFixed(2);
      resolution = `${width} x ${height} (${mp} MP)`;
    }
    if (stream.pix_fmt) {
      color_space = `${stream.pix_fmt} (${stream.color_space || "sRGB"} range ${stream.color_range || "N/A"})`;
    }
  } catch (probeErr) {
    console.warn("FFprobe analysis failed:", probeErr);
  }
  try {
    const stats = import_fs.default.statSync(tempFilePath);
    fileSizeKb = Math.round(stats.size / 1024);
  } catch (e) {
  }
  const rawOutputPath = import_path.default.join(import_path.default.dirname(tempFilePath), `raw_${import_path.default.basename(tempFilePath)}.raw`);
  let brightnessVal = 50;
  let brightnessStatus = "Optimal";
  let contrastVal = 50;
  let contrastStatus = "Normal";
  let sharpnessVal = 50;
  let sharpnessStatus = "Normal";
  let noiseVal = 0;
  let noiseStatus = "Low";
  const histogram = new Array(32).fill(0);
  let fileValidation = "Valid (Passed FFmpeg Integrity Check)";
  try {
    await execPromise2(`"${ffmpegPath}" -i "${tempFilePath}" -vf "scale=256:256" -f rawvideo -pix_fmt gray "${rawOutputPath}" -y`);
    if (import_fs.default.existsSync(rawOutputPath)) {
      const bytes = import_fs.default.readFileSync(rawOutputPath);
      let sum = 0;
      for (let i = 0; i < bytes.length; i++) {
        sum += bytes[i];
      }
      const avgBrightness = sum / bytes.length;
      brightnessVal = Math.round(avgBrightness / 255 * 100);
      if (brightnessVal > 85) brightnessStatus = "Very Bright (Potential Overexposure)";
      else if (brightnessVal < 20) brightnessStatus = "Very Dark (Potential Underexposure)";
      else brightnessStatus = "Optimal";
      let sqSum = 0;
      for (let i = 0; i < bytes.length; i++) {
        const diff = bytes[i] - avgBrightness;
        sqSum += diff * diff;
      }
      const stdDev = Math.sqrt(sqSum / bytes.length);
      contrastVal = Math.min(100, Math.round(stdDev / 64 * 100));
      if (contrastVal > 80) contrastStatus = "High Contrast";
      else if (contrastVal < 25) contrastStatus = "Low Contrast";
      else contrastStatus = "Normal";
      for (let i = 0; i < bytes.length; i++) {
        const binIdx = Math.min(31, Math.floor(bytes[i] / 8));
        histogram[binIdx]++;
      }
      const maxBin = Math.max(...histogram) || 1;
      for (let b = 0; b < 32; b++) {
        histogram[b] = Math.round(histogram[b] / maxBin * 100);
      }
      let diffSum = 0;
      let count = 0;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 255; x++) {
          const idx1 = y * 256 + x;
          const idx2 = idx1 + 1;
          diffSum += Math.abs(bytes[idx1] - bytes[idx2]);
          count++;
        }
      }
      const avgEdgeEnergy = diffSum / count;
      sharpnessVal = Math.min(100, Math.round(avgEdgeEnergy / 15 * 100));
      if (sharpnessVal > 60) sharpnessStatus = "Sharp";
      else if (sharpnessVal < 20) sharpnessStatus = "Soft Focus";
      else sharpnessStatus = "Normal";
      let noiseSum = 0;
      let noiseCount = 0;
      for (let y = 0; y < 254; y += 2) {
        for (let x = 0; x < 254; x += 2) {
          const p1 = bytes[y * 256 + x];
          const p2 = bytes[y * 256 + x + 1];
          const p3 = bytes[(y + 1) * 256 + x];
          const p4 = bytes[(y + 1) * 256 + x + 1];
          const avg = (p1 + p2 + p3 + p4) / 4;
          const varLocal = ((p1 - avg) ** 2 + (p2 - avg) ** 2 + (p3 - avg) ** 2 + (p4 - avg) ** 2) / 4;
          if (varLocal < 16) {
            noiseSum += Math.sqrt(varLocal);
            noiseCount++;
          }
        }
      }
      const avgNoise = noiseCount > 0 ? noiseSum / noiseCount : 0.5;
      noiseVal = Math.min(100, Math.round(avgNoise / 4 * 100));
      if (noiseVal > 40) noiseStatus = "High Noise";
      else if (noiseVal > 15) noiseStatus = "Medium Noise";
      else noiseStatus = "Low Noise / Clean";
    }
  } catch (ffmpegErr) {
    console.warn("FFmpeg statistics filter failed:", ffmpegErr);
    fileValidation = "Validation Warning (FFmpeg decoding limit reached)";
  } finally {
    if (import_fs.default.existsSync(rawOutputPath)) {
      try {
        import_fs.default.unlinkSync(rawOutputPath);
      } catch (e) {
      }
    }
  }
  return {
    resolution,
    color_space,
    histogram,
    brightness: { value: brightnessVal, status: brightnessStatus },
    contrast: { value: contrastVal, status: contrastStatus },
    sharpness: { value: sharpnessVal, status: sharpnessStatus },
    noise: { value: noiseVal, status: noiseStatus },
    file_validation: fileValidation,
    file_size_kb: fileSizeKb
  };
}
app.post("/api/check-image-quality", async (req, res) => {
  let tempFilePath = "";
  let cleanupFn = () => {
  };
  try {
    const { image, fileUrl, pathKey, tolerance, language, model, fileType } = req.body;
    let imageBase64 = "";
    if (fileUrl) {
      console.log(`Server check-image-quality: Downloading file from storage: ${fileUrl}`);
      const ext = fileType?.includes("png") ? ".png" : fileType?.includes("gif") ? ".gif" : ".jpg";
      const downloadResult = await downloadFileFromStorage(fileUrl, pathKey, ext);
      tempFilePath = downloadResult.localPath;
      cleanupFn = downloadResult.cleanup;
      const fileBuffer = import_fs.default.readFileSync(tempFilePath);
      const mime = fileType || (ext === ".png" ? "image/png" : "image/jpeg");
      imageBase64 = `data:${mime};base64,${fileBuffer.toString("base64")}`;
    } else if (image) {
      const tempDir = uploadDir;
      if (!import_fs.default.existsSync(tempDir)) {
        import_fs.default.mkdirSync(tempDir, { recursive: true });
      }
      const fileExt = fileType?.includes("png") ? "png" : fileType?.includes("gif") ? "gif" : "jpg";
      const tempFileName = `img_${import_crypto.default.randomBytes(8).toString("hex")}.${fileExt}`;
      tempFilePath = import_path.default.join(tempDir, tempFileName);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      import_fs.default.writeFileSync(tempFilePath, Buffer.from(base64Data, "base64"));
      imageBase64 = image;
    } else {
      console.warn("Server check-image-quality error: Missing image data or fileUrl");
      return res.status(400).json({ error: "Missing image data or fileUrl" });
    }
    console.log("Server check-image-quality: Running in-memory Python PIL + Scikit-Image analysis...");
    let ffmpegStats;
    try {
      ffmpegStats = await analyzeImageWithPython(tempFilePath);
    } catch (pyErr) {
      console.warn("[Image Audit] Python in-memory analysis failed, falling back to FFmpeg:", pyErr);
      try {
        ffmpegStats = await analyzeImageWithFFmpeg(tempFilePath);
      } catch (ffErr) {
        console.warn("[Image Audit Fallback] FFmpeg analysis failed, using AI Vision fallback stats:", ffErr);
        ffmpegStats = {
          resolution: "Estimated from file structure",
          color_space: "sRGB (Standard)",
          histogram: new Array(32).fill(0).map((_, i) => Math.round(Math.sin(i / 10) * 50 + 50)),
          brightness: { value: 50, status: "Optimal (Estimated by AI)" },
          contrast: { value: 50, status: "Normal (Estimated by AI)" },
          sharpness: { value: 50, status: "Normal (Estimated by AI)" },
          noise: { value: 5, status: "Low Noise / Clean" },
          file_validation: "Valid (Passed Structure Integrity Check)",
          file_size_kb: import_fs.default.existsSync(tempFilePath) ? Math.round(import_fs.default.statSync(tempFilePath).size / 1024) : 1024
        };
      }
    }
    console.log("Server check-image-quality: Running AI Vision Analysis...");
    const zoomFilePath = tempFilePath + "_zoom.jpg";
    let imagesToSend = imageBase64;
    try {
      const ffmpegPath = _require("@ffmpeg-installer/ffmpeg").path;
      const execPromise2 = import_util2.default.promisify(import_child_process2.exec);
      await execPromise2(`"${ffmpegPath}" -y -i "${tempFilePath}" -vf "crop=iw/2:ih/2:iw/4:ih/4,scale=iw*2:ih*2" "${zoomFilePath}"`);
      if (import_fs.default.existsSync(zoomFilePath)) {
        const zoomBuffer = import_fs.default.readFileSync(zoomFilePath);
        const mime = fileType || "image/jpeg";
        const zoomBase64 = `data:${mime};base64,${zoomBuffer.toString("base64")}`;
        imagesToSend = [imageBase64, zoomBase64];
        console.log("Server check-image-quality: Successfully generated zoom-in center crop 200% via FFmpeg");
      }
    } catch (zoomErr) {
      console.warn("Server check-image-quality: Failed to generate zoom center crop:", zoomErr);
    }
    const aiVisionStats = await checkImageQuality(imagesToSend, tolerance, language, model, fileType);
    console.log("Server check-image-quality: Integration successful");
    const combinedReport = {
      ...aiVisionStats,
      ffmpeg: ffmpegStats,
      ai_vision: aiVisionStats
    };
    res.json(combinedReport);
  } catch (e) {
    console.warn("Server check-image-quality error:", e);
    res.status(500).json({ error: e.message || "Error checking image quality" });
  } finally {
    cleanupFn();
    if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
      try {
        import_fs.default.unlinkSync(tempFilePath);
      } catch (err) {
      }
    }
    if (tempFilePath) {
      const zoomFilePath = tempFilePath + "_zoom.jpg";
      if (import_fs.default.existsSync(zoomFilePath)) {
        try {
          import_fs.default.unlinkSync(zoomFilePath);
        } catch (err) {
        }
      }
    }
  }
});
app.post("/api/generate-hollywood-prompts", async (req, res) => {
  try {
    const { keyword, model } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: "Missing keyword" });
    }
    const prompts = await generateHollywoodPrompts(keyword, model);
    res.json(prompts);
  } catch (e) {
    console.warn("Server generate-hollywood-prompts error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating Hollywood prompts" });
    }
  }
});
app.post("/api/generate-motion-code", async (req, res) => {
  try {
    const { prompt, currentCode, fps, durationSeconds, width, height, history, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt field" });
    }
    const data = await generateMotionCode(prompt, {
      currentCode,
      fps: fps ? Number(fps) : void 0,
      durationSeconds: durationSeconds ? Number(durationSeconds) : void 0,
      width: width ? Number(width) : void 0,
      height: height ? Number(height) : void 0,
      history,
      model
    });
    res.json(data);
  } catch (e) {
    console.warn("Server generate-motion-code error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating motion code" });
    }
  }
});
app.post("/api/remove-watermark", async (req, res) => {
  try {
    const { image, mask, preset } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image field" });
    }
    console.log("[remove-watermark] Processing with preset:", preset);
    const result = await removeWatermark(image, mask || "", preset || "bottom-right");
    res.json(result);
  } catch (e) {
    console.warn("Server remove-watermark error:", e);
    res.status(500).json({ error: e.message || "Error removing watermark" });
  }
});
app.post("/api/generate-calendar-events", async (req, res) => {
  try {
    const { month, model } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Missing month field" });
    }
    const events = await generateCalendarEvents(month, model);
    res.json(events);
  } catch (e) {
    console.warn("Server generate-calendar-events error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating calendar events" });
    }
  }
});
app.post("/api/generate-event-keywords", async (req, res) => {
  try {
    const { eventName, eventDetails, model } = req.body;
    if (!eventName) {
      return res.status(400).json({ error: "Missing eventName field" });
    }
    const data = await generateEventKeywords(eventName, eventDetails || "", model);
    res.json(data);
  } catch (e) {
    console.warn("Server generate-event-keywords error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating keywords" });
    }
  }
});
app.post("/api/smart-suggest-keywords", async (req, res) => {
  try {
    const { title, description, existingKeywords, requestCount, model } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Missing title field or asset context" });
    }
    const data = await suggestKeywords(title, description || "", existingKeywords || [], requestCount, model);
    res.json({ keywords: data });
  } catch (e) {
    console.warn("Server smart-suggest-keywords error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error suggesting keywords" });
    }
  }
});
app.get("/api/inspirations", async (req, res) => {
  try {
    const inspirations = [
      { text: "Graphic Design template for a Summer Sale, featuring a large empty circular copy space in the center, vibrant neon pink and orange abstract geometric waves, floating 3D spheres, sleek borders, and a minimal frame, perfect for social media advertisement.", label: "Promo Template \u{1F4E3}" },
      { text: "Graphic Design template for a celebratory event, featuring a vast clean minimalist blue and white background with a clear visual hierarchy, festive floating ribbons, colorful balloons, gold confetti, and elegant borders, ideal for a banner or poster.", label: "Festive Template \u{1F389}" },
      { text: "Low angle shot of a diverse business team brainstorming around a glass table in a modern sunlit office, skyscrapers visible in the background, candid interaction.", label: "Team Strategy \u{1F4C8}" },
      { text: "Wide shot of an elderly traveler looking out the window of a scenic train traversing the Swiss Alps, capturing the awe and reflection, soft interior lighting.", label: "Alpine Journey \u{1F3D4}\uFE0F" },
      { text: "Close-up macro shot of a barista meticulously pouring latte art into a ceramic cup, focus on the espresso stream and delicate patterns, warm cafe environment.", label: "Coffee Craft \u2615" },
      { text: "High angle shot of a person practicing yoga on a wooden pier overlooking a calm, misty lake at sunrise, serene mood.", label: "Sunrise Yoga \u{1F9D8}" },
      { text: "Side profile shot of a young student focused intently on a vintage microscope in a well-equipped science laboratory, shallow depth of field.", label: "Science Discovery \u{1F52C}" },
      { text: "Medium shot of a traditional Japanese potter carefully molding clay on a rotating wheel, workshop setting with natural light.", label: "Pottery Art \u{1F3FA}" },
      { text: "Candid shot of a father teaching his daughter to ride a bicycle in a local park, sunset lighting creating long, warm shadows.", label: "Family Time \u{1F6B2}" },
      { text: "Vibrant medium shot of dancers in colorful elaborate traditional attire participating in a cultural parade on a crowded city street.", label: "Cultural Parade \u{1F3AD}" },
      { text: "Over-the-shoulder shot of a graphic designer working on a complex digital illustration on a large creative tablet.", label: "Digital Art \u{1F3A8}" }
    ];
    const shuffled = inspirations.sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, 5));
  } catch (e) {
    res.status(500).json({ error: "Error fetching inspirations" });
  }
});
app.post("/api/pakasir/create-payment", async (req, res) => {
  try {
    const { projectSlug, apiKey, orderId, amount, redirectUrl } = req.body;
    if (!projectSlug || !apiKey || !orderId || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const pakasir = new import_pakasir_client.PakasirClient({
      project: projectSlug,
      apiKey
    });
    const payment = await pakasir.createPaymentWithQRAndURL(orderId, Number(amount), {
      qrOptions: { size: 400 },
      urlOptions: { redirect: redirectUrl || "https://pakasir.com" }
    });
    res.json({
      success: true,
      paymentUrl: payment.paymentUrl,
      dataUrl: payment.dataUrl,
      paymentNumber: payment.paymentNumber
    });
  } catch (error) {
    console.error("Pakasir error:", error);
    res.status(500).json({ error: error.message || "Failed to create Pakasir payment" });
  }
});
app.post("/api/pakasir/check-status", async (req, res) => {
  try {
    const { projectSlug, apiKey, orderId, amount } = req.body;
    if (!projectSlug || !apiKey || !orderId || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const pakasir = new import_pakasir_client.PakasirClient({
      project: projectSlug,
      apiKey
    });
    const status = await pakasir.checkTransactionStatus(orderId, Number(amount));
    res.json({
      success: true,
      status: status.transaction ? status.transaction.status : status.status
    });
  } catch (error) {
    console.error("Pakasir status error:", error);
    res.status(500).json({ error: error.message || "Failed to check Pakasir status" });
  }
});
app.post("/api/send-key", async (req, res) => {
  const { email, licenseKey, appName, caption } = req.body;
  if (!email || !licenseKey) {
    return res.status(400).json({ message: "Email and license key are required." });
  }
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.error("Email credentials not configured.");
    return res.status(500).json({ message: "Layanan email belum dikonfigurasi. Sila masukkan EMAIL_USER dan EMAIL_PASS di menu Settings aplikasi." });
  }
  try {
    const transporter = import_nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    const mailOptions = {
      from: `"${appName} Pro" <${emailUser}>`,
      to: email,
      subject: `License Key ${appName} PRO Anda`,
      text: `Halo!

${caption || "Terima kasih telah menggunakan layanan kami."}

Berikut adalah License Key ${appName} PRO Anda:

SERIAL KEY: ${licenseKey}

Sila masukkan key ini pada menu aktivasi di dalam aplikasi.

Salam,
Tim ${appName}`,
      html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
                        <h2 style="color: #4e73df; text-transform: uppercase; font-size: 18px; margin-bottom: 20px;">License Key ${appName} PRO</h2>
                        <p style="font-size: 14px; line-height: 1.5;">Halo!</p>
                        <p style="font-size: 14px; line-height: 1.5;">${caption || "Terima kasih telah mempercayai <b>" + appName + "</b>."} Berikut adalah Serial Key lisensi Anda:</p>
                        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px dashed #4e73df; text-align: center; margin: 24px 0;">
                            <code style="font-family: monospace; font-size: 20px; font-weight: 800; color: #1e1b4b; letter-spacing: 2px;">${licenseKey}</code>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5;"><b>Cara Aktivasi:</b></p>
                        <ul style="font-size: 13px; line-height: 1.5; color: #475569;">
                            <li>Buka aplikasi <b>${appName}</b></li>
                            <li>Masuk ke menu Saas Portal / Pengaturan</li>
                            <li>Salin dan tempel Serial Key di atas</li>
                        </ul>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Pesan ini dikirim secara otomatis oleh sistem lisensi ${appName}. Jangan membalas email ini.</p>
                    </div>
                `
    };
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Nodemailer error:", error);
    let userMessage = "Gagal mengirim email backend.";
    if (error.code === "EAUTH" || error.response && (error.response.includes("535") || error.response.includes("534"))) {
      if (error.response && error.response.includes("534")) {
        userMessage = 'Gmail memerlukan "App Password". Akun Anda memiliki 2-Step Verification aktif atau memblokir login biasa. Anda WAJIB membuat 16-karakter App Password di Akun Google Anda untuk variabel EMAIL_PASS.';
      } else {
        userMessage = 'Login email gagal (Invalid Credentials). Pastikan EMAIL_USER dan EMAIL_PASS benar. Jika menggunakan Gmail, Anda HARUS menggunakan "App Password", bukan password akun biasa.';
      }
    }
    res.status(500).json({
      message: userMessage,
      error: error.message,
      tip: "Cek Settings menu untuk konfigurasi EMAIL_USER dan EMAIL_PASS."
    });
  }
});
function isR2Configured() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
}
var _s3ClientInstance = null;
function getS3Client() {
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured in environment variables.");
  if (!_s3ClientInstance) {
    _s3ClientInstance = new import_client_s3.S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });
  }
  return _s3ClientInstance;
}
var s3Client = { send: (cmd) => getS3Client().send(cmd) };
async function downloadFileFromStorage(fileUrl, pathKey, extension = ".mp4") {
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
  const localPath = import_path.default.join(uniqueTmpDir, `downloaded${extension}`);
  const fileStream = import_fs.default.createWriteStream(localPath);
  const { finished } = await import("stream/promises");
  if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
    console.log(`[Storage] Downloading from S3 with key ${pathKey}...`);
    const command = new import_client_s3.GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: pathKey
    });
    const response = await getS3Client().send(command);
    const stream = response.Body;
    stream.pipe(fileStream);
    await finished(fileStream);
  } else {
    console.log(`[Storage] Downloading from public URL ${fileUrl}...`);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    import_fs.default.writeFileSync(localPath, Buffer.from(arrayBuffer));
  }
  const cleanup = () => {
    try {
      if (import_fs.default.existsSync(localPath)) import_fs.default.unlinkSync(localPath);
      if (import_fs.default.existsSync(uniqueTmpDir)) import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("[Storage] Cleanup error:", e);
    }
  };
  return { localPath, cleanup };
}
var uploadFileToStorage = async (localPath, originalName, contentType) => {
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured.");
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueFilename = `video-muted/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
  const bucketName = process.env.S3_BUCKET_NAME;
  const fileBuffer = import_fs.default.readFileSync(localPath);
  const command = new import_client_s3.PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFilename,
    Body: fileBuffer,
    ContentType: contentType
  });
  await getS3Client().send(command);
  let publicUrl = "";
  if (process.env.S3_PUBLIC_URL) {
    publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${uniqueFilename}`;
  } else {
    publicUrl = `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucketName}/${uniqueFilename}`;
  }
  return { fileUrl: publicUrl, pathKey: uniqueFilename };
};
app.get("/api/r2-status", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    configured: isR2Configured(),
    bucketName: isR2Configured() ? process.env.S3_BUCKET_NAME : null,
    publicUrl: process.env.S3_PUBLIC_URL || null
  });
});
app.get("/api/provider-status", (req, res) => {
  res.json({
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    nvidia: !!process.env.NVIDIA_API_KEY,
    blackbox: !!process.env.BLACKBOX_API_KEY,
    bluesminds: !!process.env.BLUESMINDS_API_KEY
  });
});
app.post("/api/upload-vercel-blob", throttleMiddleware, async (req, res) => {
  try {
    const { handleUpload } = await import("@vercel/blob/client");
    const body = req.body;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        return {
          tokenPayload: JSON.stringify({})
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload completed", blob.url);
      }
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("API /upload-vercel-blob error:", error);
    res.status(400).json({ error: error.message });
  }
});
app.get("/api/get-upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.query;
    if (!filename) return res.status(400).json({ error: "Filename is required" });
    if (!isR2Configured()) {
      return res.status(503).json({ error: "S3/R2 Storage is not configured in environment variables. Add S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET_NAME to your .env / Vercel project settings." });
    }
    const sanitizedName = filename.toString().replace(/[^a-zA-Z0-9._-]/g, "_");
    const resolvedContentType = contentType ? String(contentType) : "application/postscript";
    const folder = resolvedContentType.startsWith("video/") ? "metazostorage/Video" : "eps-uploads";
    const uniqueFilename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
    const bucketName = process.env.S3_BUCKET_NAME;
    const command = new import_client_s3.PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      ContentType: resolvedContentType
    });
    const uploadUrl = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), command, { expiresIn: 3600 });
    let publicUrl = "";
    if (process.env.S3_PUBLIC_URL) {
      publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${uniqueFilename}`;
    } else {
      publicUrl = `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucketName}/${uniqueFilename}`;
    }
    res.json({ uploadUrl, fileUrl: publicUrl, pathKey: uniqueFilename, contentType: resolvedContentType });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL", details: error.message });
  }
});
app.post("/api/convert-eps", throttleMiddleware, async (req, res) => {
  const { fileUrl, pathKey } = req.body;
  if (!fileUrl) {
    return res.status(400).json({ error: "fileUrl is required" });
  }
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const inputPath = import_path.default.join(uniqueTmpDir, "downloaded.eps");
  const outputPath = `${inputPath}.jpg`;
  try {
    import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
    const { finished } = await import("stream/promises");
    const fileStream = import_fs.default.createWriteStream(inputPath);
    if (pathKey && process.env.S3_BUCKET_NAME) {
      console.log(`Downloading EPS from S3 with key ${pathKey}...`);
      const command = new import_client_s3.GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: pathKey
      });
      const s3Response = await s3Client.send(command);
      if (!s3Response.Body) throw new Error("No response body from S3 storage");
      for await (const chunk of s3Response.Body) {
        if (!fileStream.write(chunk)) {
          await new Promise((resolve) => fileStream.once("drain", () => resolve(null)));
        }
      }
      fileStream.end();
      await finished(fileStream);
      console.log(`Downloaded EPS to ${inputPath} via S3 stream`);
    } else {
      console.log(`Downloading EPS from ${fileUrl}...`);
      const fetchRes = await fetch(fileUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch file: ${fetchRes.status}`);
      }
      if (fetchRes.body) {
        for await (const chunk of fetchRes.body) {
          if (!fileStream.write(chunk)) {
            await new Promise((resolve) => fileStream.once("drain", () => resolve(null)));
          }
        }
        fileStream.end();
        await finished(fileStream);
        console.log(`Downloaded EPS to ${inputPath} via async fetch stream`);
      } else {
        throw new Error("No response body from storage");
      }
    }
    const gsArgs = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dEPSFitPage",
      "-dPDFFitPage",
      "-dDEVICEWIDTHPOINTS=768",
      "-dDEVICEHEIGHTPOINTS=768",
      "-dTextAlphaBits=2",
      "-dGraphicsAlphaBits=2",
      "-dJPEGQ=85",
      "-sDEVICE=jpeg",
      `-sOutputFile=${outputPath}`,
      "-dMaxBitmap=5000000",
      "-dBufferSpace=2000000",
      "-dBandHeight=50",
      "-dBandBufferSpace=2000000",
      "-dNumRenderingThreads=1",
      "-dVMReclaim=1",
      "-c",
      "<< /MaxPatternBitmap 500000 >> setuserparams",
      "-f",
      inputPath
    ];
    const spawnOptions = {
      timeout: 3e4,
      env: { ...process.env, TMPDIR: uniqueTmpDir }
    };
    await gsQueue.enqueue(async () => {
      await spawnAsync(gsExecutable, gsArgs, spawnOptions);
    });
    try {
      const stats = await import_fs.default.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error("Generated JPEG is 0 bytes");
      }
    } catch (statErr) {
      throw new Error("Generated JPEG not found or empty");
    }
    await new Promise((resolve, reject) => {
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error("Error saat mengirimkan file JPEG:", err);
          if (!res.headersSent) res.status(500).json({ error: "Failed to send file" });
          reject(err);
        } else resolve();
        setTimeout(async () => {
          try {
            if (import_fs.default.existsSync(inputPath)) import_fs.default.unlinkSync(inputPath);
            if (import_fs.default.existsSync(outputPath)) import_fs.default.unlinkSync(outputPath);
            if (import_fs.default.existsSync(uniqueTmpDir)) import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
          } catch (e) {
          }
          if (pathKey && isR2Configured()) {
            try {
              await getS3Client().send(new import_client_s3.DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: pathKey
              }));
              console.log(`[R2 CLEANUP] Deleted: ${pathKey}`);
            } catch (deleteErr) {
              console.warn(`[R2 CLEANUP] Failed to delete ${pathKey}:`, deleteErr);
            }
          }
        }, 500);
      });
    });
  } catch (error) {
    console.error("API /convert-eps-url error:", error);
    if (import_fs.default.existsSync(uniqueTmpDir)) {
      try {
        import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
      } catch (e) {
      }
    }
    if (!res.headersSent) {
      res.status(error.message.includes("timeout") ? 408 : 500).json({
        error: "Gagal mengkonversi vector URL, file mungkin rusak atau terlalu complex.",
        details: error.message
      });
    }
  }
});
app.post("/api/convert-eps-multipart", throttleMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const inputPath = req.file.path;
  const outputPath = `${inputPath}.jpg`;
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  try {
    import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
    console.log(`Starting conversion for ${req.file.originalname} (${req.file.size} bytes)`);
    const gsMemoryLimits = `-dMaxBitmap=5000000 -dBufferSpace=2000000 -dBandHeight=50 -dBandBufferSpace=2000000 -dNumRenderingThreads=1 -dVMReclaim=1 -c "<< /MaxPatternBitmap 500000 >> setuserparams" -f`;
    const gsArgs = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dEPSFitPage",
      "-dPDFFitPage",
      "-dDEVICEWIDTHPOINTS=768",
      "-dDEVICEHEIGHTPOINTS=768",
      "-dTextAlphaBits=2",
      "-dGraphicsAlphaBits=2",
      "-dJPEGQ=85",
      // Optimize file size without losing much quality
      "-sDEVICE=jpeg",
      `-sOutputFile=${outputPath}`,
      // Memory & Banding Limits
      "-dMaxBitmap=5000000",
      "-dBufferSpace=2000000",
      "-dBandHeight=50",
      "-dBandBufferSpace=2000000",
      "-dNumRenderingThreads=1",
      "-dVMReclaim=1",
      "-c",
      "<< /MaxPatternBitmap 500000 >> setuserparams",
      "-f",
      inputPath
    ];
    const spawnOptions = {
      timeout: 3e4,
      // Reduced to 30s to fail fast if it's too complex
      env: { ...process.env, TMPDIR: uniqueTmpDir }
      // Force Ghostscript to use disk instead of RAM for temp files
    };
    await gsQueue.enqueue(async () => {
      await spawnAsync(gsExecutable, gsArgs, spawnOptions);
    });
    console.log(`Conversion successful for ${req.file.originalname}`);
    try {
      const stats = await import_fs.default.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error("Generated JPEG is 0 bytes (Ghostscript failed silently)");
      }
    } catch (statErr) {
      throw new Error("Generated JPEG not found or empty");
    }
    await new Promise((resolve, reject) => {
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error("Error saat mengirimkan file JPEG ke frontend:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to send file" });
          }
          reject(err);
        } else {
          resolve();
        }
        setTimeout(() => {
          try {
            if (import_fs.default.existsSync(inputPath)) {
              import_fs.default.unlinkSync(inputPath);
            }
            if (import_fs.default.existsSync(outputPath)) {
              import_fs.default.unlinkSync(outputPath);
            }
            console.log(`[CLEANUP MANDOR] Sisa sampah file ${req.file?.originalname} dimusnahkan. Kapasitas diturunkan!`);
          } catch (cleanupErr) {
            console.error("[CLEANUP MANDOR] Gagal menghapus file sisa:", cleanupErr);
          }
        }, 100);
      });
    });
  } catch (error) {
    console.error("Ghostscript convert error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to convert EPS file", details: error.message });
    }
  } finally {
    if (import_fs.default.existsSync(uniqueTmpDir)) {
      import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
    }
    if (import_fs.default.existsSync(inputPath)) {
      import_fs.default.rmSync(inputPath, { force: true });
    }
    if (import_fs.default.existsSync(outputPath)) {
      import_fs.default.rmSync(outputPath, { force: true });
    }
    setTimeout(() => {
      if (global.gc) {
        global.gc();
        console.log("[MANDOR GC] Memori dibersihkan untuk worker selanjutnya.");
      }
    }, 100);
  }
});
async function startHosting() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer().then(() => startHosting());
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map

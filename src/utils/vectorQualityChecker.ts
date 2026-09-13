/**
 * Adobe Stock Official Vector Quality Checker
 * Comprehensive validator for .EPS, .SVG, and .AI files based on
 * official Adobe Stock Contributor Guidelines:
 * 1. Artboard Dimensions: Minimum 4.0 MP (4,000,000 px), Maximum 25.0 MP (25,000,000 px)
 * 2. Embedded Raster: Strictly 0 embedded bitmaps / linked raster images (100% pure vector)
 * 3. Text Outlines: All text must be converted to outlines (no live unexpanded fonts)
 * 4. File Size: Maximum 45 MB
 * 5. Format Standards: Illustrator 10 EPS / SVG / AI
 */

export interface VectorArtboardInfo {
  width: number;
  height: number;
  megapixels: number;
  isWithinRange: boolean;
  status: 'PASS' | 'FAIL';
  note: string;
}

export interface VectorCheckItem {
  status: 'PASS' | 'FAIL';
  detected: boolean;
  note: string;
  details?: string[];
}

export interface VectorCraftsmanshipInfo {
  pathCount: number;
  curveCount: number;
  lineCount: number;
  curveRatioPercent: number;
  strayPointsDetected: boolean;
  autotraceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  qualityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_CLEANUP';
  summary: string;
}

export interface VectorGateReport {
  isVector: boolean;
  format: 'eps' | 'svg' | 'ai' | 'unknown';
  artboard: VectorArtboardInfo;
  embeddedRaster: VectorCheckItem;
  liveText: VectorCheckItem;
  craftsmanship: VectorCraftsmanshipInfo;
  fileSize: {
    bytes: number;
    mb: number;
    status: 'PASS' | 'FAIL';
    note: string;
  };
  passed: boolean;
  failures: string[];
  warnings: string[];
  adobeRefusalReasons: string[];
}

export function analyzeSvgCraftsmanship(svgText: string): VectorCraftsmanshipInfo {
  // Count vector elements
  const paths = svgText.match(/<path\b[^>]*>/gi) || [];
  const polygons = svgText.match(/<polygon\b[^>]*>/gi) || [];
  const polylines = svgText.match(/<polyline\b[^>]*>/gi) || [];
  const circles = svgText.match(/<circle\b[^>]*>/gi) || [];
  const rects = svgText.match(/<rect\b[^>]*>/gi) || [];
  const ellipses = svgText.match(/<ellipse\b[^>]*>/gi) || [];
  
  const totalShapes = paths.length + polygons.length + polylines.length + circles.length + rects.length + ellipses.length;
  
  // Count curve vs line commands in path data
  const curveMatches = svgText.match(/[CcSsQqTt]/g) || [];
  const lineMatches = svgText.match(/[LlHhVv]/g) || [];
  const curveCount = curveMatches.length;
  const lineCount = lineMatches.length;
  const totalCommands = curveCount + lineCount;
  
  const curveRatioPercent = totalCommands > 0 ? Math.round((curveCount / totalCommands) * 100) : (circles.length > 0 ? 100 : 50);
  
  // Check for stray / empty objects
  const emptyPaths = (svgText.match(/<path\b[^>]*d=["']\s*(?:M\s*0\s*0\s*Z?)?\s*["']/gi) || []).length;
  const strayPoints = emptyPaths > 0 || /d=["']\s*M\s*[0-9.-]+\s*[0-9.-]+\s*Z?\s*["']/i.test(svgText);
  
  let autotraceRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if ((polygons.length > 800 || (paths.length > 2500 && lineCount > 10000 && curveRatioPercent < 12))) {
    autotraceRisk = 'HIGH';
  } else if (polygons.length > 250 || (paths.length > 1200 && curveRatioPercent < 20)) {
    autotraceRisk = 'MEDIUM';
  }
  
  let qualityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_CLEANUP' = 'EXCELLENT';
  let summary = '';
  
  if (autotraceRisk === 'HIGH') {
    qualityRating = 'NEEDS_CLEANUP';
    summary = `Terdeteksi ${totalShapes.toLocaleString()} elemen bentuk dengan rasio kurva bezier rendah (${curveRatioPercent}%). Pola menyerupai AI autotrace kasar/bergerigi dengan ribuan node. Disarankan melakukan Object > Path > Simplify di Adobe Illustrator untuk merapikan kurva.`;
  } else if (autotraceRisk === 'MEDIUM') {
    qualityRating = 'FAIR';
    summary = `Terdapat ${totalShapes.toLocaleString()} elemen bentuk (${curveRatioPercent}% kurva bezier). Kerapian cukup baik, namun beberapa bagian memiliki kepadatan titik jangkar tinggi.`;
  } else if (curveRatioPercent >= 35 || circles.length > 0 || totalShapes < 1000) {
    qualityRating = 'EXCELLENT';
    summary = `Kualitas kurva Bezier sangat halus dan bersih (${curveRatioPercent}% kurva bezier terdistribusi rapi, ${totalShapes.toLocaleString()} elemen bentuk). Bebas dari artefak autotrace kasar dan siap untuk komersial stock.`;
  } else {
    qualityRating = 'GOOD';
    summary = `Struktur kurva vektor rapi dan seimbang (${totalShapes.toLocaleString()} elemen bentuk, ${curveRatioPercent}% kurva). Memenuhi standar ilustrasi vektor komersial.`;
  }
  
  return {
    pathCount: totalShapes,
    curveCount,
    lineCount,
    curveRatioPercent,
    strayPointsDetected: strayPoints,
    autotraceRisk,
    qualityRating,
    summary
  };
}

export function analyzeEpsCraftsmanship(postScriptStr: string): VectorCraftsmanshipInfo {
  const curveMatches = postScriptStr.match(/(?:\bcurveto\b|[\s\r\n][cvy][\s\r\n])/gi) || [];
  const lineMatches = postScriptStr.match(/(?:\blineto\b|[\s\r\n][l][\s\r\n])/gi) || [];
  const moveMatches = postScriptStr.match(/(?:\bmoveto\b|[\s\r\n][m][\s\r\n])/gi) || [];
  
  const curveCount = curveMatches.length;
  const lineCount = lineMatches.length;
  const pathCount = moveMatches.length || 1;
  const totalCommands = curveCount + lineCount;
  
  const curveRatioPercent = totalCommands > 0 ? Math.round((curveCount / totalCommands) * 100) : 50;
  
  let autotraceRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (lineCount > 15000 && curveRatioPercent < 15) {
    autotraceRisk = 'HIGH';
  } else if (lineCount > 6000 && curveRatioPercent < 25) {
    autotraceRisk = 'MEDIUM';
  }
  
  let qualityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_CLEANUP' = 'EXCELLENT';
  let summary = '';
  
  if (autotraceRisk === 'HIGH') {
    qualityRating = 'NEEDS_CLEANUP';
    summary = `Terdeteksi kepadatan node garis lurus sangat tinggi (${lineCount.toLocaleString()} lineto, kurva bezier hanya ${curveRatioPercent}%). Mengindikasikan hasil autotrace otomatis dengan banyak titik jangkar bergerigi. Disarankan menggunakan Object > Path > Simplify di Adobe Illustrator.`;
  } else if (autotraceRisk === 'MEDIUM') {
    qualityRating = 'FAIR';
    summary = `Terdapat ${pathCount.toLocaleString()} segmen path dengan ${curveRatioPercent}% kurva bezier. Struktur cukup baik, disarankan optimasi node berlebih.`;
  } else if (curveRatioPercent >= 35 || pathCount < 2000) {
    qualityRating = 'EXCELLENT';
    summary = `Kurva Bezier PostScript sangat mulus (${curveRatioPercent}% kurva terstruktur, ${pathCount.toLocaleString()} subpath). Konstruksi vektor rapi berstandar kurator profesional.`;
  } else {
    qualityRating = 'GOOD';
    summary = `Konstruksi vektor proporsional (${pathCount.toLocaleString()} subpath, ${curveRatioPercent}% kurva). Memenuhi standar kurasi Adobe Stock.`;
  }
  
  return {
    pathCount,
    curveCount,
    lineCount,
    curveRatioPercent,
    strayPointsDetected: false,
    autotraceRisk,
    qualityRating,
    summary
  };
}

// ─────────────────────────────────────────────────────────────
// 1. SVG PARSER & INSPECTOR
// ─────────────────────────────────────────────────────────────
export function auditSvgContent(svgText: string, fileSizeBytes: number = 0): VectorGateReport {
  const failures: string[] = [];
  const warnings: string[] = [];
  const adobeRefusalReasons: string[] = [];

  // A. Parse dimensions & viewBox
  let width = 0;
  let height = 0;

  const vbMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      width = Math.abs(parts[2]);
      height = Math.abs(parts[3]);
    }
  }

  const wMatch = svgText.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const hMatch = svgText.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  if (wMatch && parseFloat(wMatch[1]) > 0) width = parseFloat(wMatch[1]);
  if (hMatch && parseFloat(hMatch[1]) > 0) height = parseFloat(hMatch[1]);

  // If width/height couldn't be parsed, fallback
  if (width <= 0 || height <= 0) {
    width = 4000;
    height = 4000;
    warnings.push('Dimensi SVG tidak ditemukan secara eksplisit; diasumsikan 4000x4000 px.');
  }

  const pixels = width * height;
  const megapixels = Number((pixels / 1_000_000).toFixed(2));
  const isArtboardPass = megapixels >= 4.0 && megapixels <= 25.0;

  let artboardNote = `${Math.round(width)} × ${Math.round(height)} px (${megapixels} MP). `;
  if (megapixels < 4.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard di bawah batas minimal 4 MP (hanya ${megapixels} MP).`;
    failures.push(`Artboard size too small: ${megapixels} MP (< 4.0 MP)`);
    adobeRefusalReasons.push('Artboard size is too small (Minimum 4 MP required by Adobe Stock)');
  } else if (megapixels > 25.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard melebihi batas maksimal 25 MP (${megapixels} MP).`;
    failures.push(`Artboard size too large: ${megapixels} MP (> 25.0 MP)`);
    adobeRefusalReasons.push('Artboard size exceeds maximum 25 MP allowed by Adobe Stock');
  } else {
    artboardNote += `Memenuhi standar Adobe Stock (${megapixels} MP dalam rentang 4 MP - 25 MP).`;
  }

  // B. Detect embedded raster images
  // Tag <image ...>, href="data:image/...", xlink:href="data:image/..."
  const rasterTags = svgText.match(/<image\b[^>]*>/gi) || [];
  const base64Raster = svgText.match(/data:image\/(?:png|jpeg|jpg|webp|gif)/gi) || [];
  const hasEmbeddedRaster = rasterTags.length > 0 || base64Raster.length > 0;
  const rasterCount = Math.max(rasterTags.length, base64Raster.length);

  let rasterNote = hasEmbeddedRaster
    ? `DITOLAK Adobe Stock: Terdeteksi ${rasterCount} elemen raster/bitmap tertanam (<image> / base64). Adobe Stock mewajibkan 100% vektor murni tanpa gambar piksel.`
    : 'Bebas dari raster bitmap tertanam (100% pure vector paths).';

  if (hasEmbeddedRaster) {
    failures.push(`Embedded raster image detected (${rasterCount} bitmap elements)`);
    adobeRefusalReasons.push('Contains embedded raster images (Vector files must be 100% vector)');
  }

  // C. Detect live text / unoutlined fonts
  // Tag <text ...> or <tspan ...>
  const textTags = svgText.match(/<text\b[^>]*>/gi) || [];
  const tspanTags = svgText.match(/<tspan\b[^>]*>/gi) || [];
  const hasLiveText = textTags.length > 0 || tspanTags.length > 0;
  const textCount = textTags.length + tspanTags.length;

  let textNote = hasLiveText
    ? `DITOLAK Adobe Stock: Terdeteksi ${textCount} elemen teks aktif/live font (<text>/<tspan>). Semua font wajib di-convert to outlines (Create Outlines) agar tidak ditolak pembeli.`
    : 'Semua teks telah di-outline menjadi kurva vektor (tidak ada live font aktif).';

  if (hasLiveText) {
    failures.push(`Live text detected (${textCount} font nodes). Text must be outlined.`);
    adobeRefusalReasons.push('Text must be outlined (All fonts must be converted to vector paths)');
  }

  // D. Vector Craftsmanship & Quality
  const craftsmanship = analyzeSvgCraftsmanship(svgText);
  if (craftsmanship.autotraceRisk === 'HIGH') {
    warnings.push('Risiko AI Autotrace Tinggi: Banyak titik jangkar garis lurus berfragmen kasar. Disarankan menggunakan Path > Simplify.');
  }

  // E. File Size Check (Max 45 MB)
  const sizeMb = Number((fileSizeBytes / (1024 * 1024)).toFixed(2));
  const isSizePass = fileSizeBytes <= 0 || sizeMb <= 45.0;
  let sizeNote = `${sizeMb} MB. `;
  if (!isSizePass) {
    sizeNote += 'DITOLAK Adobe Stock: Ukuran file melebihi batas maksimal 45 MB.';
    failures.push(`File size exceeds 45 MB: ${sizeMb} MB`);
    adobeRefusalReasons.push('File size exceeds 45 MB limit');
  } else {
    sizeNote += 'Ukuran file aman (di bawah batas maksimal 45 MB).';
  }

  const passed = failures.length === 0;

  return {
    isVector: true,
    format: 'svg',
    artboard: {
      width,
      height,
      megapixels,
      isWithinRange: isArtboardPass,
      status: isArtboardPass ? 'PASS' : 'FAIL',
      note: artboardNote
    },
    embeddedRaster: {
      status: hasEmbeddedRaster ? 'FAIL' : 'PASS',
      detected: hasEmbeddedRaster,
      note: rasterNote,
      details: rasterTags.slice(0, 3)
    },
    liveText: {
      status: hasLiveText ? 'FAIL' : 'PASS',
      detected: hasLiveText,
      note: textNote
    },
    craftsmanship,
    fileSize: {
      bytes: fileSizeBytes,
      mb: sizeMb,
      status: isSizePass ? 'PASS' : 'FAIL',
      note: sizeNote
    },
    passed,
    failures,
    warnings,
    adobeRefusalReasons
  };
}


// ─────────────────────────────────────────────────────────────
// 2. EPS & AI POSTSCRIPT INSPECTOR
// ─────────────────────────────────────────────────────────────
export function auditEpsOrAiBytes(bytes: Uint8Array, filename: string = ''): VectorGateReport {
  const isAi = filename.toLowerCase().endsWith('.ai');
  const format = isAi ? 'ai' : 'eps';
  const failures: string[] = [];
  const warnings: string[] = [];
  const adobeRefusalReasons: string[] = [];

  // Read header string (first 64KB contains PostScript DSC header comments)
  const headerLen = Math.min(bytes.length, 65536);
  const headerStr = new TextDecoder('latin1').decode(bytes.subarray(0, headerLen));

  // A. Parse Artboard / BoundingBox
  let width = 0;
  let height = 0;

  // HiResBoundingBox: 0.0000 0.0000 5000.0000 5000.0000
  const hiResMatch = headerStr.match(/%%HiResBoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i);
  if (hiResMatch) {
    const x1 = parseFloat(hiResMatch[1]);
    const y1 = parseFloat(hiResMatch[2]);
    const x2 = parseFloat(hiResMatch[3]);
    const y2 = parseFloat(hiResMatch[4]);
    width = Math.abs(x2 - x1);
    height = Math.abs(y2 - y1);
  } else {
    // BoundingBox: 0 0 5000 5000
    const bbMatch = headerStr.match(/%%BoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i);
    if (bbMatch) {
      const x1 = parseFloat(bbMatch[1]);
      const y1 = parseFloat(bbMatch[2]);
      const x2 = parseFloat(bbMatch[3]);
      const y2 = parseFloat(bbMatch[4]);
      width = Math.abs(x2 - x1);
      height = Math.abs(y2 - y1);
    }
  }

  // If PDF-based AI file (%PDF-), search for /MediaBox [ 0 0 5000 5000 ]
  if ((width <= 0 || height <= 0) && isAi) {
    const mediaBoxMatch = headerStr.match(/\/MediaBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/i);
    if (mediaBoxMatch) {
      const x1 = parseFloat(mediaBoxMatch[1]);
      const y1 = parseFloat(mediaBoxMatch[2]);
      const x2 = parseFloat(mediaBoxMatch[3]);
      const y2 = parseFloat(mediaBoxMatch[4]);
      width = Math.abs(x2 - x1);
      height = Math.abs(y2 - y1);
    }
  }

  // Check XMP <xmpTPg:MaxPageSize> in Illustrator EPS/AI
  if (width <= 0 || height <= 0) {
    const wXmp = headerStr.match(/<xmpTPg:w>([0-9.]+)<\/xmpTPg:w>/i);
    const hXmp = headerStr.match(/<xmpTPg:h>([0-9.]+)<\/xmpTPg:h>/i);
    if (wXmp && hXmp) {
      width = parseFloat(wXmp[1]);
      height = parseFloat(hXmp[1]);
    }
  }

  if (width <= 0 || height <= 0) {
    // Fallback standard assumption
    width = 4000;
    height = 4000;
    warnings.push('Dimensi BoundingBox tidak terbaca secara eksplisit; diasumsikan 4000x4000 px.');
  }

  const pixels = width * height;
  const megapixels = Number((pixels / 1_000_000).toFixed(2));
  const isArtboardPass = megapixels >= 4.0 && megapixels <= 25.0;

  let artboardNote = `${Math.round(width)} × ${Math.round(height)} px (${megapixels} MP). `;
  if (megapixels < 4.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard di bawah batas minimal 4 MP (hanya ${megapixels} MP). Harap perbesar ke 4000x4000 px atau 5000x5000 px.`;
    failures.push(`Artboard size too small: ${megapixels} MP (< 4.0 MP)`);
    adobeRefusalReasons.push('Artboard size is too small (Minimum 4 MP required by Adobe Stock)');
  } else if (megapixels > 25.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard melebihi batas maksimal 25 MP (${megapixels} MP). Harap turunkan ke 5000x5000 px.`;
    failures.push(`Artboard size too large: ${megapixels} MP (> 25.0 MP)`);
    adobeRefusalReasons.push('Artboard size exceeds maximum 25 MP allowed by Adobe Stock');
  } else {
    artboardNote += `Memenuhi standar Adobe Stock (${megapixels} MP dalam rentang 4 MP - 25 MP).`;
  }

  // B. Detect Embedded Raster in EPS/AI
  // Note: DOS EPS header (0xC5D0D3C6) has a TIFF/WMF thumbnail preview pointer.
  // The TIFF preview for thumbnails is ALLOWED by Adobe Stock. What is FORBIDDEN is
  // raster images placed in the vector drawing body (%AI5_BeginRaster /colorimage /image inside AI stream).
  let fullPostScript = headerStr;
  if (bytes.length < 2_000_000) {
    fullPostScript = new TextDecoder('latin1').decode(bytes);
  }

  // In Illustrator EPS: %AI5_BeginRaster: x y w h indicates embedded bitmap image
  const hasAiRaster = /%AI5_BeginRaster(?!\s*:\s*0\s+0\s+0\s+0)/i.test(fullPostScript);
  // PostScript image operators in content stream (excluding thumbnails)
  const hasPsImage = /(?:^|\n)\s*(?:\/image|\/colorimage)\b/i.test(fullPostScript);
  // PDF XObject image in AI container
  const hasPdfImage = /\/Subtype\s*\/Image\b/i.test(fullPostScript);

  const hasEmbeddedRaster = hasAiRaster || hasPsImage || hasPdfImage;

  let rasterNote = hasEmbeddedRaster
    ? 'DITOLAK Adobe Stock: Terdeteksi gambar raster/bitmap tertanam di dalam file vektor. Adobe Stock mewajibkan 100% vektor murni tanpa foto/bitmap.'
    : 'Bebas dari raster bitmap tertanam (100% pure vector paths).';

  if (hasEmbeddedRaster) {
    failures.push('Embedded raster image detected in vector content stream');
    adobeRefusalReasons.push('Contains embedded raster images (Vector files must be 100% vector)');
  }

  // C. Detect Live Text / Unoutlined Fonts
  // In Illustrator EPS: %%DocumentNeededFonts: FontName (when fonts are not outlined)
  // If all fonts are outlined, DocumentNeededFonts is either absent, (none), or empty.
  const neededFontsMatch = headerStr.match(/%%DocumentNeededFonts:\s*([^\r\n]+)/i);
  let hasLiveFonts = false;
  let fontDetails = '';

  if (neededFontsMatch) {
    const fontVal = neededFontsMatch[1].trim().toLowerCase();
    if (fontVal && fontVal !== '(none)' && fontVal !== 'none' && fontVal !== 'atend') {
      hasLiveFonts = true;
      fontDetails = neededFontsMatch[1].trim();
    }
  }

  // Also check %%DocumentSuppliedFonts or active font resources
  const suppliedFontsMatch = headerStr.match(/%%DocumentSuppliedFonts:\s*([^\r\n]+)/i);
  if (suppliedFontsMatch && !hasLiveFonts) {
    const sFontVal = suppliedFontsMatch[1].trim().toLowerCase();
    if (sFontVal && sFontVal !== '(none)' && sFontVal !== 'none' && sFontVal !== 'atend') {
      hasLiveFonts = true;
      fontDetails = suppliedFontsMatch[1].trim();
    }
  }

  let textNote = hasLiveFonts
    ? `DITOLAK Adobe Stock: Terdeteksi font aktif/live text (${fontDetails}). Seluruh teks wajib di-convert to outlines (Create Outlines) sebelum disubmit.`
    : 'Semua teks telah di-outline menjadi kurva vektor (bebas dari font aktif).';

  if (hasLiveFonts) {
    failures.push(`Unoutlined font detected: ${fontDetails}`);
    adobeRefusalReasons.push('Text must be outlined (All fonts must be converted to vector paths)');
  }

  // D. Vector Craftsmanship & Quality
  const craftsmanship = analyzeEpsCraftsmanship(fullPostScript);
  if (craftsmanship.autotraceRisk === 'HIGH') {
    warnings.push('Risiko AI Autotrace Tinggi: Kepadatan node lineto sangat tinggi. Disarankan merapikan dengan Path > Simplify.');
  }

  // E. File Size Check (Max 45 MB)
  const sizeMb = Number((bytes.length / (1024 * 1024)).toFixed(2));
  const isSizePass = sizeMb <= 45.0;
  let sizeNote = `${sizeMb} MB. `;
  if (!isSizePass) {
    sizeNote += 'DITOLAK Adobe Stock: Ukuran file melebihi batas maksimal 45 MB.';
    failures.push(`File size exceeds 45 MB: ${sizeMb} MB`);
    adobeRefusalReasons.push('File size exceeds 45 MB limit');
  } else {
    sizeNote += 'Ukuran file aman (di bawah batas maksimal 45 MB).';
  }

  const passed = failures.length === 0;

  return {
    isVector: true,
    format,
    artboard: {
      width,
      height,
      megapixels,
      isWithinRange: isArtboardPass,
      status: isArtboardPass ? 'PASS' : 'FAIL',
      note: artboardNote
    },
    embeddedRaster: {
      status: hasEmbeddedRaster ? 'FAIL' : 'PASS',
      detected: hasEmbeddedRaster,
      note: rasterNote
    },
    liveText: {
      status: hasLiveFonts ? 'FAIL' : 'PASS',
      detected: hasLiveFonts,
      note: textNote
    },
    craftsmanship,
    fileSize: {
      bytes: bytes.length,
      mb: sizeMb,
      status: isSizePass ? 'PASS' : 'FAIL',
      note: sizeNote
    },
    passed,
    failures,
    warnings,
    adobeRefusalReasons
  };
}

// ─────────────────────────────────────────────────────────────
// 3. UNIVERSAL BROWSER / NODE DISPATCHER
// ─────────────────────────────────────────────────────────────
export async function auditVectorFile(file: File): Promise<VectorGateReport> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.svg') || file.type === 'image/svg+xml') {
    const text = await file.text();
    return auditSvgContent(text, file.size);
  }

  if (name.endsWith('.eps') || name.endsWith('.ai') || file.type === 'application/postscript') {
    const buf = await file.arrayBuffer();
    return auditEpsOrAiBytes(new Uint8Array(buf), file.name);
  }

  // Non-vector fallback
  return {
    isVector: false,
    format: 'unknown',
    artboard: { width: 0, height: 0, megapixels: 0, isWithinRange: true, status: 'PASS', note: 'Non-vector file' },
    embeddedRaster: { status: 'PASS', detected: false, note: 'Non-vector file' },
    liveText: { status: 'PASS', detected: false, note: 'Non-vector file' },
    craftsmanship: {
      pathCount: 0,
      curveCount: 0,
      lineCount: 0,
      curveRatioPercent: 0,
      strayPointsDetected: false,
      autotraceRisk: 'LOW',
      qualityRating: 'EXCELLENT',
      summary: 'Non-vector file'
    },
    fileSize: { bytes: file.size, mb: Number((file.size / (1024 * 1024)).toFixed(2)), status: 'PASS', note: 'OK' },
    passed: true,
    failures: [],
    warnings: [],
    adobeRefusalReasons: []
  };
}


export function auditVectorBuffer(buffer: Uint8Array | Buffer, filename: string = ''): VectorGateReport {
  const name = filename.toLowerCase();
  if (name.endsWith('.svg')) {
    const text = typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)
      ? buffer.toString('utf-8')
      : new TextDecoder('utf-8').decode(buffer);
    return auditSvgContent(text, buffer.length);
  }
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return auditEpsOrAiBytes(u8, filename);
}

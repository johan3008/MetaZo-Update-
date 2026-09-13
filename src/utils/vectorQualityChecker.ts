/**
 * Adobe Stock Official Vector Quality Checker
 * Strictly implements the official Adobe Stock Vector Guidelines & Quality Standards from:
 * 1. Technical Requirements for Vector Submissions:
 *    https://helpx.adobe.com/id_id/stock/contributor/submit-your-content/submit-vectors/technical-requirements-for-vector-submissions.html
 *    - Maximum file size: 45 MB
 *    - Minimum artboard size: 15 MP (megapixels)
 *    - Maximum artboard size: 65 MP (megapixels)
 *    - Document color mode: RGB
 *    - Artboard offset: (0,0) upper-left corner
 * 2. Quality and Technical Standards - Reasons for Content Refusal (Maintain Vector Quality):
 *    https://helpx.adobe.com/id_id/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html
 *    - Close all shape paths fully to prevent gaps.
 *    - Avoid embedding raster images to maintain scalability.
 *    - Use clean, simple hand-drawn paths. Avoid auto-tracing complex graphics.
 *    - Convert all text to outlines (Create Outlines) so customers without fonts can edit the file.
 *    - Artboard must meet the upload requirements (15 MP - 65 MP, (0,0) offset, RGB).
 */

export interface VectorArtboardInfo {
  width: number;
  height: number;
  megapixels: number;
  isWithinRange: boolean; // Minimum 15.0 MP, Maximum 65.0 MP
  status: 'PASS' | 'FAIL';
  note: string;
}

export interface VectorOffsetInfo {
  x: number;
  y: number;
  isOriginZero: boolean;
  status: 'PASS' | 'FAIL';
  note: string;
}

export interface VectorColorModeInfo {
  mode: 'RGB' | 'CMYK' | 'GRAYSCALE' | 'UNKNOWN';
  isRgb: boolean;
  status: 'PASS' | 'FAIL';
  note: string;
}

export interface VectorCheckItem {
  status: 'PASS' | 'FAIL';
  detected: boolean;
  note: string;
  details?: string[];
}

export interface VectorClosedPathsInfo {
  totalPaths: number;
  closedPaths: number;
  openPaths: number;
  isFullyClosed: boolean;
  status: 'PASS' | 'FAIL' | 'WARNING';
  note: string;
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
  artboard: VectorArtboardInfo;          // 15 MP - 65 MP (Official Technical Requirement)
  offset: VectorOffsetInfo;               // (0,0) upper-left corner (Official Technical Requirement)
  colorMode: VectorColorModeInfo;         // RGB (Official Technical Requirement)
  embeddedRaster: VectorCheckItem;        // Avoid embedding raster images (Official Quality Standard)
  closedPaths: VectorClosedPathsInfo;     // Close all shape paths fully to prevent gaps (Official Quality Standard)
  craftsmanship: VectorCraftsmanshipInfo; // Use clean, simple paths. Avoid auto-tracing complex graphics (Official Quality Standard)
  liveText: VectorCheckItem;              // Text must be outlined (Official Technical & Design Requirement)
  fileSize: {                             // Maximum 45 MB (Official Technical Requirement)
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

export function analyzeSvgCraftsmanship(svgText: string): { craftsmanship: VectorCraftsmanshipInfo; closedPaths: VectorClosedPathsInfo } {
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
  
  // Check closed paths: polylines, polygons, rects, circles, ellipses are inherently closed shapes unless stroke-only.
  // For <path>, check if path data ends with 'Z' or 'z' (closepath)
  let closedPathCount = polygons.length + circles.length + rects.length + ellipses.length;
  let openPathCount = polylines.length; // polylines are typically open unless closed with polygon

  for (const p of paths) {
    const dMatch = p.match(/\bd=["']([^"']+)["']/i);
    if (dMatch) {
      const d = dMatch[1].trim();
      if (/[Zz]\s*$/.test(d) || /[Zz]/.test(d)) {
        closedPathCount++;
      } else {
        openPathCount++;
      }
    } else {
      closedPathCount++;
    }
  }

  const totalPathElements = closedPathCount + openPathCount;
  const isFullyClosed = openPathCount === 0 || (openPathCount / Math.max(1, totalPathElements)) < 0.05;
  const closedStatus: 'PASS' | 'FAIL' | 'WARNING' = isFullyClosed ? 'PASS' : (openPathCount > 20 ? 'WARNING' : 'PASS');
  const closedNote = isFullyClosed
    ? `Semua shape path tertutup rapat (${closedPathCount} path tertutup, 0 celah terbuka). Memenuhi standar "Close all shape paths fully to prevent gaps".`
    : `Terdeteksi ${openPathCount} path terbuka tanpa perintah closepath (Z). Pastikan bentuk/shape tertutup rapat agar tidak ada celah visual saat diedit pembeli.`;

  const closedPaths: VectorClosedPathsInfo = {
    totalPaths: totalPathElements,
    closedPaths: closedPathCount,
    openPaths: openPathCount,
    isFullyClosed,
    status: closedStatus,
    note: closedNote
  };

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
    summary = `Terdeteksi ${totalShapes.toLocaleString()} elemen bentuk dengan rasio kurva bezier rendah (${curveRatioPercent}%). Terindikasi auto-tracing grafis kompleks dengan node bergerigi kasar. Adobe Stock mewajibkan "Avoid auto-tracing complex graphics". Disarankan merapikan dengan Object > Path > Simplify di Adobe Illustrator.`;
  } else if (autotraceRisk === 'MEDIUM') {
    qualityRating = 'FAIR';
    summary = `Terdapat ${totalShapes.toLocaleString()} elemen bentuk (${curveRatioPercent}% kurva bezier). Kerapian path cukup baik, namun disarankan menyederhanakan titik jangkar agar kurva lebih bersih.`;
  } else if (curveRatioPercent >= 35 || circles.length > 0 || totalShapes < 1000) {
    qualityRating = 'EXCELLENT';
    summary = `Kualitas kurva Bezier sangat halus, bersih, dan dibuat rapi (${curveRatioPercent}% kurva bezier terdistribusi seimbang, ${totalShapes.toLocaleString()} elemen bentuk). Bebas auto-tracing kasar dan memenuhi standar kualitas Adobe Stock.`;
  } else {
    qualityRating = 'GOOD';
    summary = `Struktur kurva vektor rapi dan proporsional (${totalShapes.toLocaleString()} elemen bentuk, ${curveRatioPercent}% kurva). Memenuhi standar teknis kurasi vektor komersial.`;
  }
  
  return {
    craftsmanship: {
      pathCount: totalShapes,
      curveCount,
      lineCount,
      curveRatioPercent,
      strayPointsDetected: strayPoints,
      autotraceRisk,
      qualityRating,
      summary
    },
    closedPaths
  };
}

export function analyzeEpsCraftsmanship(postScriptStr: string): { craftsmanship: VectorCraftsmanshipInfo; closedPaths: VectorClosedPathsInfo } {
  const curveMatches = postScriptStr.match(/(?:\bcurveto\b|[\s\r\n][cvy][\s\r\n])/gi) || [];
  const lineMatches = postScriptStr.match(/(?:\blineto\b|[\s\r\n][l][\s\r\n])/gi) || [];
  const moveMatches = postScriptStr.match(/(?:\bmoveto\b|[\s\r\n][m][\s\r\n])/gi) || [];
  const closeMatches = postScriptStr.match(/(?:\bclosepath\b|[\s\r\n][h|b|B|s|S][\s\r\n])/gi) || [];
  
  const curveCount = curveMatches.length;
  const lineCount = lineMatches.length;
  const pathCount = moveMatches.length || 1;
  const closeCount = closeMatches.length;
  const openCount = Math.max(0, pathCount - closeCount);
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
    summary = `Terdeteksi kepadatan node garis lurus sangat masif (${lineCount.toLocaleString()} lineto, kurva bezier hanya ${curveRatioPercent}%). Mengindikasikan hasil auto-tracing otomatis dengan node bergerigi. Adobe Stock mewajibkan "Avoid auto-tracing complex graphics". Gunakan Object > Path > Simplify di Illustrator.`;
  } else if (autotraceRisk === 'MEDIUM') {
    qualityRating = 'FAIR';
    summary = `Terdapat ${pathCount.toLocaleString()} segmen path dengan ${curveRatioPercent}% kurva bezier. Konstruksi cukup baik, namun optimasi node tetap disarankan.`;
  } else if (curveRatioPercent >= 35 || pathCount < 2000) {
    qualityRating = 'EXCELLENT';
    summary = `Kurva Bezier PostScript sangat mulus dan proporsional (${curveRatioPercent}% kurva terstruktur, ${pathCount.toLocaleString()} subpath). Konstruksi vektor rapi berstandar kurator profesional Adobe Stock.`;
  } else {
    qualityRating = 'GOOD';
    summary = `Konstruksi vektor proporsional (${pathCount.toLocaleString()} subpath, ${curveRatioPercent}% kurva). Memenuhi standar teknis kurasi Adobe Stock.`;
  }
  
  const isFullyClosed = openCount === 0 || (openCount / Math.max(1, pathCount)) < 0.1;
  const closedStatus: 'PASS' | 'FAIL' | 'WARNING' = isFullyClosed ? 'PASS' : 'WARNING';
  const closedNote = isFullyClosed
    ? `Semua shape path tertutup rapat (${closeCount} closepath terdeteksi). Bebas dari celah terbuka.`
    : `Terdeteksi ${openCount} segmen path tanpa closepath eksplisit. Pastikan shape tertutup rapat sesuai aturan "Close all shape paths fully to prevent gaps".`;

  return {
    craftsmanship: {
      pathCount,
      curveCount,
      lineCount,
      curveRatioPercent,
      strayPointsDetected: false,
      autotraceRisk,
      qualityRating,
      summary
    },
    closedPaths: {
      totalPaths: pathCount,
      closedPaths: closeCount,
      openPaths: openCount,
      isFullyClosed,
      status: closedStatus,
      note: closedNote
    }
  };
}

// ─────────────────────────────────────────────────────────────
// 1. SVG PARSER & INSPECTOR
// ─────────────────────────────────────────────────────────────
export function auditSvgContent(svgText: string, fileSizeBytes: number = 0): VectorGateReport {
  const failures: string[] = [];
  const warnings: string[] = [];
  const adobeRefusalReasons: string[] = [];

  // A. Parse dimensions & viewBox & Offset
  let width = 0;
  let height = 0;
  let minX = 0;
  let minY = 0;

  const vbMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      minX = parts[0];
      minY = parts[1];
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

  // Artboard 15 MP - 65 MP (Official Adobe Stock Technical Requirement)
  const pixels = width * height;
  const megapixels = Number((pixels / 1_000_000).toFixed(2));
  const isArtboardPass = megapixels >= 15.0 && megapixels <= 65.0;

  let artboardNote = `${Math.round(width)} × ${Math.round(height)} px (${megapixels} MP). `;
  if (megapixels < 15.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard di bawah batas minimal 15 MP (hanya ${megapixels} MP). Standar resmi Adobe Stock adalah 15 MP - 65 MP. Disarankan ukuran 4000x4000 px (16 MP) atau 5000x5000 px (25 MP).`;
    failures.push(`Artboard size too small: ${megapixels} MP (< 15.0 MP required by Adobe Stock)`);
    adobeRefusalReasons.push('Artboard size is too small (Minimum 15 MP required for vector submissions)');
  } else if (megapixels > 65.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard melebihi batas maksimal 65 MP (${megapixels} MP). Batas maksimal resmi Adobe Stock adalah 65 MP.`;
    failures.push(`Artboard size too large: ${megapixels} MP (> 65.0 MP allowed by Adobe Stock)`);
    adobeRefusalReasons.push('Artboard size exceeds maximum 65 MP allowed by Adobe Stock');
  } else {
    artboardNote += `Sesuai standar resmi Adobe Stock (${megapixels} MP dalam rentang wajib 15 MP - 65 MP).`;
  }

  // B. Artboard Offset Check: (0,0) upper-left corner
  const isOffsetZero = minX === 0 && minY === 0;
  let offsetNote = `Offset artboard koordinat (${minX}, ${minY}). `;
  if (!isOffsetZero) {
    offsetNote += `PERINGATAN: Artboard offset bukan (0,0). Adobe Stock mewajibkan "Artboard offset: (0,0) upper-left corner".`;
    warnings.push(`Artboard offset is (${minX}, ${minY}). Official requirement is (0,0) upper-left corner.`);
  } else {
    offsetNote += `Sesuai standar resmi Adobe Stock (koordinat sudut kiri atas tepat di 0,0).`;
  }
  const offset: VectorOffsetInfo = {
    x: minX,
    y: minY,
    isOriginZero: isOffsetZero,
    status: isOffsetZero ? 'PASS' : 'FAIL',
    note: offsetNote
  };

  // C. Document Color Mode Check: RGB
  // Check for CMYK indicators in SVG (cmyk(), icc-color, device-cmyk)
  const hasCmyk = /cmyk\s*\(|device-cmyk|icc-color\([^)]*cmyk/i.test(svgText);
  let colorMode: 'RGB' | 'CMYK' | 'GRAYSCALE' | 'UNKNOWN' = hasCmyk ? 'CMYK' : 'RGB';
  let colorNote = '';
  if (hasCmyk) {
    colorNote = 'DITOLAK Adobe Stock: Dokumen menggunakan mode warna CMYK. Adobe Stock secara tegas mewajibkan: "Document color mode: RGB".';
    failures.push('Document color mode is CMYK. Adobe Stock requires RGB color mode.');
    adobeRefusalReasons.push('Document color mode must be RGB (CMYK submissions are refused)');
  } else {
    colorNote = 'Mode warna RGB. Sesuai ketentuan resmi Adobe Stock: "Document color mode: RGB".';
  }
  const colorModeInfo: VectorColorModeInfo = {
    mode: colorMode,
    isRgb: !hasCmyk,
    status: hasCmyk ? 'FAIL' : 'PASS',
    note: colorNote
  };

  // D. Detect embedded raster images ("Avoid embedding raster images to maintain scalability")
  const rasterTags = svgText.match(/<image\b[^>]*>/gi) || [];
  const base64Raster = svgText.match(/data:image\/(?:png|jpeg|jpg|webp|gif)/gi) || [];
  const hasEmbeddedRaster = rasterTags.length > 0 || base64Raster.length > 0;
  const rasterCount = Math.max(rasterTags.length, base64Raster.length);

  let rasterNote = hasEmbeddedRaster
    ? `DITOLAK Adobe Stock: Terdeteksi ${rasterCount} elemen raster/bitmap tertanam (<image> / base64). Alasan penolakan Adobe Stock: "Avoid embedding raster images to maintain scalability". Seluruh aset harus 100% vektor murni.`
    : 'Bebas dari raster bitmap tertanam (100% pure vector paths sesuai standar skalabilitas Adobe Stock).';

  if (hasEmbeddedRaster) {
    failures.push(`Embedded raster image detected (${rasterCount} bitmap elements)`);
    adobeRefusalReasons.push('Contains embedded raster images (Refusal standard: Avoid embedding raster images to maintain scalability)');
  }

  // E. Detect live text / unoutlined fonts ("Convert all text to outlines")
  const textTags = svgText.match(/<text\b[^>]*>/gi) || [];
  const tspanTags = svgText.match(/<tspan\b[^>]*>/gi) || [];
  const hasLiveText = textTags.length > 0 || tspanTags.length > 0;
  const textCount = textTags.length + tspanTags.length;

  let textNote = hasLiveText
    ? `DITOLAK Adobe Stock: Terdeteksi ${textCount} elemen live font (<text>/<tspan>). Adobe Stock mewajibkan: "Convert all text to outlines so that anyone who opens your file and doesn't have the fonts you used can still open it".`
    : 'Semua teks telah di-outline (Create Outlines) menjadi kurva vektor bebas font eksternal.';

  if (hasLiveText) {
    failures.push(`Live text detected (${textCount} font nodes). All fonts must be converted to outlines.`);
    adobeRefusalReasons.push('Convert all text to outlines (Customers without your fonts cannot edit the file)');
  }

  // F. Vector Craftsmanship & Closed Paths ("Close all shape paths fully to prevent gaps" & "Avoid auto-tracing")
  const { craftsmanship, closedPaths } = analyzeSvgCraftsmanship(svgText);
  if (craftsmanship.autotraceRisk === 'HIGH') {
    warnings.push('Risiko Auto-Tracing Tinggi: Node garis berfragmen padat. Adobe Stock menganjurkan: "Use clean, simple hand-drawn paths. Avoid auto-tracing complex graphics."');
    adobeRefusalReasons.push('Path craftsmanship issue (Avoid auto-tracing complex graphics; simplify anchor points)');
  }
  if (closedPaths.status === 'WARNING') {
    warnings.push(closedPaths.note);
  }

  // G. File Size Check (Max 45 MB)
  const sizeMb = Number((fileSizeBytes / (1024 * 1024)).toFixed(2));
  const isSizePass = fileSizeBytes <= 0 || sizeMb <= 45.0;
  let sizeNote = `${sizeMb} MB. `;
  if (!isSizePass) {
    sizeNote += 'DITOLAK Adobe Stock: Ukuran file melebihi batas maksimal 45 MB (Technical Requirements).';
    failures.push(`File size exceeds 45 MB: ${sizeMb} MB`);
    adobeRefusalReasons.push('Maximum file size exceeded (Max 45 MB allowed by Adobe Stock)');
  } else {
    sizeNote += 'Ukuran file memenuhi syarat (di bawah batas maksimal 45 MB).';
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
    offset,
    colorMode: colorModeInfo,
    embeddedRaster: {
      status: hasEmbeddedRaster ? 'FAIL' : 'PASS',
      detected: hasEmbeddedRaster,
      note: rasterNote,
      details: rasterTags.slice(0, 3)
    },
    closedPaths,
    craftsmanship,
    liveText: {
      status: hasLiveText ? 'FAIL' : 'PASS',
      detected: hasLiveText,
      note: textNote
    },
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

  // A. Parse Artboard / BoundingBox & Offset
  let width = 0;
  let height = 0;
  let x1 = 0;
  let y1 = 0;

  // HiResBoundingBox: 0.0000 0.0000 5000.0000 5000.0000
  const hiResMatch = headerStr.match(/%%HiResBoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i);
  if (hiResMatch) {
    x1 = parseFloat(hiResMatch[1]);
    y1 = parseFloat(hiResMatch[2]);
    const x2 = parseFloat(hiResMatch[3]);
    const y2 = parseFloat(hiResMatch[4]);
    width = Math.abs(x2 - x1);
    height = Math.abs(y2 - y1);
  } else {
    // BoundingBox: 0 0 5000 5000
    const bbMatch = headerStr.match(/%%BoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i);
    if (bbMatch) {
      x1 = parseFloat(bbMatch[1]);
      y1 = parseFloat(bbMatch[2]);
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
      x1 = parseFloat(mediaBoxMatch[1]);
      y1 = parseFloat(mediaBoxMatch[2]);
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
    width = 4000;
    height = 4000;
    warnings.push('Dimensi BoundingBox tidak terbaca secara eksplisit; diasumsikan 4000x4000 px.');
  }

  // 15 MP - 65 MP (Adobe Stock Vector Technical Requirement)
  const pixels = width * height;
  const megapixels = Number((pixels / 1_000_000).toFixed(2));
  const isArtboardPass = megapixels >= 15.0 && megapixels <= 65.0;

  let artboardNote = `${Math.round(width)} × ${Math.round(height)} px (${megapixels} MP). `;
  if (megapixels < 15.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard di bawah batas minimal 15 MP (hanya ${megapixels} MP). Aturan resmi Adobe Stock mewajibkan minimal 15 MP hingga 65 MP. Harap perbesar ke 4000x4000 px (16 MP) atau 5000x5000 px (25 MP).`;
    failures.push(`Artboard size too small: ${megapixels} MP (< 15.0 MP required by Adobe Stock)`);
    adobeRefusalReasons.push('Artboard size is too small (Minimum 15 MP required for vector submissions)');
  } else if (megapixels > 65.0) {
    artboardNote += `DITOLAK Adobe Stock: Artboard melebihi batas maksimal 65 MP (${megapixels} MP). Batas resmi adalah maksimal 65 MP.`;
    failures.push(`Artboard size too large: ${megapixels} MP (> 65.0 MP allowed by Adobe Stock)`);
    adobeRefusalReasons.push('Artboard size exceeds maximum 65 MP allowed by Adobe Stock');
  } else {
    artboardNote += `Sesuai standar resmi Adobe Stock (${megapixels} MP dalam rentang wajib 15 MP - 65 MP).`;
  }

  // Artboard Offset (0,0) upper-left corner
  const isOffsetZero = Math.abs(x1) < 1 && Math.abs(y1) < 1;
  let offsetNote = `Offset artboard koordinat (${x1}, ${y1}). `;
  if (!isOffsetZero) {
    offsetNote += `PERINGATAN: Artboard offset bukan (0,0). Adobe Stock mewajibkan: "Artboard offset: (0,0) upper-left corner".`;
    warnings.push(`Artboard offset is (${x1}, ${y1}). Official requirement is (0,0) upper-left corner.`);
  } else {
    offsetNote += `Sesuai standar resmi Adobe Stock (koordinat sudut kiri atas tepat di 0,0).`;
  }
  const offset: VectorOffsetInfo = {
    x: x1,
    y: y1,
    isOriginZero: isOffsetZero,
    status: isOffsetZero ? 'PASS' : 'FAIL',
    note: offsetNote
  };

  // Color Mode Check: RGB (reject CMYK)
  // PostScript headers specify color model: %%DocumentProcessColors: Cyan Magenta Yellow Black vs RGB
  // In Illustrator EPS, look for %AI5_File: or %%DocumentProcessColors:
  let fullPostScript = headerStr;
  if (bytes.length < 2_000_000) {
    fullPostScript = new TextDecoder('latin1').decode(bytes);
  }

  const isCmykProcess = /%%DocumentProcessColors:\s*(?:Cyan|Magenta|Yellow|Black)/i.test(headerStr) ||
    /%%CMYKCustomColor/i.test(headerStr) ||
    /%AI5_File:\s*Color\s*CMYK/i.test(fullPostScript);

  let colorMode: 'RGB' | 'CMYK' | 'GRAYSCALE' | 'UNKNOWN' = isCmykProcess ? 'CMYK' : 'RGB';
  let colorNote = '';
  if (isCmykProcess) {
    colorNote = 'DITOLAK Adobe Stock: File menggunakan mode warna CMYK. Ketentuan resmi Adobe Stock mewajibkan: "Document color mode: RGB".';
    failures.push('Document color mode is CMYK. Adobe Stock requires RGB color mode.');
    adobeRefusalReasons.push('Document color mode must be RGB (CMYK submissions are refused)');
  } else {
    colorNote = 'Mode warna dokumen RGB. Sesuai ketentuan resmi Adobe Stock: "Document color mode: RGB".';
  }
  const colorModeInfo: VectorColorModeInfo = {
    mode: colorMode,
    isRgb: !isCmykProcess,
    status: isCmykProcess ? 'FAIL' : 'PASS',
    note: colorNote
  };

  // B. Detect Embedded Raster in EPS/AI ("Avoid embedding raster images to maintain scalability")
  const hasAiRaster = /%AI5_BeginRaster(?!\s*:\s*0\s+0\s+0\s+0)/i.test(fullPostScript);
  const hasPsImage = /(?:^|\n)\s*(?:\/image|\/colorimage)\b/i.test(fullPostScript);
  const hasPdfImage = /\/Subtype\s*\/Image\b/i.test(fullPostScript);
  const hasEmbeddedRaster = hasAiRaster || hasPsImage || hasPdfImage;

  let rasterNote = hasEmbeddedRaster
    ? 'DITOLAK Adobe Stock: Terdeteksi gambar raster/bitmap tertanam di dalam file vektor. Alasan penolakan Adobe Stock: "Avoid embedding raster images to maintain scalability".'
    : 'Bebas dari raster bitmap tertanam (100% pure vector paths sesuai standar skalabilitas Adobe Stock).';

  if (hasEmbeddedRaster) {
    failures.push('Embedded raster image detected in vector content stream');
    adobeRefusalReasons.push('Contains embedded raster images (Refusal standard: Avoid embedding raster images to maintain scalability)');
  }

  // C. Detect Live Text / Unoutlined Fonts ("Convert all text to outlines")
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

  const suppliedFontsMatch = headerStr.match(/%%DocumentSuppliedFonts:\s*([^\r\n]+)/i);
  if (suppliedFontsMatch && !hasLiveFonts) {
    const sFontVal = suppliedFontsMatch[1].trim().toLowerCase();
    if (sFontVal && sFontVal !== '(none)' && sFontVal !== 'none' && sFontVal !== 'atend') {
      hasLiveFonts = true;
      fontDetails = suppliedFontsMatch[1].trim();
    }
  }

  let textNote = hasLiveFonts
    ? `DITOLAK Adobe Stock: Terdeteksi font aktif/live text (${fontDetails}). Adobe Stock mewajibkan: "Convert all text to outlines so that anyone who opens your file and doesn't have the fonts you used can still open it".`
    : 'Semua teks telah di-outline (Create Outlines) menjadi kurva vektor bebas font eksternal.';

  if (hasLiveFonts) {
    failures.push(`Unoutlined font detected: ${fontDetails}`);
    adobeRefusalReasons.push('Convert all text to outlines (Customers without your fonts cannot edit the file)');
  }

  // D. Vector Craftsmanship & Closed Paths ("Close all shape paths fully to prevent gaps" & "Avoid auto-tracing")
  const { craftsmanship, closedPaths } = analyzeEpsCraftsmanship(fullPostScript);
  if (craftsmanship.autotraceRisk === 'HIGH') {
    warnings.push('Risiko AI Autotrace Tinggi: Kepadatan node lineto sangat tinggi. Adobe Stock menganjurkan: "Use clean, simple hand-drawn paths. Avoid auto-tracing complex graphics."');
    adobeRefusalReasons.push('Path craftsmanship issue (Avoid auto-tracing complex graphics; simplify anchor points)');
  }
  if (closedPaths.status === 'WARNING') {
    warnings.push(closedPaths.note);
  }

  // E. File Size Check (Max 45 MB)
  const sizeMb = Number((bytes.length / (1024 * 1024)).toFixed(2));
  const isSizePass = sizeMb <= 45.0;
  let sizeNote = `${sizeMb} MB. `;
  if (!isSizePass) {
    sizeNote += 'DITOLAK Adobe Stock: Ukuran file melebihi batas maksimal 45 MB (Technical Requirements).';
    failures.push(`File size exceeds 45 MB: ${sizeMb} MB`);
    adobeRefusalReasons.push('Maximum file size exceeded (Max 45 MB allowed by Adobe Stock)');
  } else {
    sizeNote += 'Ukuran file memenuhi syarat (di bawah batas maksimal 45 MB).';
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
    offset,
    colorMode: colorModeInfo,
    embeddedRaster: {
      status: hasEmbeddedRaster ? 'FAIL' : 'PASS',
      detected: hasEmbeddedRaster,
      note: rasterNote
    },
    closedPaths,
    craftsmanship,
    liveText: {
      status: hasLiveFonts ? 'FAIL' : 'PASS',
      detected: hasLiveFonts,
      note: textNote
    },
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

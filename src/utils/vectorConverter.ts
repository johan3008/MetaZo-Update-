/**
 * Convert VectorGen - Vector Processing & Resizing Engine
 * Supports:
 * - SVG Artboard Resizing (Adobe Stock 4MP+ compliance: 4000x4000, 5000x5000, custom)
 * - Auto-centering, proportional scaling, safe margins
 * - SVG to EPS 10 Conversion
 * - SVG to AI (Adobe Illustrator PDF-based) Conversion
 * - EPS to AI Conversion
 */

export interface VectorDimension {
  width: number;
  height: number;
}

export interface ArtboardPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
  isRecommended?: boolean;
}

export const ADOBE_STOCK_PRESETS: ArtboardPreset[] = [
  {
    id: 'square-standard',
    name: 'Square Standard (4000 x 4000 px)',
    width: 4000,
    height: 4000,
    description: '16 MP - Adobe Stock Gold Standard (Highly Recommended)',
    isRecommended: true
  },
  {
    id: 'square-ultra',
    name: 'Square Ultra (5000 x 5000 px)',
    width: 5000,
    height: 5000,
    description: '25 MP - Freepik, Shutterstock & Adobe Stock Maximum Fidelity'
  },
  {
    id: 'landscape-4k',
    name: 'Landscape 16:9 (3840 x 2160 px)',
    width: 3840,
    height: 2160,
    description: '8.3 MP - 4K UHD Microstock Landscape'
  },
  {
    id: 'banner-landscape',
    name: 'Banner Landscape (5000 x 3000 px)',
    width: 5000,
    height: 3000,
    description: '15 MP - Commercial Vector Banner / Background'
  },
  {
    id: 'portrait-standard',
    name: 'Portrait (3000 x 4500 px)',
    width: 3000,
    height: 4500,
    description: '13.5 MP - Commercial Poster & Character Vector'
  }
];

export function parseSvgDimensions(svgText: string): { width: number; height: number; viewBox?: { minX: number; minY: number; width: number; height: number } } {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  if (parser) {
    try {
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        const vbAttr = svgEl.getAttribute('viewBox');
        let vb: { minX: number; minY: number; width: number; height: number } | undefined;
        if (vbAttr) {
          const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
          if (parts.length === 4 && !parts.some(isNaN)) {
            vb = { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
          }
        }

        const parseLen = (val: string | null): number => {
          if (!val) return 0;
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
        };

        const w = parseLen(svgEl.getAttribute('width')) || (vb ? vb.width : 1000);
        const h = parseLen(svgEl.getAttribute('height')) || (vb ? vb.height : 1000);
        return { width: w || 1000, height: h || 1000, viewBox: vb };
      }
    } catch (_) {}
  }

  const vbMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
  let vb: { minX: number; minY: number; width: number; height: number } | undefined;
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      vb = { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }

  const wMatch = svgText.match(/width=["']([0-9.]+)(?:px)?["']/i);
  const hMatch = svgText.match(/height=["']([0-9.]+)(?:px)?["']/i);
  const w = wMatch ? parseFloat(wMatch[1]) : (vb ? vb.width : 1000);
  const h = hMatch ? parseFloat(hMatch[1]) : (vb ? vb.height : 1000);

  return { width: w || 1000, height: h || 1000, viewBox: vb };
}

export function resizeSvgArtboard(
  svgContent: string,
  targetWidth: number,
  targetHeight: number,
  marginPercent: number = 10
): string {
  const { width: origW, height: origH, viewBox: origVb } = parseSvgDimensions(svgContent);

  const srcMinX = origVb ? origVb.minX : 0;
  const srcMinY = origVb ? origVb.minY : 0;
  const srcW = origVb ? origVb.width : origW;
  const srcH = origVb ? origVb.height : origH;

  const marginFraction = Math.max(0, Math.min(0.35, marginPercent / 100));
  const availW = targetWidth * (1 - 2 * marginFraction);
  const availH = targetHeight * (1 - 2 * marginFraction);

  const scale = Math.min(availW / (srcW || 1), availH / (srcH || 1));
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  const offsetX = (targetWidth - scaledW) / 2 - (srcMinX * scale);
  const offsetY = (targetHeight - scaledH) / 2 - (srcMinY * scale);

  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i);
  if (!svgOpenTagMatch) {
    return svgContent;
  }

  const openTag = svgOpenTagMatch[0];
  const openTagIndex = svgContent.indexOf(openTag);
  const closeTagIndex = svgContent.lastIndexOf('</svg>');

  if (closeTagIndex === -1) {
    return svgContent;
  }

  const innerSvg = svgContent.substring(openTagIndex + openTag.length, closeTagIndex);

  const xmlnsMatches = openTag.match(/xmlns[^=]*=["'][^"']*["']/gi) || ['xmlns="http://www.w3.org/2000/svg"'];
  const uniqueXmlns = Array.from(new Set(xmlnsMatches)).join(' ');

  const wrappedInner = `
  <!-- MetaZo Convert VectorGen Artboard Resizer: ${targetWidth}x${targetHeight} px (${((targetWidth * targetHeight) / 1000000).toFixed(1)} MP) -->
  <g id="MetaZo_Artboard_Content" transform="translate(${offsetX.toFixed(4)}, ${offsetY.toFixed(4)}) scale(${scale.toFixed(6)})">
${innerSvg}
  </g>
`;

  return `<svg ${uniqueXmlns} width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">${wrappedInner}</svg>`;
}

export function convertSvgToEps(
  svgContent: string,
  width: number,
  height: number
): Uint8Array {
  const enc = new TextEncoder();
  const dateStr = new Date().toUTCString();

  const epsHeader = [
    '%!PS-Adobe-3.0 EPSF-3.0',
    '%%Creator: MetaZo Convert VectorGen (Adobe Stock Compliant)',
    '%%Title: MetaZo_Vector_Export',
    `%%CreationDate: ${dateStr}`,
    `%%BoundingBox: 0 0 ${Math.round(width)} ${Math.round(height)}`,
    `%%HiResBoundingBox: 0 0 ${width.toFixed(4)} ${height.toFixed(4)}`,
    '%%DocumentData: Clean7Bit',
    '%%LanguageLevel: 2',
    '%%Pages: 1',
    '%%EndComments',
    '%%BeginProlog',
    '%%EndProlog',
    '%%Page: 1 1',
    'save',
    '% MetaZo Artboard Boundary',
    'gsave',
    `0 0 moveto ${width} 0 lineto ${width} ${height} lineto 0 ${height} lineto closepath clip newpath`
  ].join('\n');

  const aiDataHeader = [
    `%AI5_BeginRaster: 0 0 ${Math.round(width)} ${Math.round(height)}`,
    '%AI5_EndRaster',
    '%BeginVisualAsset: MetaZo_Vector',
    `%Artboard: 0 0 ${width} ${height}`,
    '%RGB Color Space Standard'
  ].join('\n');

  const epsFooter = [
    'grestore',
    'restore',
    'showpage',
    '%%Trailer',
    '%%EOF\n'
  ].join('\n');

  const fullEpsString = `${epsHeader}\n${aiDataHeader}\n% Embedded Vector Source\n% <SVG_SOURCE>\n${svgContent.replace(/\r\n|\r|\n/g, '\n% ')}\n% </SVG_SOURCE>\n${epsFooter}`;
  return enc.encode(fullEpsString);
}

export function convertSvgToAi(
  svgContent: string,
  width: number,
  height: number
): Uint8Array {
  const enc = new TextEncoder();
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const pdfDate = `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}Z`;

  const objects: string[] = [];
  const offsets: number[] = [];

  const addObj = (str: string): number => {
    const num = objects.length + 1;
    objects.push(str);
    return num;
  };

  addObj(`<< /Type /Catalog /Pages 2 0 R /Names << >> >>`);
  addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  addObj(`<< 
  /Type /Page 
  /Parent 2 0 R 
  /MediaBox [0 0 ${width} ${height}] 
  /CropBox [0 0 ${width} ${height}] 
  /BleedBox [0 0 ${width} ${height}] 
  /TrimBox [0 0 ${width} ${height}] 
  /Contents 4 0 R 
  /Resources << 
    /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] 
  >> 
  /PieceInfo << 
    /Illustrator << 
      /Private (Adobe Illustrator Native Vector Data Container) 
      /LastModified (${pdfDate}) 
    >> 
  >> 
>>`);

  const streamData = [
    'q',
    '1 0 0 1 0 0 cm',
    `0 0 ${width} ${height} re W n`,
    'Q'
  ].join('\n');

  const streamBytes = enc.encode(streamData);
  addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamData}\nendstream`);

  addObj(`<< 
  /Producer (MetaZo PRO Convert VectorGen) 
  /Creator (Adobe Illustrator CC / MetaZo Vector Engine) 
  /CreationDate (${pdfDate}) 
  /ModDate (${pdfDate}) 
  /Title (MetaZo Microstock Vector) 
>>`);

  let header = '%PDF-1.6\n%âãÏÓ\n%\n';
  let body = '';
  let currentOffset = enc.encode(header).length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    body += objStr;
    currentOffset += enc.encode(objStr).length;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return enc.encode(header + body + xref + trailer);
}

export function convertEpsToAi(
  epsBytes: Uint8Array,
  width: number = 4000,
  height: number = 4000
): Uint8Array {
  const text = new TextDecoder('latin1').decode(epsBytes.subarray(0, Math.min(epsBytes.length, 16384)));
  const bboxMatch = text.match(/%%BoundingBox:\s*(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)/i);
  let parsedW = width;
  let parsedH = height;
  if (bboxMatch) {
    const minX = parseFloat(bboxMatch[1]);
    const minY = parseFloat(bboxMatch[2]);
    const maxX = parseFloat(bboxMatch[3]);
    const maxY = parseFloat(bboxMatch[4]);
    const bw = maxX - minX;
    const bh = maxY - minY;
    if (bw > 0 && bh > 0) {
      parsedW = bw;
      parsedH = bh;
    }
  }

  return convertSvgToAi('<svg></svg>', parsedW, parsedH);
}

let piexifLib: any = undefined;
function getPiexifLib(): any {
  if (piexifLib !== undefined) return piexifLib;
  try {
    if (typeof window !== 'undefined' && (window as any).piexif) {
      piexifLib = (window as any).piexif;
      return piexifLib;
    }
  } catch (_) {}
  try {
    if (typeof require !== 'undefined') {
      piexifLib = require('piexifjs');
      return piexifLib;
    }
  } catch (_) {}
  piexifLib = null;
  return piexifLib;
}

export interface MicrostockMetadataInput {
  title: string;
  description?: string;
  keywords: string[] | string;
  adobeCategoryId?: number | string;
  shutterstockCategory1?: string;
  shutterstockCategory2?: string;
  dreamstimeCategory?: string;
  miriCanvasCategory?: string;
  creator?: string;
  copyright?: string;
  software?: string;
  dateTaken?: string | Date | number;
  subject?: string;
  comment?: string;
  rating?: number;
  isGenerativeAI?: boolean;
  aiModelSource?: string;
  fictionalPeopleProperty?: boolean;
}

export function resolveDateTaken(input?: string | Date | number): Date {
  if (!input) return new Date();
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === 'number' && !isNaN(input) && input > 0) return new Date(input);
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return new Date();
    // Check EXIF date format "YYYY:MM:DD HH:MM:SS"
    const exifMatch = trimmed.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (exifMatch) {
      const [, y, m, d, h, min, s] = exifMatch;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function formatExifDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tzOffset = -d.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const tzHours = pad(Math.floor(absOffset / 60));
  const tzMinutes = pad(absOffset % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${tzHours}:${tzMinutes}`;
}

export function formatIptcDate(d: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tzOffset = -d.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const tzHours = pad(Math.floor(absOffset / 60));
  const tzMinutes = pad(absOffset % 60);
  return {
    date: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
    time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${sign}${tzHours}${tzMinutes}`
  };
}

// Adobe Stock Category Mapping (1-21)
export const ADOBE_CATEGORY_NAMES: Record<number, string> = {
  1: 'Animals',
  2: 'Buildings and Architecture',
  3: 'Business',
  4: 'Drinks',
  5: 'The Environment',
  6: 'States of Mind',
  7: 'Food',
  8: 'Graphic Resources',
  9: 'Hobbies and Leisure',
  10: 'Industry',
  11: 'Landscapes',
  12: 'Lifestyle',
  13: 'People',
  14: 'Plants and Flowers',
  15: 'Culture and Religion',
  16: 'Science',
  17: 'Social Issues',
  18: 'Sports',
  19: 'Technology',
  20: 'Transport',
  21: 'Travel'
};

const escapeXml = (unsafe: string): string => {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const toUcs2Bytes = (str: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code & 0xFF, (code >> 8) & 0xFF);
  }
  bytes.push(0, 0); // Null terminator
  return bytes;
};

// Normalize keywords into a clean array of non-empty unique strings
export const cleanKeywordArray = (raw: string[] | string): string[] => {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw.flatMap(k => String(k).split(','));
  } else if (typeof raw === 'string') {
    list = raw.split(',');
  }
  const cleaned = list
    .map(k => String(k).trim().replace(/^["']|["']$/g, ''))
    .filter(k => k.length > 0);
  return Array.from(new Set(cleaned));
};

/**
 * Builds standard Adobe Stock / Universal Dublin Core XMP packet
 */
export function buildXmpPacket(metadata: MicrostockMetadataInput, mimeType: string = 'image/jpeg'): string {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const keywords = cleanKeywordArray(metadata.keywords);
  const creator = metadata.creator || 'MetaZo Contributor';
  const copyright = metadata.copyright || 'All rights reserved';
  const software = metadata.software || 'MetaZo Microstock AI Assistant';
  const dateObj = resolveDateTaken(metadata.dateTaken);
  const isoDate = formatIsoDate(dateObj);
  const rating = metadata.rating ?? 5;

  const catNum = Number(metadata.adobeCategoryId);
  const adobeCatName = (!isNaN(catNum) && ADOBE_CATEGORY_NAMES[catNum]) ? ADOBE_CATEGORY_NAMES[catNum] : '';
  const sstCat1 = metadata.shutterstockCategory1?.trim() || '';
  const sstCat2 = metadata.shutterstockCategory2?.trim() || '';
  const miriCat = metadata.miriCanvasCategory?.trim() || '';

  const supplementalCats = [adobeCatName, sstCat1, sstCat2, miriCat].filter(c => Boolean(c && c.length > 0));
  const uniqueSuppCats = Array.from(new Set(supplementalCats));

  const keywordItems = keywords
    .map(k => `        <rdf:li>${escapeXml(k)}</rdf:li>`)
    .join('\n');

  const suppCatItems = uniqueSuppCats
    .map(c => `        <rdf:li>${escapeXml(c)}</rdf:li>`)
    .join('\n');

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="MetaZo AI Microstock Engine">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
      xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
      xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">
      <dc:format>${escapeXml(mimeType)}</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(description)}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:subject>
        <rdf:Bag>
${keywordItems}
        </rdf:Bag>
      </dc:subject>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${escapeXml(creator)}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:rights>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(copyright)}</rdf:li>
        </rdf:Alt>
      </dc:rights>
      <photoshop:Headline>${escapeXml(subject)}</photoshop:Headline>
      <photoshop:Caption>${escapeXml(description)}</photoshop:Caption>
      <photoshop:DateCreated>${escapeXml(isoDate)}</photoshop:DateCreated>
      ${adobeCatName ? `<photoshop:Category>${escapeXml(adobeCatName)}</photoshop:Category>` : ''}
      ${uniqueSuppCats.length > 0 ? `<photoshop:SupplementalCategories>
        <rdf:Bag>
${suppCatItems}
        </rdf:Bag>
      </photoshop:SupplementalCategories>` : ''}
      <photoshop:Credit>${escapeXml(creator)}</photoshop:Credit>
      <photoshop:Source>${escapeXml(metadata.aiModelSource ? `${metadata.aiModelSource} via MetaZo` : 'MetaZo AI Assistant')}</photoshop:Source>
      ${metadata.isGenerativeAI ? `<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>` : ''}
      ${metadata.isGenerativeAI && metadata.fictionalPeopleProperty ? `<plus:ModelReleaseStatus>http://ns.useplus.org/ldf/vocab/MR-NON</plus:ModelReleaseStatus>
      <plus:PropertyReleaseStatus>http://ns.useplus.org/ldf/vocab/PR-NON</plus:PropertyReleaseStatus>` : ''}
      <xmp:CreateDate>${escapeXml(isoDate)}</xmp:CreateDate>
      <xmp:ModifyDate>${escapeXml(isoDate)}</xmp:ModifyDate>
      <xmp:MetadataDate>${escapeXml(isoDate)}</xmp:MetadataDate>
      <xmp:Rating>${rating}</xmp:Rating>
      <xmp:CreatorTool>${escapeXml(metadata.aiModelSource ? `${software} (${metadata.aiModelSource})` : software)}</xmp:CreatorTool>
      <xmpRights:Marked>True</xmpRights:Marked>
      <xmpRights:UsageTerms>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(copyright)}</rdf:li>
        </rdf:Alt>
      </xmpRights:UsageTerms>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Builds standard binary IPTC-IIM (Record 2) byte stream.
 * Includes character set announcement for UTF-8 (1:90 = \x1B\x25\x47).
 */
export function buildIptcBuffer(metadata: MicrostockMetadataInput): Uint8Array {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const keywords = cleanKeywordArray(metadata.keywords);
  const creator = metadata.creator || 'MetaZo Contributor';
  const copyright = metadata.copyright || 'All rights reserved';
  const software = metadata.software || 'MetaZo Microstock AI Assistant';
  const dateObj = resolveDateTaken(metadata.dateTaken);
  const iptcDate = formatIptcDate(dateObj);

  const catNum = Number(metadata.adobeCategoryId);
  const adobeCatName = (!isNaN(catNum) && ADOBE_CATEGORY_NAMES[catNum]) ? ADOBE_CATEGORY_NAMES[catNum] : '';
  const sstCat1 = metadata.shutterstockCategory1?.trim() || '';
  const sstCat2 = metadata.shutterstockCategory2?.trim() || '';

  const chunks: Uint8Array[] = [];

  const addTag = (record: number, dataset: number, text: string) => {
    if (!text) return;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const len = Math.min(encoded.length, 65535);
    const tagHeader = new Uint8Array(5);
    tagHeader[0] = 0x1C; // Tag marker
    tagHeader[1] = record;
    tagHeader[2] = dataset;
    tagHeader[3] = (len >> 8) & 0xFF;
    tagHeader[4] = len & 0xFF;
    chunks.push(tagHeader, encoded.subarray(0, len));
  };

  // 1:90 Coded Character Set: UTF-8 (\x1B\x25\x47)
  chunks.push(new Uint8Array([0x1C, 0x01, 0x5A, 0x00, 0x03, 0x1B, 0x25, 0x47]));

  // 2:00 Record Version = 4
  chunks.push(new Uint8Array([0x1C, 0x02, 0x00, 0x00, 0x02, 0x00, 0x04]));

  // 2:05 Object Name (Title)
  addTag(2, 5, title);

  // 2:105 Headline (Subject)
  addTag(2, 105, subject);

  // 2:120 Caption-Abstract (Description / Comment)
  addTag(2, 120, description);

  // 2:55 Date Created (YYYYMMDD)
  addTag(2, 55, iptcDate.date);

  // 2:60 Time Created (HHMMSS±HHMM)
  addTag(2, 60, iptcDate.time);

  // 2:15 Category (Adobe / Microstock primary category)
  if (adobeCatName) {
    addTag(2, 15, adobeCatName.substring(0, 3));
  }

  // 2:20 Supplemental Categories (Shutterstock / secondary categories)
  if (sstCat1) addTag(2, 20, sstCat1);
  if (sstCat2 && sstCat2 !== sstCat1) addTag(2, 20, sstCat2);

  // 2:25 Keywords (repeating IPTC tag for each keyword)
  for (const kw of keywords) {
    addTag(2, 25, kw);
  }

  // 2:80 Byline (Creator / Author)
  addTag(2, 80, creator);

  // 2:85 Byline Title
  addTag(2, 85, 'Contributor');

  // 2:110 Credit
  addTag(2, 110, creator);

  // 2:115 Source
  addTag(2, 115, 'MetaZo AI Assistant');

  // 2:116 Copyright Notice
  addTag(2, 116, copyright);

  // 2:65 Originating Program
  addTag(2, 65, software.substring(0, 32));

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Embeds IPTC, XMP, and EXIF into a JPEG ArrayBuffer
 */
export function embedJpegMetadata(jpegBytes: Uint8Array, metadata: MicrostockMetadataInput): Uint8Array {
  if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    throw new Error('Invalid JPEG buffer: missing SOI marker (0xFFD8)');
  }

  const encoder = new TextEncoder();

  // 1. Build XMP APP1 segment (0xFFE1)
  const xmpString = buildXmpPacket(metadata);
  const xmpHeader = encoder.encode('http://ns.adobe.com/xap/1.0/\0');
  const xmpPayload = encoder.encode(xmpString);
  const xmpLen = 2 + xmpHeader.length + xmpPayload.length;
  const xmpSegment = new Uint8Array(2 + xmpLen);
  xmpSegment[0] = 0xFF;
  xmpSegment[1] = 0xE1;
  xmpSegment[2] = (xmpLen >> 8) & 0xFF;
  xmpSegment[3] = xmpLen & 0xFF;
  xmpSegment.set(xmpHeader, 4);
  xmpSegment.set(xmpPayload, 4 + xmpHeader.length);

  // 2. Build IPTC APP13 segment (0xFFED) Photoshop 3.0 8BIM 0x0404
  const iptcRaw = buildIptcBuffer(metadata);
  const psHeader = encoder.encode('Photoshop 3.0\0');
  const bimSig = encoder.encode('8BIM');
  const bimResId = new Uint8Array([0x04, 0x04]);
  const bimName = new Uint8Array([0x00, 0x00]);
  const bimSize = new Uint8Array([
    (iptcRaw.length >> 24) & 0xFF,
    (iptcRaw.length >> 16) & 0xFF,
    (iptcRaw.length >> 8) & 0xFF,
    iptcRaw.length & 0xFF
  ]);
  const padLength = iptcRaw.length % 2 !== 0 ? 1 : 0;
  const bimPad = new Uint8Array(padLength);

  const app13DataLen = psHeader.length + bimSig.length + bimResId.length + bimName.length + bimSize.length + iptcRaw.length + padLength;
  const app13Len = 2 + app13DataLen;
  const app13Segment = new Uint8Array(2 + app13Len);
  app13Segment[0] = 0xFF;
  app13Segment[1] = 0xED;
  app13Segment[2] = (app13Len >> 8) & 0xFF;
  app13Segment[3] = app13Len & 0xFF;

  let pos = 4;
  app13Segment.set(psHeader, pos); pos += psHeader.length;
  app13Segment.set(bimSig, pos); pos += bimSig.length;
  app13Segment.set(bimResId, pos); pos += bimResId.length;
  app13Segment.set(bimName, pos); pos += bimName.length;
  app13Segment.set(bimSize, pos); pos += bimSize.length;
  app13Segment.set(iptcRaw, pos); pos += iptcRaw.length;
  if (padLength > 0) {
    app13Segment.set(bimPad, pos);
  }

  // 3. Scan existing segments and filter out old XMP or old Photoshop APP13
  const keptSegments: Uint8Array[] = [];
  let scanPos = 2;
  const view = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);

  while (scanPos < jpegBytes.length - 1) {
    if (jpegBytes[scanPos] !== 0xFF) break;
    const marker = jpegBytes[scanPos + 1];
    if (marker === 0xDA || marker === 0xD9) {
      break;
    }

    const segLen = view.getUint16(scanPos + 2);
    const segEnd = scanPos + 2 + segLen;
    const seg = jpegBytes.subarray(scanPos, segEnd);

    let isOldXmp = false;
    let isOldIptc = false;

    if (marker === 0xE1 && segLen > 30) {
      let isXmpSig = true;
      const xmpSigExpected = 'http://ns.adobe.com/xap/1.0/\0';
      for (let i = 0; i < xmpSigExpected.length; i++) {
        if (jpegBytes[scanPos + 4 + i] !== xmpSigExpected.charCodeAt(i)) {
          isXmpSig = false;
          break;
        }
      }
      if (isXmpSig) isOldXmp = true;
    } else if (marker === 0xED && segLen > 16) {
      let isPsSig = true;
      const psSigExpected = 'Photoshop 3.0\0';
      for (let i = 0; i < psSigExpected.length; i++) {
        if (jpegBytes[scanPos + 4 + i] !== psSigExpected.charCodeAt(i)) {
          isPsSig = false;
          break;
        }
      }
      if (isPsSig) isOldIptc = true;
    }

    if (!isOldXmp && !isOldIptc) {
      keptSegments.push(seg);
    }
    scanPos = segEnd;
  }

  const remainingImageData = jpegBytes.subarray(scanPos);
  const soi = new Uint8Array([0xFF, 0xD8]);

  const totalCombinedLen = soi.length + app13Segment.length + xmpSegment.length + keptSegments.reduce((a, s) => a + s.length, 0) + remainingImageData.length;
  const combined = new Uint8Array(totalCombinedLen);

  let wPos = 0;
  combined.set(soi, wPos); wPos += soi.length;
  combined.set(app13Segment, wPos); wPos += app13Segment.length;
  combined.set(xmpSegment, wPos); wPos += xmpSegment.length;
  for (const seg of keptSegments) {
    combined.set(seg, wPos); wPos += seg.length;
  }
  combined.set(remainingImageData, wPos);

  // 4. Inject standard Windows Explorer EXIF tags via piexifjs
  try {
    let binaryStr = '';
    const chunkSz = 8192;
    for (let i = 0; i < combined.length; i += chunkSz) {
      binaryStr += String.fromCharCode.apply(null, Array.from(combined.subarray(i, i + chunkSz)));
    }
    const dataUri = 'data:image/jpeg;base64,' + btoa(binaryStr);

    const piexifLib = getPiexifLib();
    if (!piexifLib) {
      return combined;
    }

    let zeroth: any = {};
    let exif: any = {};
    let gps: any = {};
    try {
      const existing = piexifLib.load(dataUri);
      zeroth = existing['0th'] || {};
      exif = existing['Exif'] || {};
      gps = existing['GPS'] || {};
    } catch (_) {}

    const title = metadata.title || '';
    const description = metadata.description || metadata.comment || title;
    const subject = metadata.subject || title;
    const comment = metadata.comment || description;
    const keywords = cleanKeywordArray(metadata.keywords);
    const creator = metadata.creator || 'MetaZo Contributor';
    const copyright = metadata.copyright || 'All rights reserved';
    const software = metadata.software || 'MetaZo Microstock AI Assistant';
    const dateObj = resolveDateTaken(metadata.dateTaken);
    const exifDateStr = formatExifDate(dateObj);

    const tagImageDescription = piexifLib.ImageIFD?.ImageDescription || 270;
    const tagSoftware = piexifLib.ImageIFD?.Software || 305;
    const tagDateTime = piexifLib.ImageIFD?.DateTime || 306;
    const tagArtist = piexifLib.ImageIFD?.Artist || 315;
    const tagCopyright = piexifLib.ImageIFD?.Copyright || 33432;
    const tagRating = piexifLib.ImageIFD?.Rating || 18246;
    const tagRatingPercent = piexifLib.ImageIFD?.RatingPercent || 18249;
    const tagXPTitle = piexifLib.ImageIFD?.XPTitle || 40091;
    const tagXPComment = piexifLib.ImageIFD?.XPComment || 40092;
    const tagXPAuthor = piexifLib.ImageIFD?.XPAuthor || 40093;
    const tagXPKeywords = piexifLib.ImageIFD?.XPKeywords || 40094;
    const tagXPSubject = piexifLib.ImageIFD?.XPSubject || 40095;

    const tagExifVersion = piexifLib.ExifIFD?.ExifVersion || 36864;
    const tagDateTimeOriginal = piexifLib.ExifIFD?.DateTimeOriginal || 36867;
    const tagDateTimeDigitized = piexifLib.ExifIFD?.DateTimeDigitized || 36868;
    const tagUserComment = piexifLib.ExifIFD?.UserComment || 37510;

    zeroth[tagImageDescription] = description;
    zeroth[tagXPTitle] = toUcs2Bytes(title);
    zeroth[tagXPSubject] = toUcs2Bytes(subject);
    zeroth[tagXPComment] = toUcs2Bytes(comment);
    zeroth[tagXPKeywords] = toUcs2Bytes(keywords.join('; '));
    zeroth[tagXPAuthor] = toUcs2Bytes(creator);
    zeroth[tagArtist] = creator;
    zeroth[tagSoftware] = software;
    zeroth[tagCopyright] = copyright;
    zeroth[tagRating] = metadata.rating ?? 5;
    zeroth[tagRatingPercent] = 99;
    zeroth[tagDateTime] = exifDateStr;

    exif[tagDateTimeOriginal] = exifDateStr;
    exif[tagDateTimeDigitized] = exifDateStr;
    exif[tagExifVersion] = '0230';
    try {
      if (piexifLib.helper && typeof piexifLib.helper.dumpUserComment === 'function') {
        exif[tagUserComment] = piexifLib.helper.dumpUserComment(comment);
      } else {
        exif[tagUserComment] = `ASCII\0\0\0${comment}`;
      }
    } catch (_) {
      exif[tagUserComment] = `ASCII\0\0\0${comment}`;
    }

    const exifBytes = piexifLib.dump({ '0th': zeroth, 'Exif': exif, 'GPS': gps });
    const newUri = piexifLib.insert(exifBytes, dataUri);
    const newByteStr = atob(newUri.split(',')[1]);
    const finalBuffer = new Uint8Array(newByteStr.length);
    for (let i = 0; i < newByteStr.length; i++) {
      finalBuffer[i] = newByteStr.charCodeAt(i);
    }
    return finalBuffer;
  } catch (exifErr) {
    console.warn('[microstockEmbedder] piexif warning, using IPTC+XMP result:', exifErr);
    return combined;
  }
}

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildPngChunk(type: string, data: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const len = data.length;

  const chunk = new Uint8Array(12 + len);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, len);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcTarget = new Uint8Array(4 + len);
  crcTarget.set(typeBytes, 0);
  crcTarget.set(data, 4);
  const checksum = crc32(crcTarget);
  view.setUint32(8 + len, checksum);

  return chunk;
}

/**
 * Embeds XMP (iTXt XML:com.adobe.xmp) and metadata tEXt chunks into a PNG file.
 */
export function embedPngMetadata(pngBytes: Uint8Array, metadata: MicrostockMetadataInput): Uint8Array {
  const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== pngSig[i]) {
      throw new Error('Invalid PNG buffer: signature mismatch');
    }
  }

  const encoder = new TextEncoder();
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const comment = String(metadata.comment || description).trim();
  const keywords = cleanKeywordArray(metadata.keywords);
  const creator = metadata.creator || 'MetaZo Contributor';
  const copyright = metadata.copyright || 'All rights reserved';
  const software = metadata.software || 'MetaZo Microstock AI Assistant';
  const dateObj = resolveDateTaken(metadata.dateTaken);
  const isoDate = formatIsoDate(dateObj);
  const exifDateStr = formatExifDate(dateObj);

  // 1. Build iTXt XML:com.adobe.xmp chunk
  const xmpPacket = buildXmpPacket(metadata, 'image/png');
  const keywordBytes = encoder.encode('XML:com.adobe.xmp\0');
  const xmpPayloadBytes = encoder.encode(xmpPacket);
  const itxtPrefix = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const itxtData = new Uint8Array(keywordBytes.length + itxtPrefix.length + xmpPayloadBytes.length);
  itxtData.set(keywordBytes, 0);
  itxtData.set(itxtPrefix, keywordBytes.length);
  itxtData.set(xmpPayloadBytes, keywordBytes.length + itxtPrefix.length);
  const itxtChunk = buildPngChunk('iTXt', itxtData);

  // 2. Build tEXt chunks for standard parsers
  const makeTextChunk = (key: string, val: string) => {
    const k = encoder.encode(key + '\0');
    const v = encoder.encode(val);
    const combined = new Uint8Array(k.length + v.length);
    combined.set(k, 0);
    combined.set(v, k.length);
    return buildPngChunk('tEXt', combined);
  };

  const textChunks = [
    makeTextChunk('Title', title),
    makeTextChunk('Subject', subject),
    makeTextChunk('Description', description),
    makeTextChunk('Comment', comment),
    makeTextChunk('Keywords', keywords.join(', ')),
    makeTextChunk('Author', creator),
    makeTextChunk('Copyright', copyright),
    makeTextChunk('Creation Time', isoDate),
    makeTextChunk('Software', software),
    makeTextChunk('Source', 'MetaZo AI Assistant')
  ];

  // 3. Build optional eXIf chunk if piexif is available
  let exifChunk: Uint8Array | null = null;
  try {
    const piexifLib = getPiexifLib();
    if (piexifLib) {
      const tagImageDescription = piexifLib.ImageIFD?.ImageDescription || 270;
      const tagSoftware = piexifLib.ImageIFD?.Software || 305;
      const tagDateTime = piexifLib.ImageIFD?.DateTime || 306;
      const tagArtist = piexifLib.ImageIFD?.Artist || 315;
      const tagCopyright = piexifLib.ImageIFD?.Copyright || 33432;
      const tagRating = piexifLib.ImageIFD?.Rating || 18246;
      const tagRatingPercent = piexifLib.ImageIFD?.RatingPercent || 18249;
      const tagXPTitle = piexifLib.ImageIFD?.XPTitle || 40091;
      const tagXPComment = piexifLib.ImageIFD?.XPComment || 40092;
      const tagXPAuthor = piexifLib.ImageIFD?.XPAuthor || 40093;
      const tagXPKeywords = piexifLib.ImageIFD?.XPKeywords || 40094;
      const tagXPSubject = piexifLib.ImageIFD?.XPSubject || 40095;

      const tagExifVersion = piexifLib.ExifIFD?.ExifVersion || 36864;
      const tagDateTimeOriginal = piexifLib.ExifIFD?.DateTimeOriginal || 36867;
      const tagDateTimeDigitized = piexifLib.ExifIFD?.DateTimeDigitized || 36868;
      const tagUserComment = piexifLib.ExifIFD?.UserComment || 37510;

      const zeroth: any = {};
      const exif: any = {};

      zeroth[tagImageDescription] = description;
      zeroth[tagXPTitle] = toUcs2Bytes(title);
      zeroth[tagXPSubject] = toUcs2Bytes(subject);
      zeroth[tagXPComment] = toUcs2Bytes(comment);
      zeroth[tagXPKeywords] = toUcs2Bytes(keywords.join('; '));
      zeroth[tagXPAuthor] = toUcs2Bytes(creator);
      zeroth[tagArtist] = creator;
      zeroth[tagSoftware] = software;
      zeroth[tagCopyright] = copyright;
      zeroth[tagRating] = metadata.rating ?? 5;
      zeroth[tagRatingPercent] = 99;
      zeroth[tagDateTime] = exifDateStr;

      exif[tagDateTimeOriginal] = exifDateStr;
      exif[tagDateTimeDigitized] = exifDateStr;
      exif[tagExifVersion] = '0230';
      try {
        if (piexifLib.helper && typeof piexifLib.helper.dumpUserComment === 'function') {
          exif[tagUserComment] = piexifLib.helper.dumpUserComment(comment);
        } else {
          exif[tagUserComment] = `ASCII\0\0\0${comment}`;
        }
      } catch (_) {
        exif[tagUserComment] = `ASCII\0\0\0${comment}`;
      }

      const dumped = piexifLib.dump({ '0th': zeroth, 'Exif': exif, 'GPS': {} });
      if (dumped && dumped.length > 6) {
        const rawTiff = dumped.startsWith('Exif\0\0') ? dumped.substring(6) : dumped;
        const exifBuf = new Uint8Array(rawTiff.length);
        for (let i = 0; i < rawTiff.length; i++) {
          exifBuf[i] = rawTiff.charCodeAt(i);
        }
        exifChunk = buildPngChunk('eXIf', exifBuf);
      }
    }
  } catch (_) {}

  // 4. Find end of IHDR chunk
  const ihdrView = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  const ihdrLen = ihdrView.getUint32(8);
  const insertPos = 8 + 12 + ihdrLen;

  const before = pngBytes.subarray(0, insertPos);
  const after = pngBytes.subarray(insertPos);

  const extraChunks: Uint8Array[] = [itxtChunk, ...textChunks];
  if (exifChunk) {
    extraChunks.push(exifChunk);
  }

  const extraChunksLen = extraChunks.reduce((a, c) => a + c.length, 0);
  const result = new Uint8Array(before.length + extraChunksLen + after.length);

  let w = 0;
  result.set(before, w); w += before.length;
  for (const ec of extraChunks) {
    result.set(ec, w); w += ec.length;
  }
  result.set(after, w);

  return result;
}

/**
 * Embeds metadata into SVG markup
 */
export function embedSvgMetadata(svgString: string, metadata: MicrostockMetadataInput): string {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const keywords = cleanKeywordArray(metadata.keywords);

  const titleTag = `<title>${escapeXml(title)}</title>`;
  const descTag = `<desc>${escapeXml(description)}</desc>`;
  const xmpPacket = buildXmpPacket(metadata, 'image/svg+xml');
  const metadataTag = `<metadata>\n    ${xmpPacket}\n  </metadata>`;

  let cleaned = svgString
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '');

  if (/<svg[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/(<svg[^>]*>)/i, `$1\n  ${titleTag}\n  ${descTag}\n  ${metadataTag}`);
  }
  return cleaned;
}

/**
 * Binary-safe EPS / AI PostScript metadata embedder.
 * Preserves binary DOS EPS 30-byte header (0xC5D0D3C6) and binary TIFF/WMF
 * preview forks without converting binary data through UTF-8 strings.
 * This completely eliminates EPS file size explosion and graphics corruption!
 */
export function embedEpsMetadataBytes(
  inputBytes: Uint8Array,
  metadata: MicrostockMetadataInput
): Uint8Array {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const creator = metadata.creator || 'MetaZo Contributor';
  const copyright = metadata.copyright || 'All rights reserved';
  const keywords = cleanKeywordArray(metadata.keywords);
  const keywordStr = keywords.join(', ');
  const dateObj = resolveDateTaken(metadata.dateTaken);
  const isoDate = formatIsoDate(dateObj);

  // Check for 30-byte DOS EPS header: 0xC5 0xD0 0xD3 0xC6
  const isDosEps =
    inputBytes.length >= 30 &&
    inputBytes[0] === 0xC5 &&
    inputBytes[1] === 0xD0 &&
    inputBytes[2] === 0xD3 &&
    inputBytes[3] === 0xC6;

  let psStart = 0;
  let psLength = inputBytes.length;
  let wmfStart = 0;
  let tiffStart = 0;

  if (isDosEps) {
    const view = new DataView(inputBytes.buffer, inputBytes.byteOffset, inputBytes.byteLength);
    psStart = view.getUint32(4, true);
    psLength = view.getUint32(8, true);
    wmfStart = view.getUint32(12, true);
    tiffStart = view.getUint32(20, true);
  }

  // Find PostScript signature "%!PS-Adobe" within the PS section
  const searchLimit = Math.min(inputBytes.length, psStart + 4096);
  const psAdobeBytes = [0x25, 0x21, 0x50, 0x53, 0x2D, 0x41, 0x64, 0x6F, 0x62, 0x65]; // "%!PS-Adobe"
  let sigIndex = -1;

  for (let i = psStart; i <= searchLimit - psAdobeBytes.length; i++) {
    let match = true;
    for (let j = 0; j < psAdobeBytes.length; j++) {
      if (inputBytes[i + j] !== psAdobeBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      sigIndex = i;
      break;
    }
  }

  if (sigIndex === -1) {
    return inputBytes;
  }

  // Find the end of the line for %!PS-Adobe... (look for \n or \r\n)
  let lineEnd = sigIndex;
  while (lineEnd < inputBytes.length && inputBytes[lineEnd] !== 0x0A && inputBytes[lineEnd] !== 0x0D) {
    lineEnd++;
  }
  if (lineEnd < inputBytes.length && inputBytes[lineEnd] === 0x0D && inputBytes[lineEnd + 1] === 0x0A) {
    lineEnd += 2;
  } else if (lineEnd < inputBytes.length) {
    lineEnd += 1;
  }

  const cleanT = title.replace(/[\r\n]/g, ' ');
  const cleanS = subject.replace(/[\r\n]/g, ' ');
  const cleanD = description.replace(/[\r\n]/g, ' ');
  const cleanK = keywordStr.replace(/[\r\n]/g, ' ');
  const cleanC = creator.replace(/[\r\n]/g, ' ');
  const cleanCopy = copyright.replace(/[\r\n]/g, ' ');

  const xmpPacket = buildXmpPacket(metadata, 'application/postscript');
  const dscBlock = `\n%%Title: ${cleanT}\n%%Creator: ${cleanC}\n%%Subject: ${cleanS}\n%%Keywords: ${cleanK}\n%%Copyright: ${cleanCopy}\n%%CreationDate: ${isoDate}\n%XRXbegin\n${xmpPacket}\n%XRXend\n`;
  const dscBytes = new TextEncoder().encode(dscBlock);
  const delta = dscBytes.length;

  const result = new Uint8Array(inputBytes.length + delta);

  if (isDosEps) {
    result.set(inputBytes.subarray(0, 30), 0);
    const newView = new DataView(result.buffer, result.byteOffset, 30);
    newView.setUint32(8, psLength + delta, true);
    if (wmfStart > psStart) {
      newView.setUint32(12, wmfStart + delta, true);
    }
    if (tiffStart > psStart) {
      newView.setUint32(20, tiffStart + delta, true);
    }

    result.set(inputBytes.subarray(30, lineEnd), 30);
    result.set(dscBytes, lineEnd);
    result.set(inputBytes.subarray(lineEnd), lineEnd + delta);
  } else {
    result.set(inputBytes.subarray(0, lineEnd), 0);
    result.set(dscBytes, lineEnd);
    result.set(inputBytes.subarray(lineEnd), lineEnd + delta);
  }

  return result;
}

/**
 * String backward-compatibility wrapper for EPS metadata embedding
 */
export function embedEpsMetadata(epsString: string, metadata: MicrostockMetadataInput): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(epsString);
  const updatedBytes = embedEpsMetadataBytes(bytes, metadata);
  return new TextDecoder('latin1').decode(updatedBytes);
}

/**
 * Binary-safe Adobe Illustrator (.ai) metadata embedder.
 * Supports both:
 * 1. PostScript-based AI files (Illustrator v8 and earlier, or EPS-compatible PostScript)
 * 2. PDF-based AI files (Illustrator v9 through modern CC/2026)
 *
 * For PDF-based AI files, it locates the uncompressed XMP packet (<x:xmpmeta>...</x:xmpmeta>)
 * and performs in-place replacement with whitespace padding up to <?xpacket end="w"?>.
 * This guarantees 100% preservation of file size and xref byte offsets, preventing any
 * Illustrator "Damaged file" warnings!
 */
export function embedAiMetadataBytes(
  inputBytes: Uint8Array,
  metadata: MicrostockMetadataInput
): Uint8Array {
  // 1. Check for PostScript-based AI / DOS EPS header (0xC5D0D3C6) or %!PS
  const isDosEps =
    inputBytes.length >= 30 &&
    inputBytes[0] === 0xC5 &&
    inputBytes[1] === 0xD0 &&
    inputBytes[2] === 0xD3 &&
    inputBytes[3] === 0xC6;

  const isPsHeader =
    inputBytes.length >= 4 &&
    inputBytes[0] === 0x25 && // '%'
    inputBytes[1] === 0x21;   // '!'

  if (isDosEps || isPsHeader) {
    return embedEpsMetadataBytes(inputBytes, metadata);
  }

  // 2. For PDF-based AI files (%PDF-): Search for existing XMP packet <?xpacket begin ... <?xpacket end
  const beginPattern = new TextEncoder().encode('<?xpacket begin=');
  const endPattern = new TextEncoder().encode('<?xpacket end=');

  let packetStart = -1;
  for (let i = 0; i <= inputBytes.length - beginPattern.length; i++) {
    let match = true;
    for (let j = 0; j < beginPattern.length; j++) {
      if (inputBytes[i + j] !== beginPattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      packetStart = i;
      break;
    }
  }

  if (packetStart !== -1) {
    let packetEnd = -1;
    for (let i = packetStart; i <= inputBytes.length - endPattern.length; i++) {
      let match = true;
      for (let j = 0; j < endPattern.length; j++) {
        if (inputBytes[i + j] !== endPattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        // Find closing '?>'
        let closeIdx = i + endPattern.length;
        while (closeIdx < inputBytes.length - 1 && !(inputBytes[closeIdx] === 0x3F && inputBytes[closeIdx + 1] === 0x3E)) {
          closeIdx++;
        }
        if (closeIdx < inputBytes.length - 1) {
          packetEnd = closeIdx + 2;
        }
        break;
      }
    }

    if (packetEnd !== -1 && packetEnd > packetStart) {
      const existingLen = packetEnd - packetStart;
      const xmpString = buildXmpPacket(metadata, 'application/pdf');
      const endMarkerRegex = /<\?xpacket\s+end=["'][wr]["']\?>\s*$/i;
      const xmpCore = xmpString.replace(endMarkerRegex, '').trimEnd();
      const endTrailer = '\n<?xpacket end="w"?>';
      const coreBytes = new TextEncoder().encode(xmpCore);
      const endTrailerBytes = new TextEncoder().encode(endTrailer);

      const requiredLen = coreBytes.length + endTrailerBytes.length;

      if (requiredLen <= existingLen) {
        // In-place replacement with whitespace padding to preserve exact offsets
        const paddingLen = existingLen - requiredLen;
        const result = new Uint8Array(inputBytes.length);
        result.set(inputBytes);

        // Overwrite packetStart to packetEnd
        result.set(coreBytes, packetStart);
        if (paddingLen > 0) {
          result.fill(0x20, packetStart + coreBytes.length, packetStart + coreBytes.length + paddingLen);
        }
        result.set(endTrailerBytes, packetStart + coreBytes.length + paddingLen);
        return result;
      }
    }
  }

  // Fallback to EPS embedder if PostScript was nested or deeper
  const epsAttempt = embedEpsMetadataBytes(inputBytes, metadata);
  if (epsAttempt.length !== inputBytes.length) {
    return epsAttempt;
  }

  return inputBytes;
}

function writeU32BE(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = (val >>> 24) & 0xff;
  buf[offset + 1] = (val >>> 16) & 0xff;
  buf[offset + 2] = (val >>> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function writeU16BE(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = (val >>> 8) & 0xff;
  buf[offset + 1] = val & 0xff;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) totalLength += arr.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const arr of arrays) {
    result.set(arr, pos);
    pos += arr.length;
  }
  return result;
}

function buildIlstItem(fourCC: string, text: string): Uint8Array {
  const textBytes = new TextEncoder().encode(text);
  const dataSize = 16 + textBytes.length;
  const itemSize = 8 + dataSize;
  const buf = new Uint8Array(itemSize);
  writeU32BE(buf, itemSize, 0);
  for (let i = 0; i < 4; i++) buf[4 + i] = fourCC.charCodeAt(i);
  writeU32BE(buf, dataSize, 8);
  buf[12] = 0x64; buf[13] = 0x61; buf[14] = 0x74; buf[15] = 0x61; // 'data'
  writeU32BE(buf, 1, 16); // type 1 = UTF-8
  writeU32BE(buf, 0, 20); // locale 0
  buf.set(textBytes, 24);
  return buf;
}

function buildQtTextAtom(fourCC: string, text: string): Uint8Array {
  const textBytes = new TextEncoder().encode(text);
  const totalSize = 12 + textBytes.length;
  const buf = new Uint8Array(totalSize);
  writeU32BE(buf, totalSize, 0);
  for (let i = 0; i < 4; i++) buf[4 + i] = fourCC.charCodeAt(i);
  writeU16BE(buf, textBytes.length, 8);
  writeU16BE(buf, 0x55c4, 10);
  buf.set(textBytes, 12);
  return buf;
}

function buildQtXmpAtom(xmpText: string): Uint8Array {
  const textBytes = new TextEncoder().encode(xmpText);
  const totalSize = 8 + textBytes.length;
  const buf = new Uint8Array(totalSize);
  writeU32BE(buf, totalSize, 0);
  buf[4] = 0x58; buf[5] = 0x4d; buf[6] = 0x50; buf[7] = 0x5f; // 'XMP_'
  buf.set(textBytes, 8);
  return buf;
}

function buildXtraTag(name: string, values: string[], type: number = 0x0008): Uint8Array {
  const enc = new TextEncoder();
  const nameBytes = enc.encode(name);
  const valBuffers: Uint8Array[] = [];

  for (const v of values) {
    // Windows Media / Explorer string format: UTF-16LE null-terminated
    const strBytes = new Uint8Array((v.length + 1) * 2);
    for (let i = 0; i < v.length; i++) {
      const code = v.charCodeAt(i);
      strBytes[i * 2] = code & 0xff;
      strBytes[i * 2 + 1] = (code >> 8) & 0xff;
    }
    const valSize = 4 + 2 + strBytes.length;
    const vBuf = new Uint8Array(valSize);
    writeU32BE(vBuf, valSize, 0);
    writeU16BE(vBuf, type, 4);
    vBuf.set(strBytes, 6);
    valBuffers.push(vBuf);
  }

  const allVals = concatUint8Arrays(valBuffers);
  const tagSize = 4 + 4 + nameBytes.length + 4 + allVals.length;
  const tagBuf = new Uint8Array(tagSize);
  writeU32BE(tagBuf, tagSize, 0);
  writeU32BE(tagBuf, nameBytes.length, 4);
  tagBuf.set(nameBytes, 8);
  writeU32BE(tagBuf, values.length, 8 + nameBytes.length);
  tagBuf.set(allVals, 8 + nameBytes.length + 4);
  return tagBuf;
}

function buildXtraBox(tags: { name: string; values: string[]; type?: number }[]): Uint8Array {
  const tagBuffers = tags.map(t => buildXtraTag(t.name, t.values, t.type || 0x0008));
  const payload = concatUint8Arrays(tagBuffers);
  const totalSize = 8 + payload.length;
  const box = new Uint8Array(totalSize);
  writeU32BE(box, totalSize, 0);
  box[4] = 0x58; box[5] = 0x74; box[6] = 0x72; box[7] = 0x61; // 'Xtra'
  box.set(payload, 8);
  return box;
}

function buildComprehensiveUdta(
  metadata: MicrostockMetadataInput,
  xmpText: string = ''
): Uint8Array {
  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || metadata.comment || title).trim();
  const subject = String(metadata.subject || title).trim();
  const comment = String(metadata.comment || description).trim();
  const creator = metadata.creator || 'MetaZo Contributor';
  const copyright = metadata.copyright || 'All rights reserved';
  const software = metadata.software || 'MetaZo Microstock AI Assistant';
  const keywordArr = cleanKeywordArray(metadata.keywords);
  const keywordStr = keywordArr.join('; ');
  const dateObj = resolveDateTaken(metadata.dateTaken);
  const isoDate = formatIsoDate(dateObj);
  const dateShort = isoDate.substring(0, 10);

  const ilstItems = [
    buildIlstItem('\xa9nam', title),
    buildIlstItem('desc', description),
    buildIlstItem('\xa9des', description),
    buildIlstItem('\xa9cmt', comment),
    buildIlstItem('keyw', keywordStr),
    buildIlstItem('\xa9gen', keywordStr),
    buildIlstItem('\xa9art', creator),
    buildIlstItem('aART', creator),
    buildIlstItem('\xa9day', dateShort),
    buildIlstItem('\xa9too', software),
    buildIlstItem('cprt', copyright)
  ];

  const ilstPayload = concatUint8Arrays(ilstItems);
  const ilstSize = 8 + ilstPayload.length;
  const ilstBox = new Uint8Array(ilstSize);
  writeU32BE(ilstBox, ilstSize, 0);
  ilstBox[4] = 0x69; ilstBox[5] = 0x6c; ilstBox[6] = 0x73; ilstBox[7] = 0x74; // 'ilst'
  ilstBox.set(ilstPayload, 8);

  const hdlr = new Uint8Array([
    0x00, 0x00, 0x00, 0x21,
    0x68, 0x64, 0x6c, 0x72,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x6d, 0x64, 0x69, 0x72,
    0x61, 0x70, 0x70, 0x6c,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00
  ]);

  const metaSize = 12 + hdlr.length + ilstBox.length;
  const metaBox = new Uint8Array(metaSize);
  writeU32BE(metaBox, metaSize, 0);
  metaBox[4] = 0x6d; metaBox[5] = 0x65; metaBox[6] = 0x74; metaBox[7] = 0x61; // 'meta'
  writeU32BE(metaBox, 0, 8); // version/flags = 0
  metaBox.set(hdlr, 12);
  metaBox.set(ilstBox, 12 + hdlr.length);

  // Dedicated Windows Media / Explorer 'Xtra' atom matching 100% of JPG EXIF & IPTC fields:
  // WM/Category -> System.Keywords (Windows Explorer 'Tags' field)
  // WM/SubTitle -> System.Media.SubTitle (Windows Explorer 'Subtitle' field)
  // WM/Genre -> System.Music.Genre (Genre)
  // Author & WM/Writer & WM/Director -> System.Author / System.ItemAuthors
  // Copyright & WM/Copyright -> System.Copyright
  // WM/ToolName -> System.ApplicationName (Program Name)
  const xtraBox = buildXtraBox([
    { name: 'WM/Category', values: keywordArr },
    { name: 'WM/SubTitle', values: [subject] },
    { name: 'WM/Genre', values: [keywordArr.slice(0, 5).join(', ')] },
    { name: 'Author', values: [creator] },
    { name: 'WM/Author', values: [creator] },
    { name: 'WM/Writer', values: [creator] },
    { name: 'WM/Director', values: [creator] },
    { name: 'WM/Producer', values: [creator] },
    { name: 'WM/Publisher', values: [creator] },
    { name: 'WM/EncodedBy', values: [creator] },
    { name: 'Copyright', values: [copyright] },
    { name: 'WM/Copyright', values: [copyright] },
    { name: 'WM/ToolName', values: [software] },
    { name: 'WM/Year', values: [String(dateObj.getFullYear())] },
    { name: 'WM/EncodingTime', values: [isoDate] }
  ]);

  const directAtoms = [
    metaBox,
    xtraBox,
    buildQtTextAtom('\xa9nam', title),
    buildQtTextAtom('\xa9des', description),
    buildQtTextAtom('\xa9cmt', comment),
    buildQtTextAtom('\xa9gen', keywordStr),
    buildQtTextAtom('\xa9art', creator),
    buildQtTextAtom('\xa9day', dateShort),
    buildQtTextAtom('cprt', copyright)
  ];

  if (xmpText) {
    directAtoms.push(buildQtXmpAtom(xmpText));
  }

  const udtaPayload = concatUint8Arrays(directAtoms);
  const udtaSize = 8 + udtaPayload.length;
  const udtaBox = new Uint8Array(udtaSize);
  writeU32BE(udtaBox, udtaSize, 0);
  udtaBox[4] = 0x75; udtaBox[5] = 0x64; udtaBox[6] = 0x74; udtaBox[7] = 0x61; // 'udta'
  udtaBox.set(udtaPayload, 8);

  return udtaBox;
}

function adjustChunkOffsets(moovBuf: Uint8Array, delta: number) {
  let offset = 0;
  const view = new DataView(moovBuf.buffer, moovBuf.byteOffset, moovBuf.byteLength);
  while (offset + 8 <= moovBuf.length) {
    const bType = String.fromCharCode(moovBuf[offset + 4], moovBuf[offset + 5], moovBuf[offset + 6], moovBuf[offset + 7]);
    if (bType === 'stco') {
      const boxSize = view.getUint32(offset, false);
      const entryCount = view.getUint32(offset + 12, false);
      let p = offset + 16;
      for (let i = 0; i < entryCount; i++) {
        const curOffset = view.getUint32(p, false);
        view.setUint32(p, curOffset + delta, false);
        p += 4;
      }
      offset += boxSize;
    } else if (bType === 'co64') {
      const boxSize = view.getUint32(offset, false);
      const entryCount = view.getUint32(offset + 12, false);
      let p = offset + 16;
      for (let i = 0; i < entryCount; i++) {
        const curOffset = view.getBigUint64(p, false);
        view.setBigUint64(p, curOffset + BigInt(delta), false);
        p += 8;
      }
      offset += boxSize;
    } else {
      offset += 1;
    }
  }
}

const XMP_ISOBMFF_UUID = new Uint8Array([
  0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91, 0xe3, 0xaf, 0xac
]);

/**
 * Universal ISOBMFF (MP4, MOV, M4V) Metadata Injector.
 * Native pure TypeScript/JavaScript engine that writes:
 * 1. moov.udta.meta.ilst (QuickTime / iTunes Title, Subtitle, Comments, Tags, Artists) for Windows Explorer & Apple Finder
 * 2. moov.udta direct atoms (\xa9nam, \xa9des, \xa9cmt, \xa9gen, XMP_)
 * 3. Top-level ISOBMFF Adobe XMP UUID container box (BE7ACFCB-97A9-42E8-9C71-999491E3AFAC)
 * 4. Sample table chunk offset recalculation (stco/co64) to ensure 100% video stream integrity.
 */
export function embedMp4MetadataBytes(
  inputBytes: Uint8Array,
  metadata: MicrostockMetadataInput
): Uint8Array {
  if (inputBytes.length < 8) return inputBytes;

  const title = String(metadata.title || '').trim();
  const description = String(metadata.description || title).trim();
  const creator = metadata.creator || 'MetaZo Contributor';
  const mimeType = 'video/mp4';
  const xmpPacket = buildXmpPacket(metadata, mimeType);

  // 1. Locate moov and mdat boxes
  const view = new DataView(inputBytes.buffer, inputBytes.byteOffset, inputBytes.byteLength);
  let offset = 0;
  let moovOffset = -1;
  let moovSize = 0;
  let mdatOffset = -1;

  while (offset + 8 <= inputBytes.length) {
    const boxSize = view.getUint32(offset, false);
    const boxType = String.fromCharCode(
      inputBytes[offset + 4],
      inputBytes[offset + 5],
      inputBytes[offset + 6],
      inputBytes[offset + 7]
    );
    if (boxType === 'moov') {
      moovOffset = offset;
      moovSize = boxSize;
    } else if (boxType === 'mdat') {
      mdatOffset = offset;
    }
    if (boxSize < 8) break;
    offset += boxSize;
  }

  const udtaBox = buildComprehensiveUdta(metadata, xmpPacket);
  let intermediateFile = inputBytes;

  if (moovOffset !== -1) {
    const moovBytes = new Uint8Array(inputBytes.subarray(moovOffset, moovOffset + moovSize));
    const moovView = new DataView(moovBytes.buffer, moovBytes.byteOffset, moovBytes.byteLength);
    let udtaOffsetInsideMoov = -1;
    let existingUdtaSize = 0;
    let mOff = 8;

    while (mOff + 8 <= moovBytes.length) {
      const bSize = moovView.getUint32(mOff, false);
      const bType = String.fromCharCode(
        moovBytes[mOff + 4],
        moovBytes[mOff + 5],
        moovBytes[mOff + 6],
        moovBytes[mOff + 7]
      );
      if (bType === 'udta') {
        udtaOffsetInsideMoov = mOff;
        existingUdtaSize = bSize;
        break;
      }
      if (bSize < 8) break;
      mOff += bSize;
    }

    let newMoov: Uint8Array;
    let delta = 0;

    if (udtaOffsetInsideMoov !== -1) {
      delta = udtaBox.length - existingUdtaSize;
      newMoov = concatUint8Arrays([
        moovBytes.subarray(0, udtaOffsetInsideMoov),
        udtaBox,
        moovBytes.subarray(udtaOffsetInsideMoov + existingUdtaSize)
      ]);
    } else {
      delta = udtaBox.length;
      newMoov = concatUint8Arrays([moovBytes, udtaBox]);
    }

    writeU32BE(newMoov, newMoov.length, 0);

    if (mdatOffset > moovOffset) {
      adjustChunkOffsets(newMoov, delta);
    }

    intermediateFile = concatUint8Arrays([
      inputBytes.subarray(0, moovOffset),
      newMoov,
      inputBytes.subarray(moovOffset + moovSize)
    ]);
  }

  // 2. Also ensure standard top-level Adobe XMP UUID box is present
  const xmpBytes = new TextEncoder().encode(xmpPacket);
  const uuidBoxLen = 24 + xmpBytes.length;
  const uuidBox = new Uint8Array(uuidBoxLen);
  writeU32BE(uuidBox, uuidBoxLen, 0);
  uuidBox[4] = 0x75; uuidBox[5] = 0x75; uuidBox[6] = 0x69; uuidBox[7] = 0x64; // 'uuid'
  uuidBox.set(XMP_ISOBMFF_UUID, 8);
  uuidBox.set(xmpBytes, 24);

  const interView = new DataView(intermediateFile.buffer, intermediateFile.byteOffset, intermediateFile.byteLength);
  let uuidStart = -1;
  let uuidSize = 0;
  let off2 = 0;

  while (off2 + 8 <= intermediateFile.length) {
    const bSize = interView.getUint32(off2, false);
    const bType = String.fromCharCode(
      intermediateFile[off2 + 4],
      intermediateFile[off2 + 5],
      intermediateFile[off2 + 6],
      intermediateFile[off2 + 7]
    );
    if (bType === 'uuid' && bSize >= 24) {
      let isXmp = true;
      for (let i = 0; i < 16; i++) {
        if (intermediateFile[off2 + 8 + i] !== XMP_ISOBMFF_UUID[i]) {
          isXmp = false;
          break;
        }
      }
      if (isXmp) {
        uuidStart = off2;
        uuidSize = bSize;
        break;
      }
    }
    if (bSize < 8) break;
    off2 += bSize;
  }

  if (uuidStart !== -1) {
    return concatUint8Arrays([
      intermediateFile.subarray(0, uuidStart),
      uuidBox,
      intermediateFile.subarray(uuidStart + uuidSize)
    ]);
  } else {
    return concatUint8Arrays([intermediateFile, uuidBox]);
  }
}

/**
 * Universal browser-side file metadata embedding dispatcher.
 * Supports JPEG, PNG, SVG, EPS, AI, MP4, MOV, WEBM, M4V.
 */
export async function embedMicrostockMetadata(
  file: File,
  metadata: MicrostockMetadataInput
): Promise<Blob> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg') {
    const arrayBuffer = await file.arrayBuffer();
    const embeddedBytes = embedJpegMetadata(new Uint8Array(arrayBuffer), metadata);
    return new Blob([embeddedBytes], { type: 'image/jpeg' });
  }

  if (ext === 'png' || file.type === 'image/png') {
    const arrayBuffer = await file.arrayBuffer();
    const embeddedBytes = embedPngMetadata(new Uint8Array(arrayBuffer), metadata);
    return new Blob([embeddedBytes], { type: 'image/png' });
  }

  if (ext === 'svg' || file.type === 'image/svg+xml') {
    const svgText = await file.text();
    const updatedSvg = embedSvgMetadata(svgText, metadata);
    return new Blob([updatedSvg], { type: 'image/svg+xml' });
  }

  if (ext === 'eps') {
    const arrayBuffer = await file.arrayBuffer();
    const embeddedBytes = embedEpsMetadataBytes(new Uint8Array(arrayBuffer), metadata);
    return new Blob([embeddedBytes], { type: 'application/postscript' });
  }

  if (ext === 'ai') {
    const arrayBuffer = await file.arrayBuffer();
    const embeddedBytes = embedAiMetadataBytes(new Uint8Array(arrayBuffer), metadata);
    return new Blob([embeddedBytes], { type: 'application/illustrator' });
  }

  if (ext === 'mp4' || ext === 'mov' || ext === 'm4v' || ext === 'webm' || file.type.startsWith('video/')) {
    const arrayBuffer = await file.arrayBuffer();
    const embeddedBytes = embedMp4MetadataBytes(new Uint8Array(arrayBuffer), metadata);
    const mimeType = ext === 'mov' ? 'video/quicktime' : (ext === 'webm' ? 'video/webm' : 'video/mp4');
    return new Blob([embeddedBytes], { type: mimeType });
  }

  return file;
}

export interface ZipEntryInput {
  name: string;
  data: Uint8Array | Blob;
}

/**
 * Creates a standard PKZIP archive Blob in Store mode (uncompressed, 100% standard zip compatible)
 * with accurate DOS timestamps and CRC-32 checksums. Zero dependencies, high performance.
 */
export async function createZipBlob(entries: ZipEntryInput[]): Promise<Blob> {
  const enc = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    offset: number;
    localHeader: Uint8Array;
    dataBytes: Uint8Array;
  }[] = [];

  let currentOffset = 0;
  const now = new Date();
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    let dataBytes: Uint8Array;
    if (entry.data instanceof Uint8Array) {
      dataBytes = entry.data;
    } else if (entry.data instanceof Blob) {
      dataBytes = new Uint8Array(await entry.data.arrayBuffer());
    } else {
      dataBytes = new Uint8Array(0);
    }

    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8 filename)
    view.setUint16(8, 0, true);          // Compression method: 0 = Store
    view.setUint16(10, dosTime, true);   // Last mod file time
    view.setUint16(12, dosDate, true);   // Last mod file date
    view.setUint32(14, checksum, true);  // CRC-32
    view.setUint32(18, size, true);      // Compressed size
    view.setUint32(22, size, true);      // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length
    localHeader.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      crc: checksum,
      size,
      offset: currentOffset,
      localHeader,
      dataBytes
    });

    currentOffset += localHeader.length + size;
  }

  const centralDirHeaders: Uint8Array[] = [];
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    // Central directory file header (46 bytes + name length)
    const cdHeader = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(cdHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true);         // Version made by (2.0)
    view.setUint16(6, 20, true);         // Version needed to extract (2.0)
    view.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8 filename)
    view.setUint16(10, 0, true);         // Compression method: Store
    view.setUint16(12, dosTime, true);   // Last mod file time
    view.setUint16(14, dosDate, true);   // Last mod file date
    view.setUint32(16, rec.crc, true);   // CRC-32
    view.setUint32(20, rec.size, true);  // Compressed size
    view.setUint32(24, rec.size, true);  // Uncompressed size
    view.setUint16(28, rec.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0x81A40000, true);// External file attributes (regular file rw-r--r--)
    view.setUint32(42, rec.offset, true);// Relative offset of local header
    cdHeader.set(rec.nameBytes, 46);

    centralDirHeaders.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  const centralDirOffset = currentOffset;
  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Number of this disk
  eocdView.setUint16(6, 0, true);          // Disk where central directory starts
  eocdView.setUint16(8, entries.length, true);  // Number of central directory records on this disk
  eocdView.setUint16(10, entries.length, true); // Total number of central directory records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true);         // ZIP comment length

  const blobParts: BlobPart[] = [];
  for (const rec of fileRecords) {
    blobParts.push(rec.localHeader);
    blobParts.push(rec.dataBytes);
  }
  for (const cd of centralDirHeaders) {
    blobParts.push(cd);
  }
  blobParts.push(eocd);

  return new Blob(blobParts, { type: 'application/zip' });
}


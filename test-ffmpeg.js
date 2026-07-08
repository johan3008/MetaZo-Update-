import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const f = req('fluent-ffmpeg');
console.log(typeof f, Object.keys(f));

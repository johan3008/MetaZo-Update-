const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Replace frame extraction logic
server = server.replace(
    /const numFrames = 12;\s*const timestamps = \[\];\s*const segmentDuration = Math\.max\(0\.1, duration \/ numFrames\);\s*for \(let i = 0; i < numFrames; i\+\+\) \{\s*\/\/ Generate a random timestamp within this segment\s*const segmentStart = i \* segmentDuration;\s*const randomOffset = Math\.random\(\) \* \(segmentDuration - 0\.1\);\s*timestamps\.push\(Math\.max\(0, segmentStart \+ randomOffset\)\);\s*\}/,
    `const numFrames = 3;\n                                const timestamps = [\n                                    duration * 0.1, // Awal\n                                    duration * 0.5, // Tengah\n                                    duration * 0.9  // Akhir\n                                ];`
);

fs.writeFileSync('server.ts', server);

let gemini = fs.readFileSync('server/gemini.ts', 'utf8');
gemini = gemini.replace(
    /Ini adalah 12 CUPLIKAN FRAME diam yang diambil dari berbagai bagian \(awal, tengah, hingga akhir\) dari sebuah file Video\./,
    "Ini adalah 3 CUPLIKAN FRAME diam yang diambil secara berurutan dari bagian Awal, Tengah, dan Akhir dari sebuah file Video."
);
gemini = gemini.replace(
    /Ini adalah 12 CUPLIKAN FRAME/,
    "Ini adalah 3 CUPLIKAN FRAME"
);
fs.writeFileSync('server/gemini.ts', gemini);

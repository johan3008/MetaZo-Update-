const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

if (!server.includes('exiftool-vendored')) {
    server = server.replace(
        'import path from "node:path";',
        'import path from "node:path";\nimport { exiftool } from "exiftool-vendored";'
    );
    fs.writeFileSync('server.ts', server);
    console.log('Imported exiftool successfully!');
} else {
    console.log('exiftool already imported!');
}

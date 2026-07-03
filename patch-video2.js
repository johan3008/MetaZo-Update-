import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(
    "timemarks: ['10%', '50%', '90%'],",
    "timemarks: ['10%', '50%', '90%'],\n                      fastSeek: true,"
);
fs.writeFileSync('server.ts', server);
console.log("Added fastSeek");

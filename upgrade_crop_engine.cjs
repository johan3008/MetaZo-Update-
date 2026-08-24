const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Upgrade quadrant crops to 5 forensic views (4 quadrants + 1 high-density macro center crop)
const oldCropCode = `            const quadrantSuffixes = ['tl', 'tr', 'bl', 'br'];
            const quadrantFilePaths = quadrantSuffixes.map(s => \`\${tempFilePath}_\${s}.png\`);
            let imagesToSend: string | string[] = imageBase64;
            try {
                const ffmpegPath = _require('@ffmpeg-installer/ffmpeg').path;
                const execPromise = util.promisify(exec);
                // crop=w:h:x:y — 60% width/height per quadrant, positioned so neighboring
                // quadrants overlap by exactly 20% of the frame (matches the system prompt's
                // documented "4 kuadran ber-overlap 20%" protocol), together covering 100%
                // of the image with no un-inspected region left over.
                const quadrantFilters = [
                    'crop=iw*0.6:ih*0.6:0:0',                 // top-left
                    'crop=iw*0.6:ih*0.6:iw*0.4:0',            // top-right
                    'crop=iw*0.6:ih*0.6:0:ih*0.4',            // bottom-left
                    'crop=iw*0.6:ih*0.6:iw*0.4:ih*0.4'        // bottom-right
                ];
                await Promise.all(quadrantFilters.map((filter, i) =>
                    execPromise(\`"\${ffmpegPath}" -y -i "\${tempFilePath}" -vf "\${filter}" -frames:v 1 -c:v png -pix_fmt rgba "\${quadrantFilePaths[i]}"\`)
                ));
                if (quadrantFilePaths.every(p => fs.existsSync(p))) {
                    const quadrantBase64s = quadrantFilePaths.map(p => {
                        const buf = fs.readFileSync(p);
                        return \`data:image/png;base64,\${buf.toString('base64')}\`;
                    });
                    imagesToSend = [imageBase64, ...quadrantBase64s];
                    console.log('Server check-image-quality: Successfully generated 4 native-resolution quadrant crops (top-left, top-right, bottom-left, bottom-right) via FFmpeg');
                }
            } catch (zoomErr: any) {
                console.warn('Server check-image-quality: Failed to generate quadrant crops:', zoomErr);
            }`;

const newCropCode = `            const cropSuffixes = ['tl', 'tr', 'bl', 'br', 'macro_center'];
            const cropFilePaths = cropSuffixes.map(s => \`\${tempFilePath}_\${s}.png\`);
            let imagesToSend: string | string[] = imageBase64;
            try {
                const ffmpegPath = _require('@ffmpeg-installer/ffmpeg').path;
                const execPromise = util.promisify(exec);
                const cropFilters = [
                    'crop=iw*0.6:ih*0.6:0:0',                           // top-left quadrant
                    'crop=iw*0.6:ih*0.6:iw*0.4:0',                      // top-right quadrant
                    'crop=iw*0.6:ih*0.6:0:ih*0.4',                      // bottom-left quadrant
                    'crop=iw*0.6:ih*0.6:iw*0.4:ih*0.4',                  // bottom-right quadrant
                    'crop=min(iw\\,ih)*0.45:min(iw\\,ih)*0.45:(iw-min(iw\\,ih)*0.45)/2:(ih-min(iw\\,ih)*0.45)/2' // 1:1 macro subject focus crop
                ];
                await Promise.all(cropFilters.map((filter, i) =>
                    execPromise(\`"\${ffmpegPath}" -y -i "\${tempFilePath}" -vf "\${filter}" -frames:v 1 -c:v png -pix_fmt rgba "\${cropFilePaths[i]}"\`)
                ));
                const availableCrops = cropFilePaths.filter(p => fs.existsSync(p)).map(p => {
                    const buf = fs.readFileSync(p);
                    return \`data:image/png;base64,\${buf.toString('base64')}\`;
                });
                if (availableCrops.length > 0) {
                    imagesToSend = [imageBase64, ...availableCrops];
                    console.log(\`Server check-image-quality: Successfully generated \${availableCrops.length} forensic crops (4 quadrants + 1 macro focus crop) via FFmpeg\`);
                }
            } catch (zoomErr: any) {
                console.warn('Server check-image-quality: Failed to generate forensic crops:', zoomErr);
            }`;

if (server.includes(oldCropCode)) {
    server = server.replace(oldCropCode, newCropCode);
    
    // Also update cleanup in finally block
    server = server.replace(
        "for (const suffix of ['tl', 'tr', 'bl', 'br']) {",
        "for (const suffix of ['tl', 'tr', 'bl', 'br', 'macro_center']) {"
    );
    
    fs.writeFileSync('server.ts', server);
    console.log("Upgraded forensic crop engine in server.ts successfully!");
} else {
    console.log("Could not find oldCropCode in server.ts");
}

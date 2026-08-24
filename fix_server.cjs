const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Find the start of Step 2
const startIndex = server.indexOf('            // Step 2:');
const endIndex = server.indexOf('            // Step 4:');

if (startIndex !== -1 && endIndex !== -1) {
    const newBlock = `            // Step 2: Use provided metadata from client! (Do NOT regenerate using AI)
            let title = req.body.title || '';
            let description = req.body.description || '';
            let keywords = [];
            try {
                if (req.body.keywords) keywords = JSON.parse(req.body.keywords);
            } catch (e) {
                console.error("[Embed Metadata] Failed to parse keywords:", e);
            }
            console.log(\`[Embed Metadata] Embedding provided metadata: Title="\${title}", \${keywords.length} keywords\`);

            // Step 3: Write metadata into file using exiftool-vendored
            localOutputPath = localInputPath + '_embedded' + path.extname(originalName);
            fs.copyFileSync(localInputPath, localOutputPath);

            try {
                const tagsToUpdate = {};
                if (title && title.trim()) {
                    tagsToUpdate.Title = title.trim();
                    tagsToUpdate.ObjectName = title.trim();
                    tagsToUpdate.ImageDescription = title.trim();
                }
                if (description && description.trim()) {
                    tagsToUpdate.Description = description.trim();
                    tagsToUpdate.CaptionAbstract = description.trim();
                }
                if (keywords && keywords.length > 0) {
                    tagsToUpdate.Keywords = keywords;
                    tagsToUpdate.Subject = keywords;
                }
                
                console.log(\`[Embed Metadata] Writing EXIF/IPTC with ExifTool...\`);
                await exiftool.write(localOutputPath, tagsToUpdate, ['-overwrite_original']);
            } catch (exifErr) {
                console.error("[Embed Metadata] ExifTool error:", exifErr);
            }\n\n`;
            
    server = server.substring(0, startIndex) + newBlock + server.substring(endIndex);
    fs.writeFileSync('server.ts', server);
    console.log('Fixed syntax and patched Step 2 and Step 3 successfully!');
} else {
    console.log('Could not find Step 2 or Step 4');
}

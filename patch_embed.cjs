const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

if (!server.includes('exiftool-vendored')) {
    server = server.replace(
        'import path from "node:path";',
        'import path from "node:path";\nimport { exiftool } from "exiftool-vendored";'
    );
}

const oldMagickCode =             // Step 3: ExifTool / ImageMagick - write metadata into file
            const keywordStr = Array.isArray(keywords) ? keywords.join('; ') : String(keywords || '');
            localOutputPath = localInputPath + '_embedded' + path.extname(originalName);

            const magickArgs = [localInputPath];
            if (title && title.trim()) {
                magickArgs.push('-set', 'iptc:2:5', title.trim());
                magickArgs.push('-set', 'exif:ImageDescription', title.trim());
                magickArgs.push('-set', 'xmp:Title', title.trim());
            }
            if (description && description.trim()) {
                magickArgs.push('-set', 'iptc:2:120', description.trim());
                magickArgs.push('-set', 'xmp:Description', description.trim());
            }
            if (keywordStr) {
                magickArgs.push('-set', 'iptc:2:25', keywordStr);
                magickArgs.push('-set', 'xmp:Keywords', keywordStr);
            }
            magickArgs.push(localOutputPath);

            console.log(\[Embed Metadata] Writing IPTC/EXIF/XMP with ImageMagick...\);
            await spawnAsync('magick', magickArgs, { timeout: 30000 });;

const newExiftoolCode =             // Step 3: Write metadata into file using exiftool-vendored
            localOutputPath = localInputPath + '_embedded' + path.extname(originalName);
            fs.copyFileSync(localInputPath, localOutputPath);

            try {
                const tagsToUpdate: any = {};
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
                
                console.log(\[Embed Metadata] Writing EXIF/IPTC with ExifTool...\);
                await exiftool.write(localOutputPath, tagsToUpdate, ['-overwrite_original']);
            } catch (exifErr) {
                console.error("[Embed Metadata] ExifTool error:", exifErr);
            };

server = server.replace(oldMagickCode, newExiftoolCode);
fs.writeFileSync('server.ts', server);
console.log('Successfully patched server.ts with ExifTool!');

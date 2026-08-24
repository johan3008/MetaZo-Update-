const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Replace the AI generation logic inside /api/embed-metadata
const oldCode =             // Step 2: AI Generate Metadata from the image
            console.log(\[Embed Metadata] Generating AI metadata for: \\);
            const imageBase64 = fs.readFileSync(localInputPath, { encoding: 'base64' });
            const dataUri = \data:image/jpeg;base64,\\;
            const { keywordCount = 50, model, metadataLanguage, aiModelPerformance } = req.body;
            const generatedMetadata = await generateStockMetadata(
                [dataUri],
                parseInt(String(keywordCount), 10) || 50,
                '',
                ToolType.IMAGE,
                undefined,
                model,
                undefined,
                undefined,
                metadataLanguage || 'English',
                aiModelPerformance || 'detail'
            );
            const { title = '', description = '', keywords = [] } = generatedMetadata;
            console.log(\[Embed Metadata] AI generated title, \ keywords\);;

const newCode =             // Step 2: Use provided metadata from client! (Do NOT regenerate using AI)
            let title = req.body.title || '';
            let description = req.body.description || '';
            let keywords = [];
            
            try {
                if (req.body.keywords) {
                    keywords = JSON.parse(req.body.keywords);
                }
            } catch (e) {
                console.error("[Embed Metadata] Failed to parse keywords:", e);
            }
            
            console.log(\[Embed Metadata] Embedding provided metadata: Title="\", \ keywords\);;

if (server.includes('const { keywordCount = 50, model, metadataLanguage, aiModelPerformance } = req.body;')) {
    server = server.replace(oldCode, newCode);
    fs.writeFileSync('server.ts', server);
    console.log('Successfully patched server.ts!');
} else {
    console.log('Could not find the target code in server.ts.');
}

import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import { execSync } from 'child_process';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    execSync('ffmpeg -f lavfi -i testsrc=duration=2:size=320x240:rate=10 -pix_fmt yuv420p -y test.mp4 -v quiet');
    const data = fs.readFileSync('test.txt', 'base64');
    // wait we need test.mp4
    const b64 = fs.readFileSync('test.mp4', 'base64');
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
                {
                    parts: [
                        { inlineData: { mimeType: 'video/mp4', data: b64 } },
                        { text: 'What is this video?' }
                    ]
                }
            ]
        });
        console.log(response.text);
    } catch (e) {
        console.error(e);
    }
}

run();

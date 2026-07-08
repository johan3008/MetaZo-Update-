import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    fs.writeFileSync('test.txt', 'hello world');
    const uploadResult = await ai.files.upload({ file: 'test.txt' });
    console.log("Uploaded file:", uploadResult.name, uploadResult.state);
}

run().catch(console.error);

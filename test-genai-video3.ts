import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "dummy" });
for (const key in ai.files) {
    console.log(key, typeof (ai.files as any)[key]);
}

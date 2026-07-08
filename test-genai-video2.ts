import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "dummy" });
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(ai.files)));

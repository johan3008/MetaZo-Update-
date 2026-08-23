import assert from "node:assert/strict";
import {
  ensureKeywordCount,
  validateAdobeStockKeywords
} from "../server/gemini.ts";

const facts = {
  objects: [
    { name: "rice farmer", tier: "primary" },
    { name: "rice bundle", tier: "secondary" }
  ],
  environment: ["rice field", "mountain"],
  actions: ["harvesting"],
  style: ["traditional"],
  attributes: ["golden"],
  colors: ["green"]
};

const candidates = [
  "rice",
  "farmer",
  "harvesting",
  "rice field",
  "mountain",
  "traditional farming",
  "rice harvest",
  "field",
  "agriculture",
  "rural",
  "worker",
  "crop",
  "grain",
  "rice bundle",
  "outdoors",
  "landscape",
  "golden",
  "green",
  "beautiful",
  "image",
  "photo",
  "rice farmers",
  "farmers",
  "ISO 100",
  "4K",
  "Nike",
  "123"
];

const validation = validateAdobeStockKeywords(
  candidates,
  facts,
  "Rice farmer harvesting in rice field"
);

assert.ok(validation.keywords.length <= 49);
assert.ok(!validation.keywords.includes("beautiful"));
assert.ok(!validation.keywords.includes("image"));
assert.ok(!validation.keywords.includes("photo"));
assert.ok(!validation.keywords.includes("iso 100"));
assert.ok(!validation.keywords.includes("4k"));
assert.ok(!validation.keywords.includes("nike"));
assert.ok(!validation.keywords.includes("123"));
assert.equal(
  new Set(validation.keywords.map(keyword => keyword.replace(/s$/, ""))).size,
  validation.keywords.length
);

const output = ensureKeywordCount(
  candidates,
  50,
  facts,
  "Rice farmer harvesting in rice field"
);

assert.ok(output.length <= 49);
assert.ok(output.length > 0);
assert.ok(
  output.slice(0, 10).some(keyword => keyword.includes("rice"))
);
assert.ok(
  output.slice(0, 10).some(keyword => keyword.includes("farmer"))
);
assert.ok(
  output.slice(0, 10).some(keyword => keyword.includes("harvest"))
);

const maxOutput = ensureKeywordCount(
  Array.from({ length: 80 }, (_, index) => `keyword ${index}`),
  80,
  facts
);
assert.ok(maxOutput.length <= 49);

const duplicateOutput = ensureKeywordCount(
  ["rice", "rice", "farmer", "farmers", "rice farmers", "harvesting"],
  49,
  facts
);
assert.equal(
  new Set(duplicateOutput.map(keyword => keyword.toLowerCase())).size,
  duplicateOutput.length
);

const prohibitedOnly = validateAdobeStockKeywords(
  ["beautiful", "image", "photo", "stock", "Nike", "4K", "ISO 100"],
  facts
);
assert.deepEqual(prohibitedOnly.keywords, []);

const phraseSpam = validateAdobeStockKeywords(
  ["this is a long sentence describing a rice farmer"],
  facts
);
assert.deepEqual(phraseSpam.keywords, []);

console.log("Adobe Stock keyword rules tests passed.");

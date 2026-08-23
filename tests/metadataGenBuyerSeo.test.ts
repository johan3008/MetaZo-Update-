import assert from "node:assert/strict";
import {
  scoreMetadataGenKeywords,
  validateMetadataTitleSearchability,
  validateMetadataTitleKeywordConsistency
} from "../server/gemini.ts";

const facts = {
  title: "Rice farmer harvesting in rice field",
  objects: [
    { name: "rice farmer", tier: "primary" },
    { name: "rice bundle", tier: "secondary" }
  ],
  environment: ["rice field", "mountain"],
  actions: ["harvesting"],
  concepts: ["agriculture"],
  style: ["traditional"],
  attributes: ["golden"],
  colors: ["green"]
};

const keywords = [
  "rice farmer",
  "harvesting",
  "rice field",
  "rice bundle",
  "agriculture",
  "mountain",
  "traditional",
  "golden",
  "green"
];

const scored = scoreMetadataGenKeywords(keywords, facts);
assert.equal(scored[0].keyword, "rice farmer");
assert.ok(scored[0].buyerSearchability >= 70);
assert.ok(
  scored.some(item => item.keyword === "harvesting" && item.buyerSearchability >= 70)
);

const titleSeo = validateMetadataTitleSearchability(
  facts.title,
  keywords,
  facts
);
assert.equal(titleSeo.status, "PASS");
assert.ok(titleSeo.score >= 80);
assert.ok(titleSeo.concreteTermCount >= 3);
assert.ok(titleSeo.buyerIntentTerms.length >= 3);

const weakTitleSeo = validateMetadataTitleSearchability(
  "Beautiful amazing image",
  ["rice farmer", "harvesting", "rice field"],
  facts
);
assert.equal(weakTitleSeo.status, "FAIL");

const consistency = validateMetadataTitleKeywordConsistency(
  facts.title,
  keywords,
  facts
);
assert.equal(consistency.status, "PASS");
assert.ok(consistency.titleSearchability.score >= 80);

console.log("MetadataGen buyer SEO tests passed.");

import assert from "node:assert/strict";
import {
  scoreMetadataGenKeywords,
  validateMetadataTitleKeywordConsistency
} from "../server/gemini.ts";

const visualFacts = {
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
  "green",
  "photo"
];

const scores = scoreMetadataGenKeywords(keywords, visualFacts);

assert.equal(scores[0].keyword, "rice farmer");
assert.equal(scores[0].rank, 1);
assert.equal(scores[0].topTenPriority, "critical");
assert.ok(scores[0].normalizedScore > 70);
assert.equal(scores[1].topTenPriority, "high");
assert.ok(scores.some(item => item.keyword === "rice field" && item.titleRelevant));

const consistency = validateMetadataTitleKeywordConsistency(
  visualFacts.title,
  keywords,
  visualFacts
);

assert.ok(consistency.score >= 80);
assert.notEqual(consistency.status, "FAIL");
assert.ok(consistency.topTenKeywordCoverage >= 60);
assert.deepEqual(consistency.unsupportedTitleTerms, []);

const weakConsistency = validateMetadataTitleKeywordConsistency(
  "Red car driving on city highway",
  ["rice", "farmer", "harvesting"],
  visualFacts
);

assert.equal(weakConsistency.status, "FAIL");
assert.ok(weakConsistency.warnings.length > 0);

console.log("MetadataGen keyword scoring and title consistency tests passed.");

import assert from "node:assert/strict";
import { ensureKeywordCount, rankMetadataGenKeywords } from "../server/gemini.ts";

const riceHarvestFacts = {
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

const ranked = rankMetadataGenKeywords(
  [
    "beautiful",
    "green",
    "mountain",
    "work",
    "rice farmer",
    "harvesting",
    "rice field",
    "traditional",
    "rice bundle"
  ],
  riceHarvestFacts
);

assert.equal(ranked[0], "rice farmer");
assert.ok(ranked.indexOf("rice field") < ranked.indexOf("beautiful"));
assert.ok(ranked.indexOf("harvesting") < ranked.indexOf("beautiful"));
assert.ok(ranked.indexOf("mountain") < ranked.indexOf("beautiful"));
assert.ok(ranked.indexOf("green") < ranked.indexOf("beautiful"));

const deterministicInput = ["rice", "farmer", "harvest", "field"];
const first = rankMetadataGenKeywords(deterministicInput, {
  objects: [{ name: "rice", tier: "primary" }],
  actions: ["harvesting"],
  environment: ["field"]
});
const second = rankMetadataGenKeywords(deterministicInput, {
  objects: [{ name: "rice", tier: "primary" }],
  actions: ["harvesting"],
  environment: ["field"]
});
assert.deepEqual(first, second);

const cleaned = ensureKeywordCount(
  [
    "rice farmer",
    "rice farmer",
    "beautiful",
    "image",
    "harvesting",
    "rice field",
    "mountain"
  ],
  4,
  riceHarvestFacts
);
assert.equal(cleaned.length, 4);
assert.equal(new Set(cleaned).size, 4);
assert.ok(!cleaned.includes("beautiful"));
assert.ok(!cleaned.includes("image"));

const singleWordMode = ensureKeywordCount(
  ["rice farmer", "rice field", "harvesting"],
  3,
  riceHarvestFacts,
  undefined,
  undefined,
  undefined,
  "single"
);
assert.deepEqual(singleWordMode, ["rice", "harvesting"]);

console.log("MetadataGen keyword ranking tests passed.");


const fiftyCandidates = [
  "rice", "farmer", "rice field", "harvesting", "mountain", "rural",
  "agriculture", "traditional", "worker", "field", "crop", "grain",
  "rice bundle", "manual", "outdoors", "landscape", "terraced",
  "terraces", "golden", "green", "hat", "mud", "stalks", "harvest",
  "cultivation", "farming", "labor", "nature", "scenic", "asia",
  "people", "work", "tying", "harvested", "stalk", "farmland",
  "countryside", "valley", "mist", "sky", "farm", "rural landscape",
  "rice harvest", "mountain landscape", "traditional farming",
  "agricultural worker", "outdoor work", "food crop", "field worker",
  "beautiful", "image"
];

const fiftyResult = ensureKeywordCount(fiftyCandidates, 50, riceHarvestFacts);
assert.ok(fiftyResult.length <= 49);
assert.equal(new Set(fiftyResult).size, 50);
assert.ok(!fiftyResult.includes("beautiful"));
assert.ok(!fiftyResult.includes("image"));

const oversizedResult = ensureKeywordCount(
  [...fiftyCandidates, "rice farmer", "rice field", "harvesting"],
  25,
  riceHarvestFacts
);
assert.equal(oversizedResult.length, 25);
assert.equal(new Set(oversizedResult).size, 25);

const emptyResult = ensureKeywordCount([], 50, riceHarvestFacts);
assert.deepEqual(emptyResult, []);

const zeroResult = ensureKeywordCount(fiftyCandidates, 0, riceHarvestFacts);
assert.deepEqual(zeroResult, []);

const invalidTargetResult = ensureKeywordCount(
  fiftyCandidates,
  Number.NaN,
  riceHarvestFacts
);
assert.deepEqual(invalidTargetResult, []);

const malformedInputResult = ensureKeywordCount(
  [null, undefined, 42, {}, "rice", "rice farmer"],
  10,
  riceHarvestFacts
);
assert.deepEqual(malformedInputResult, ["rice", "rice farmer"]);

const duplicateMorphologyResult = ensureKeywordCount(
  ["farmer", "farmers", "rice", "rices", "field", "fields"],
  10,
  riceHarvestFacts
);
assert.equal(
  new Set(duplicateMorphologyResult).size,
  duplicateMorphologyResult.length
);

const weakOnlyResult = ensureKeywordCount(
  ["beautiful", "amazing", "professional", "image", "photo"],
  50,
  riceHarvestFacts
);
assert.deepEqual(weakOnlyResult, []);

const unrelatedOnlyResult = ensureKeywordCount(
  ["blockchain", "database", "server", "software"],
  50,
  riceHarvestFacts
);
assert.deepEqual(unrelatedOnlyResult, []);

console.log("MetadataGen 50-keyword and edge-case tests passed.");

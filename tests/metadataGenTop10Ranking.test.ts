import assert from "node:assert/strict";
import { ensureKeywordCount, rankMetadataGenKeywords } from "../server/gemini.ts";

const facts = {
  title: "Rice farmer harvesting in rice field",
  objects: [
    { name: "rice farmer", tier: "primary" },
    { name: "rice bundle", tier: "secondary" }
  ],
  environment: ["rice field", "mountain"],
  actions: ["harvesting"],
  style: ["traditional"],
  attributes: ["golden"],
  colors: ["green"],
  concepts: ["agriculture"]
};

const ranked = rankMetadataGenKeywords(
  [
    "green",
    "mountain",
    "rice field",
    "agriculture",
    "harvesting",
    "rice bundle",
    "rice farmer",
    "traditional",
    "golden"
  ],
  facts
);

assert.equal(ranked[0], "rice farmer");
assert.equal(ranked[1], "rice field");
assert.ok(ranked.indexOf("harvesting") < ranked.indexOf("green"));
assert.ok(ranked.indexOf("rice bundle") < ranked.indexOf("green"));

const topTen = ensureKeywordCount(
  [
    "green",
    "mountain",
    "rice field",
    "agriculture",
    "harvesting",
    "rice bundle",
    "rice farmer",
    "traditional",
    "golden"
  ],
  9,
  facts,
  facts.title
);

assert.equal(topTen[0], "rice farmer");
assert.equal(topTen[1], "rice field");
assert.ok(topTen.indexOf("harvesting") < topTen.indexOf("green"));

const genericHeavy = rankMetadataGenKeywords(
  ["image", "photo", "rice farmer", "harvesting", "rice field"],
  facts
);
assert.equal(genericHeavy[0], "rice farmer");
assert.equal(genericHeavy[1], "harvesting");
assert.equal(genericHeavy[2], "rice field");

console.log("MetadataGen Top-10 ranking tests passed.");

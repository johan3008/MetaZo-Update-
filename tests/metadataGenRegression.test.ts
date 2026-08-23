import assert from "node:assert/strict";
import {
  ensureDescription,
  ensureKeywordCount,
  ensureTitleLength,
  getHeuristicCategories,
  rankMetadataGenKeywords
} from "../server/gemini.ts";

const riceFacts = {
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

const riceCandidates = [
  "rice", "farmer", "rice field", "harvesting", "mountain", "rural",
  "agriculture", "traditional", "worker", "field", "crop", "grain",
  "rice bundle", "manual", "outdoors", "landscape", "terraced",
  "terraces", "golden", "green", "hat", "mud", "stalks", "harvest",
  "cultivation", "farming", "labor", "nature", "scenic", "asia",
  "people", "work", "tying", "harvested", "stalk", "farmland",
  "countryside", "valley", "mist", "sky", "farm", "rural landscape",
  "rice harvest", "mountain landscape", "traditional farming",
  "agricultural worker", "outdoor work", "food crop", "field worker"
];

const ranked = rankMetadataGenKeywords(
  [...riceCandidates, "beautiful", "image"],
  riceFacts
);
assert.equal(ranked[0], "rice");
assert.ok(ranked.indexOf("rice farmer") < ranked.indexOf("beautiful"));
assert.ok(ranked.indexOf("harvesting") < ranked.indexOf("beautiful"));
assert.ok(ranked.indexOf("mountain") < ranked.indexOf("beautiful"));

const fifty = ensureKeywordCount(
  [...riceCandidates, "beautiful", "image"],
  50,
  riceFacts
);
assert.equal(fifty.length, 50);
assert.equal(new Set(fifty).size, 50);
assert.ok(!fifty.includes("beautiful"));
assert.ok(!fifty.includes("image"));

const twentyFive = ensureKeywordCount(riceCandidates, 25, riceFacts);
assert.equal(twentyFive.length, 25);

assert.deepEqual(ensureKeywordCount([], 50, riceFacts), []);
assert.deepEqual(ensureKeywordCount(riceCandidates, 0, riceFacts), []);
assert.deepEqual(ensureKeywordCount(riceCandidates, Number.NaN, riceFacts), []);
assert.deepEqual(
  ensureKeywordCount(
    ["beautiful", "amazing", "professional", "image", "photo"],
    50,
    riceFacts
  ),
  []
);

const shortTitle = ensureTitleLength(
  "Vector of rice farmer harvesting rice in mountain field with traditional farming",
  ["rice", "farmer", "harvesting"],
  "",
  "short"
);
assert.ok(shortTitle.length <= 65);
assert.ok(!/^vector of /i.test(shortTitle));
assert.ok(!shortTitle.includes(","));
assert.ok(!shortTitle.includes("."));

const longTitle = ensureTitleLength(
  "Rice farmer harvesting rice in mountain field with traditional farming and golden crop",
  ["rice", "farmer", "harvesting"],
  "",
  "long"
);
assert.ok(longTitle.length <= 200);

const repeatedTitle = ensureTitleLength(
  "Rice rice farmer farmer harvesting",
  ["rice", "farmer", "harvesting"],
  ""
);
assert.equal(repeatedTitle, "Rice farmer harvesting");

const placeholderDescription = ensureDescription(
  "Write a detailed description here",
  "Rice farmer harvesting rice",
  ["rice", "farmer", "harvesting"]
);
assert.ok(placeholderDescription.length <= 200);
assert.ok(/rice farmer harvesting/i.test(placeholderDescription));

const longDescription = ensureDescription(
  "Rice farmer harvesting rice in a mountain field. ".repeat(20),
  "Rice farmer harvesting rice",
  ["rice", "farmer", "harvesting"]
);
assert.ok(longDescription.length <= 200);
assert.ok(longDescription.length > 0);

const validDescription = ensureDescription(
  "Rice farmer harvesting rice in a mountain field.",
  "Rice farmer harvesting rice",
  ["rice", "farmer", "harvesting"]
);
assert.equal(validDescription, "Rice farmer harvesting rice in a mountain field.");

const riceCategory = getHeuristicCategories(
  "Rice farmer harvesting in mountain rice field",
  ["rice", "farmer", "harvesting", "mountain", "rice field", "landscape"]
);
assert.equal(riceCategory.category_id, 11);
assert.equal(riceCategory.shutterstock_category_1, "Nature");

const foodCategory = getHeuristicCategories(
  "Fresh fruit and vegetable food ingredients",
  ["food", "fruit", "vegetable", "kitchen", "meal"]
);
assert.equal(foodCategory.category_id, 7);
assert.equal(foodCategory.shutterstock_category_1, "Food and Drink");

const peopleCategory = getHeuristicCategories(
  "Portrait of a woman smiling",
  ["woman", "portrait", "face", "people"]
);
assert.equal(peopleCategory.category_id, 13);
assert.equal(peopleCategory.shutterstock_category_1, "People");

const emptyCategory = getHeuristicCategories("", []);
assert.equal(emptyCategory.category_id, 8);
assert.equal(emptyCategory.shutterstock_category_1, "Abstract");

const malformedFacts = rankMetadataGenKeywords(
  ["rice", null as unknown as string, "", "beautiful"],
  {}
);
assert.ok(Array.isArray(malformedFacts));

console.log("Full MetadataGen regression suite passed.");

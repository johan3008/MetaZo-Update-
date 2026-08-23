import assert from "node:assert/strict";
import jpeg from "jpeg-js";
import { analyzeTemporalFrames } from "../server/videoAnalyzer.ts";

function makeFrame(
  width: number,
  height: number,
  value: number
): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }

  return jpeg.encode({ data, width, height }, 80).data;
}

const duplicateReport = analyzeTemporalFrames(
  [makeFrame(32, 32, 100), makeFrame(32, 32, 100), makeFrame(32, 32, 100)],
  3
);

assert.ok(duplicateReport);
assert.equal(duplicateReport?.comparedFrames, 3);
assert.equal(duplicateReport?.duplicatePairs, 2);
assert.equal(duplicateReport?.duplicateRate, 1);

const changingReport = analyzeTemporalFrames(
  [makeFrame(32, 32, 20), makeFrame(32, 32, 120), makeFrame(32, 32, 220)],
  3
);

assert.ok(changingReport);
assert.equal(changingReport?.duplicatePairs, 0);
assert.ok((changingReport?.luminanceDeltaMean ?? 0) > 50);
assert.ok((changingReport?.flickerScore ?? 0) > 50);

const mixedScaleReport = analyzeTemporalFrames(
  [
    makeFrame(32, 32, 80),
    makeFrame(32, 32, 80),
    makeFrame(32, 32, 80),
    makeFrame(64, 64, 80)
  ],
  3
);

assert.ok(mixedScaleReport);
assert.equal(mixedScaleReport?.comparedFrames, 3);

console.log("Temporal video QC tests passed.");

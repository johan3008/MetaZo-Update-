import assert from "node:assert/strict";
import {
  buildVideoDeterministicEvidence,
  decideQc,
  mergeEvidence,
  normalizeEvidence,
  severityFor
} from "../server/qcEngine.ts";

assert.equal(severityFor("watermark"), "HARD_FAIL");
assert.equal(severityFor("blur"), "MAJOR");

const unknownEvidence = normalizeEvidence(
  {
    blur: { status: "UNKNOWN", note: "Not assessed" },
    watermark: { status: "PASS", note: "None detected" }
  },
  "ai"
);
const unknownDecision = decideQc(unknownEvidence, { tolerance: "MEDIUM" });
assert.ok(unknownDecision.unknown_checks.includes("blur"));
assert.equal(unknownDecision.recommendation, "RETOUCH");
assert.ok(unknownDecision.confidence < 100);

const hardFailEvidence = normalizeEvidence(
  {
    watermark: { status: "FAIL", note: "Watermark detected" },
    blur: { status: "PASS", note: "Sharp" }
  },
  "ai"
);
const hardFailDecision = decideQc(hardFailEvidence);
assert.equal(hardFailDecision.recommendation, "FAIL");
assert.ok(hardFailDecision.hard_failures.includes("watermark"));

const deterministic = normalizeEvidence(
  { blur: { status: "PASS", note: "Measured sharp" } },
  "deterministic"
);
const aiFail = normalizeEvidence(
  { blur: { status: "FAIL", note: "AI sees soft focus" } },
  "ai"
);
const merged = mergeEvidence(deterministic, aiFail);
assert.equal(merged.find(item => item.key === "blur")?.status, "FAIL");

const videoEvidence = buildVideoDeterministicEvidence({
  filters: {
    black_frames_detected: true,
    black_frames: [{ start: 1, end: 2, duration: 1 }],
    frozen_frames_detected: false,
    frozen_frames: []
  },
  frameAnalysis: [
    {
      frameIndex: 1,
      sharpness: 8,
      blurStatus: "BLURRED",
      overexposurePercent: 0,
      underexposurePercent: 0
    }
  ],
  stabilityStatus: "FLICKERING",
  ffprobe: { video: { width: 1280, height: 720, fps: 24 } }
});
const videoDecision = decideQc(videoEvidence, { tolerance: "MEDIUM" });
assert.equal(videoDecision.recommendation, "FAIL");
assert.ok(videoDecision.hard_failures.includes("black_frame"));
assert.ok(videoEvidence.some(item => item.key === "resolution" && item.status === "FAIL"));

const cleanVideoEvidence = buildVideoDeterministicEvidence({
  filters: {
    black_frames_detected: false,
    black_frames: [],
    frozen_frames_detected: false,
    frozen_frames: []
  },
  frameAnalysis: [
    {
      frameIndex: 1,
      sharpness: 80,
      blurStatus: "SHARP",
      overexposurePercent: 0,
      underexposurePercent: 0
    }
  ],
  stabilityStatus: "STABLE",
  ffprobe: { video: { width: 3840, height: 2160, fps: 29.97 } }
});
const cleanDecision = decideQc(cleanVideoEvidence, { tolerance: "MEDIUM" });
assert.equal(cleanDecision.recommendation, "PASS");

console.log("Quality Control engine tests passed.");

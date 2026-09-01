export type QcStatus = "PASS" | "FAIL" | "UNKNOWN";
export type QcSeverity = "HARD_FAIL" | "MAJOR" | "MINOR" | "INFO";

export interface QcEvidence {
  key: string;
  status: QcStatus;
  severity?: QcSeverity;
  note?: string;
  source?: "deterministic" | "ai" | "merged";
}

export interface QcDecision {
  recommendation: "PASS" | "RETOUCH" | "FAIL";
  overall_score: number;
  technical_score: number;
  visual_score: number;
  confidence: number;
  hard_failures: string[];
  major_issues: string[];
  minor_issues: string[];
  unknown_checks: string[];
  evidence: QcEvidence[];
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function normalizeStatus(value: unknown): QcStatus {
  const status = String(value ?? "").toUpperCase();
  if (status === "PASS") return "PASS";
  if (status === "FAIL" || status === "REJECT") return "FAIL";
  return "UNKNOWN";
}

export function severityFor(key: string): QcSeverity {
  const hard = new Set([
    "watermark",
    "logo",
    "ip_risk",
    "ai_artifact",
    "anatomical_errors",
    "bad_anatomy",
    "deformed_object",
    "black_frame",
    "frozen_frame",
    "temporal_morphing",
    "texture_warping",
    "geometry_consistency",
    "duplicate_frame"
  ]);
  const major = new Set([
    "blur",
    "out_of_focus",
    "flickering",
    "camera_shake",
    "motion_consistency",
    "compression_artifacts",
    "blocking",
    "banding",
    "noise",
    "artifacts",
    "sharpness"
  ]);

  if (hard.has(key)) return "HARD_FAIL";
  if (major.has(key)) return "MAJOR";
  return "MINOR";
}

export function normalizeEvidence(
  checks: Record<string, { status?: unknown; note?: unknown } | undefined>,
  source: "deterministic" | "ai"
): QcEvidence[] {
  return Object.entries(checks || {}).map(([key, value]) => ({
    key,
    status: normalizeStatus(value?.status),
    severity: severityFor(key),
    note: typeof value?.note === "string" ? value.note : undefined,
    source
  }));
}

export function mergeEvidence(
  deterministic: QcEvidence[],
  ai: QcEvidence[]
): QcEvidence[] {
  const merged = new Map<string, QcEvidence>();

  for (const item of [...ai, ...deterministic]) {
    const previous = merged.get(item.key);
    if (!previous) {
      merged.set(item.key, { ...item });
      continue;
    }

    const status =
      previous.status === "FAIL" || item.status === "FAIL"
        ? "FAIL"
        : previous.status === "UNKNOWN" || item.status === "UNKNOWN"
          ? "UNKNOWN"
          : "PASS";

    const source =
      previous.source === item.source ? previous.source : "merged";

    merged.set(item.key, {
      ...previous,
      ...item,
      status,
      source
    });
  }

  return [...merged.values()];
}

function scoreEvidence(
  evidence: QcEvidence[],
  unknownPenalty: number
): number {
  let score = 100;

  for (const item of evidence) {
    if (item.status === "FAIL") {
      if (item.severity === "HARD_FAIL") score -= 100;
      else if (item.severity === "MAJOR") score -= 20;
      else score -= 7;
    } else if (item.status === "UNKNOWN") {
      score -= unknownPenalty;
    }
  }

  return clamp(score);
}

export function decideQc(
  evidence: QcEvidence[],
  options: {
    tolerance?: "STRICT" | "MEDIUM" | "LOOSE";
    deterministicScore?: number;
    aiScore?: number;
  } = {}
): QcDecision {
  const tolerance = options.tolerance || "MEDIUM";
  const unknownPenalty = tolerance === "STRICT" ? 15 : tolerance === "MEDIUM" ? 11 : 5;

  const hardFailures = evidence
    .filter(item => item.status === "FAIL" && item.severity === "HARD_FAIL")
    .map(item => item.key);

  const majorIssues = evidence
    .filter(item => item.status === "FAIL" && item.severity === "MAJOR")
    .map(item => item.key);

  const minorIssues = evidence
    .filter(item => item.status === "FAIL" && item.severity === "MINOR")
    .map(item => item.key);

  const unknownChecks = evidence
    .filter(item => item.status === "UNKNOWN")
    .map(item => item.key);

  const technicalEvidence = evidence.filter(item =>
    ["deterministic", "merged"].includes(item.source || "")
  );
  const aiEvidence = evidence.filter(item =>
    ["ai", "merged"].includes(item.source || "")
  );

  const techUnknownPenalty = tolerance === "STRICT" ? 4 : tolerance === "MEDIUM" ? 2 : 1;
  const technicalScore = clamp(
    options.deterministicScore ?? (technicalEvidence.length > 0 ? scoreEvidence(technicalEvidence, techUnknownPenalty) : (aiEvidence.length > 0 ? scoreEvidence(aiEvidence, unknownPenalty) : 100))
  );
  const visualScore = clamp(
    options.aiScore ?? (aiEvidence.length > 0 ? scoreEvidence(aiEvidence, unknownPenalty) : (technicalEvidence.length > 0 ? scoreEvidence(technicalEvidence, techUnknownPenalty) : 100))
  );

  const overallScore = technicalEvidence.length > 0 && aiEvidence.length > 0
    ? Math.round(technicalScore * 0.7 + visualScore * 0.3)
    : technicalEvidence.length > 0
      ? technicalScore
      : visualScore;

  let recommendation: QcDecision["recommendation"] = "PASS";
  if (hardFailures.length > 0) {
    recommendation = "FAIL";
  } else if (
    majorIssues.length > 0 ||
    (tolerance === "STRICT" && unknownChecks.length > 0)
  ) {
    recommendation = "RETOUCH";
  } else if (unknownChecks.length > 0 && overallScore < 90) {
    recommendation = "RETOUCH";
  }

  const confidence = clamp(
    100 -
      unknownChecks.length * 8 -
      (technicalEvidence.length === 0 ? 25 : 0) -
      (aiEvidence.length === 0 ? 25 : 0)
  );

  return {
    recommendation,
    overall_score: overallScore,
    technical_score: Math.round(technicalScore),
    visual_score: Math.round(visualScore),
    confidence: Math.round(confidence),
    hard_failures: [...new Set(hardFailures)],
    major_issues: [...new Set(majorIssues)],
    minor_issues: [...new Set(minorIssues)],
    unknown_checks: [...new Set(unknownChecks)],
    evidence
  };
}

export function buildVideoDeterministicEvidence(
  report: any
): QcEvidence[] {
  const evidence: QcEvidence[] = [];

  const add = (
    key: string,
    failed: boolean | null | undefined,
    note: string
  ) => {
    evidence.push({
      key,
      status: failed == null ? "UNKNOWN" : failed ? "FAIL" : "PASS",
      severity: severityFor(key),
      note,
      source: "deterministic"
    });
  };

  add(
    "black_frame",
    report?.filters?.black_frames_detected,
    report?.filters?.black_frames_detected
      ? `${report.filters.black_frames.length} black-frame interval(s) detected.`
      : "No black-frame interval detected."
  );

  add(
    "frozen_frame",
    report?.filters?.frozen_frames_detected,
    report?.filters?.frozen_frames_detected
      ? `${report.filters.frozen_frames.length} frozen interval(s) detected.`
      : "No frozen-frame interval detected."
  );

  const frames = Array.isArray(report?.frameAnalysis) ? report.frameAnalysis : [];
  if (frames.length === 0) {
    add("blur", null, "No deterministic frame sharpness data available.");
    add("overexposure", null, "No deterministic exposure data available.");
    add("underexposure", null, "No deterministic exposure data available.");
  } else {
    add(
      "blur",
      frames.some((frame: any) => frame.blurStatus === "BLURRED"),
      "Derived from deterministic frame sharpness analysis."
    );
    add(
      "overexposure",
      frames.some((frame: any) => Number(frame.overexposurePercent) >= 5),
      "Derived from measured clipped-highlight percentage."
    );
    add(
      "underexposure",
      frames.some((frame: any) => Number(frame.underexposurePercent) >= 5),
      "Derived from measured crushed-shadow percentage."
    );
  }

  const width = Number(report?.ffprobe?.video?.width);
  const height = Number(report?.ffprobe?.video?.height);
  const fps = Number(report?.ffprobe?.video?.fps);

  add(
    "resolution",
    Number.isFinite(width) && Number.isFinite(height)
      ? width < 1920 || height < 1080
      : null,
    Number.isFinite(width) && Number.isFinite(height)
      ? `Measured resolution: ${width}x${height}.`
      : "No deterministic resolution data available."
  );

  add(
    "fps",
    Number.isFinite(fps) && fps < 23.976,
    Number.isFinite(fps)
      ? `Measured frame rate: ${fps.toFixed(3)} fps.`
      : "No deterministic frame-rate data available."
  );

  const temporal = report?.temporal;
  add(
    "duplicate_frame",
    temporal
      ? temporal.duplicateRate >= 0.2
      : null,
    temporal
      ? `${temporal.duplicatePairs}/${Math.max(1, temporal.comparedFrames - 1)} adjacent pair(s) are near-duplicates.`
      : "No temporal duplicate-frame data available."
  );

  add(
    "flickering",
    temporal
      ? temporal.flickerScore >= 70
      : report?.stabilityStatus
        ? report.stabilityStatus === "FLICKERING"
        : null,
    temporal
      ? `Temporal flicker score ${temporal.flickerScore.toFixed(1)}.`
      : report?.stabilityStatus
        ? `Deterministic stability status: ${report.stabilityStatus}.`
        : "No deterministic flicker data available."
  );

  add(
    "motion_consistency",
    temporal
      ? temporal.motionConsistencyScore < 50
      : null,
    temporal
      ? `Temporal motion consistency ${temporal.motionConsistencyScore.toFixed(1)}/100.`
      : "No deterministic temporal motion data available."
  );

  add(
    "ghosting",
    temporal ? null : null,
    "Ghosting requires visual/AI inspection; deterministic pixel analysis cannot confirm it reliably."
  );

  add(
    "temporal_morphing",
    temporal ? null : null,
    "Temporal morphing requires visual/AI inspection; deterministic pixel analysis cannot confirm it reliably."
  );



  add(
    "camera_shake",
    report?.stabilityStatus
      ? report.stabilityStatus === "UNSTABLE"
      : null,
    report?.stabilityStatus
      ? `Deterministic stability status: ${report.stabilityStatus}.`
      : "No deterministic stability status available."
  );

  return evidence;
}

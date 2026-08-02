/** face-api recognition net descriptor length. */
export const FACE_DESCRIPTOR_LENGTH = 128;

/** Euclidean distance below this means faces match. */
export const FACE_MATCH_DISTANCE_THRESHOLD = 0.55;

/**
 * Minimum gap between best and second-best distance for a unique 1:N match.
 */
export const FACE_1N_AMBIGUITY_MARGIN = 0.1;

/** Max candidates returned on ambiguous 1:N identify. */
export const FACE_1N_MAX_AMBIGUOUS_CANDIDATES = 5;

export type FaceIdentifyStatus = 'match' | 'ambiguous' | 'none';

export type FaceGalleryEntry = {
  documentId: string;
  faceVector: number[];
};

export type RankedFaceMatch = {
  documentId: string;
  distance: number;
};

export type RankFaceMatchesResult = {
  status: FaceIdentifyStatus;
  ranked: RankedFaceMatch[];
};

export function faceDescriptorDistance(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  if (left.length !== right.length || left.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = Number(left[index]) - Number(right[index]);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

/** Validates and copies a face-api descriptor array. */
export function normalizeFaceVector(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== FACE_DESCRIPTOR_LENGTH) {
    return null;
  }

  const vector: number[] = [];
  for (const value of raw) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    vector.push(value);
  }
  return vector;
}

/**
 * Ranks gallery entries by distance to probe and classifies the outcome.
 * Unique match: best < threshold and (no second under threshold or gap >= margin).
 */
export function rankFaceMatches(
  probeRaw: unknown,
  gallery: FaceGalleryEntry[],
  options: {
    threshold?: number;
    margin?: number;
    maxAmbiguous?: number;
  } = {},
): RankFaceMatchesResult {
  const threshold = options.threshold ?? FACE_MATCH_DISTANCE_THRESHOLD;
  const margin = options.margin ?? FACE_1N_AMBIGUITY_MARGIN;
  const maxAmbiguous =
    options.maxAmbiguous ?? FACE_1N_MAX_AMBIGUOUS_CANDIDATES;

  const probe = normalizeFaceVector(probeRaw);
  if (!probe || gallery.length === 0) {
    return { status: 'none', ranked: [] };
  }

  const ranked: RankedFaceMatch[] = [];
  for (const entry of gallery) {
    const vector = normalizeFaceVector(entry.faceVector);
    if (!vector) continue;
    ranked.push({
      documentId: entry.documentId,
      distance: faceDescriptorDistance(probe, vector),
    });
  }

  ranked.sort((left, right) => left.distance - right.distance);

  const underThreshold = ranked.filter((row) => row.distance < threshold);
  if (underThreshold.length === 0) {
    return { status: 'none', ranked };
  }

  const best = underThreshold[0]!;
  const second = underThreshold[1];
  const unique =
    !second || second.distance >= best.distance + margin;

  if (unique) {
    return { status: 'match', ranked: underThreshold };
  }

  return {
    status: 'ambiguous',
    ranked: underThreshold.slice(0, maxAmbiguous),
  };
}

/**
 * Word-level comparison of a target sentence and a recognized transcript. This compares TEXT only:
 * it cannot tell how a word sounded, so it is never presented as a pronunciation score.
 */
export interface WordDiff {
  matched: string[];
  missing: string[];
  substituted: { expected: string; heard: string }[];
  extra: string[];
  /** Share of target words found in order. Informational only. */
  matchRatio: number;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[.,!?;:"“”„«»()¿¡…–—-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export function compareWords(target: string, transcript: string): WordDiff {
  const a = normalize(target);
  const b = normalize(transcript);
  // Longest common subsequence over words.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const matched: string[] = [];
  const missing: string[] = [];
  const substituted: { expected: string; heard: string }[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      matched.push(a[i]!);
      i += 1;
      j += 1;
    } else if (i < a.length && j < b.length && dp[i + 1]![j]! === dp[i]![j + 1]! ) {
      substituted.push({ expected: a[i]!, heard: b[j]! });
      i += 1;
      j += 1;
    } else if (i < a.length && (j >= b.length || dp[i + 1]![j]! >= dp[i]![j + 1]!)) {
      missing.push(a[i]!);
      i += 1;
    } else {
      extra.push(b[j]!);
      j += 1;
    }
  }
  return { matched, missing, substituted, extra, matchRatio: a.length === 0 ? 0 : matched.length / a.length };
}

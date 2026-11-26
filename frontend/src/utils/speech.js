/**
 * Splits spoken text into weighted word spans so UI highlighting / glow
 * tracks audio playback proportionally across words and punctuation pauses.
 */
export function computeWordSpans(text) {
  const tokens = String(text || '').match(/\S+\s*/g) || [];
  if (tokens.length === 0) return [];

  const weights = tokens.map((tok) => {
    const trimmed = tok.trim();
    const base = Math.max(2, trimmed.length);
    const pause = /[.,;!?।]$/.test(trimmed) ? 3.2 : 0;
    return base + pause;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  let charPos = 0;

  return tokens.map((tok, i) => {
    const startRatio = acc / totalWeight;
    acc += weights[i];
    const endRatio = acc / totalWeight;
    const startChar = charPos;
    charPos += tok.length;

    return {
      text: tok,
      startRatio,
      endRatio,
      startChar,
      endChar: charPos,
    };
  });
}

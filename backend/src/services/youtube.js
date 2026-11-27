/**
 * YouTube Recipe Video Lookup Service
 * Finds and verifies an embeddable YouTube cooking tutorial matching the specific recipe.
 * Uses YOUTUBE_API_KEY (YouTube Data API v3) when configured, with public search fallback.
 */

const videoCache = new Map();
const CACHE_MAX_SIZE = 300;

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'in', 'of', 'for', 'to', 'a', 'an', 'recipe', 'recipes',
  'style', 'indian', 'easy', 'quick', 'homemade', 'best', 'special', 'classic',
  'traditional', 'authentic', 'healthy', 'simple', 'how', 'make', 'dish',
]);

const NOISE_PATTERNS = [
  '#shorts',
  'shorts',
  'mukbang',
  'asmr',
  'reaction',
  'top 10',
  'top 5',
  'compilation',
  'street food tour',
  'eating challenge',
];

function setCache(key, value) {
  if (videoCache.size >= CACHE_MAX_SIZE) {
    const firstKey = videoCache.keys().next().value;
    videoCache.delete(firstKey);
  }
  videoCache.set(key, value);
}

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeDishTitle(rawTitle) {
  return String(rawTitle || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s*-\s*.*$/, '')
    .replace(/\brecipe\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function buildSearchQuery(baseTitle, cuisine) {
  const tokens = extractCoreTokens(baseTitle);
  const cleanCuisine = String(cuisine || '').trim();
  const cuisineLower = cleanCuisine.toLowerCase();
  const titleLower = baseTitle.toLowerCase();

  const includeCuisine =
    cleanCuisine &&
    cuisineLower !== 'indian' &&
    !titleLower.includes(cuisineLower) &&
    tokens.length <= 3;

  const corePhrase = baseTitle.includes(' ') ? `"${baseTitle}"` : baseTitle;
  return `${corePhrase}${includeCuisine ? ` ${cleanCuisine}` : ''} recipe how to make`
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreVideoCandidate(candidate, coreTokens, baseTitleLower) {
  const vTitle = String(candidate.title || '').toLowerCase();
  const vDesc = String(candidate.description || '').toLowerCase();

  if (!vTitle || !candidate.videoId) return -100;

  let score = 0;

  // Exact dish phrase in video title is a strong signal
  if (baseTitleLower.length >= 4 && vTitle.includes(baseTitleLower)) {
    score += 50;
  }

  // Count how many core dish words appear in video title vs description
  let titleTokenMatches = 0;
  for (const tok of coreTokens) {
    if (vTitle.includes(tok)) {
      titleTokenMatches += 1;
      score += 18;
    } else if (vDesc.includes(tok)) {
      score += 5;
    }
  }

  // Must match at least half of core dish tokens (or >=1 when dish has 1-2 words) in the title
  const minRequired = coreTokens.length <= 2 ? 1 : Math.ceil(coreTokens.length * 0.5);
  if (coreTokens.length > 0 && titleTokenMatches < minRequired) {
    return -50;
  }

  // Boost genuine cooking tutorial signals
  if (/\b(recipe|how to make|cooking|banane|vidhi|home style|authentic)\b/i.test(vTitle)) {
    score += 10;
  }

  // Penalize shorts, compilations, mukbangs, and unrelated content
  for (const noise of NOISE_PATTERNS) {
    if (vTitle.includes(noise)) {
      score -= 40;
    }
  }

  return score;
}

function buildVideoPayload({ videoId, title, channelTitle }) {
  return {
    available: true,
    videoId,
    title: decodeHtmlEntities(title) || 'Recipe Video Tutorial',
    channelTitle: decodeHtmlEntities(channelTitle) || 'YouTube',
    embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function searchViaYouTubeApi(query, apiKey, coreTokens, baseTitleLower) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('maxResults', '5');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(7000) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`YouTube Data API error ${res.status}: ${errBody.slice(0, 160)}`);
  }

  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return { available: false };

  // Verify embeddable status via videos.list so we skip videos blocked from third-party embeds (Error 152)
  const videoIds = items.map((i) => i?.id?.videoId).filter(Boolean);
  let embeddableSet = null;
  if (videoIds.length > 0) {
    try {
      const statusUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      statusUrl.searchParams.set('part', 'status');
      statusUrl.searchParams.set('id', videoIds.join(','));
      statusUrl.searchParams.set('key', apiKey);
      const statusRes = await fetch(statusUrl.toString(), { signal: AbortSignal.timeout(5000) });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        embeddableSet = new Set(
          (statusData?.items || [])
            .filter((v) => v?.status?.embeddable === true && v?.status?.privacyStatus === 'public')
            .map((v) => v.id)
        );
      }
    } catch {
      // Proceed without status filter if videos.list times out
    }
  }

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (const item of items) {
    const vid = item?.id?.videoId;
    if (embeddableSet && !embeddableSet.has(vid)) continue;
    const candidate = {
      videoId: vid,
      title: item?.snippet?.title || '',
      description: item?.snippet?.description || '',
      channelTitle: item?.snippet?.channelTitle || '',
    };
    const s = scoreVideoCandidate(candidate, coreTokens, baseTitleLower);
    if (s > bestScore) {
      bestScore = s;
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate || bestScore < 10) {
    return { available: false };
  }

  return buildVideoPayload(bestCandidate);
}

function extractBestVideoFromHtml(html, coreTokens, baseTitleLower) {
  const marker = 'var ytInitialData = ';
  const startIdx = html.indexOf(marker);
  const candidates = [];

  if (startIdx !== -1) {
    const jsonStart = startIdx + marker.length;
    const endIdx = html.indexOf(';</script>', jsonStart);
    if (endIdx !== -1) {
      try {
        const data = JSON.parse(html.slice(jsonStart, endIdx));
        const sections =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
            ?.contents || [];
        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const vr = item?.videoRenderer;
            if (vr?.videoId) {
              candidates.push({
                videoId: vr.videoId,
                title: vr.title?.runs?.map((r) => r.text).join('') || '',
                description:
                  vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join('') ||
                  '',
                channelTitle:
                  vr.ownerText?.runs?.map((r) => r.text).join('') ||
                  vr.longBylineText?.runs?.map((r) => r.text).join('') ||
                  '',
              });
              if (candidates.length >= 6) break;
            }
          }
          if (candidates.length >= 6) break;
        }
      } catch {
        // Fallback below
      }
    }
  }

  let bestCandidate = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreVideoCandidate(c, coreTokens, baseTitleLower);
    if (s > bestScore) {
      bestScore = s;
      bestCandidate = c;
    }
  }

  if (bestCandidate && bestScore >= 10) {
    return buildVideoPayload(bestCandidate);
  }

  return { available: false };
}

async function searchViaPublicScrape(query, coreTokens, baseTitleLower) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!res.ok) {
    throw new Error(`YouTube search returned ${res.status}`);
  }
  const html = await res.text();
  return extractBestVideoFromHtml(html, coreTokens, baseTitleLower);
}

/**
 * Find an embeddable YouTube video for a given recipe title and optional cuisine.
 * Never throws; returns `{ available: false }` if unavailable.
 */
export async function findRecipeYouTubeVideo({ title, cuisine = '' }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return { available: false };

  const baseTitle = normalizeDishTitle(cleanTitle) || cleanTitle;
  const baseTitleLower = baseTitle.toLowerCase();
  const coreTokens = extractCoreTokens(baseTitle);
  const query = buildSearchQuery(baseTitle, cuisine);
  const cacheKey = `${baseTitleLower}|${String(cuisine || '').trim().toLowerCase()}`;

  if (videoCache.has(cacheKey)) {
    return videoCache.get(cacheKey);
  }

  let result = { available: false };
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        result = await searchViaYouTubeApi(query, apiKey, coreTokens, baseTitleLower);
      } catch (apiErr) {
        console.warn(`[YouTube] API lookup failed, falling back to search:`, apiErr.message);
        result = await searchViaPublicScrape(query, coreTokens, baseTitleLower);
      }
    } else {
      result = await searchViaPublicScrape(query, coreTokens, baseTitleLower);
    }
  } catch (err) {
    console.warn(`[YouTube] Lookup failed for "${cleanTitle}":`, err.message);
    result = { available: false };
  }

  setCache(cacheKey, result);
  return result;
}

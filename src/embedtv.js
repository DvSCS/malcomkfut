// ── EmbedTV.cc HLS stream extractor ────────────────────────────────
// Fetches embed pages, digs through iframes and scripts to find the
// actual .m3u8 playlist URL that Stremio can play natively.

const EMBED_BASE = 'https://embedtv.cc';
const CACHE_TTL = 5 * 60_000;          // 5 min – m3u8 URLs rotate
const FETCH_TIMEOUT = 10_000;
const MAX_IFRAME_DEPTH = 2;            // follow up to 2 iframe levels

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ── Regex arsenal ───────────────────────────────────────────────────
// Order matters: more specific first
const M3U8_PATTERNS = [
  // Player libraries
  /(?:loadSource|src|source|file|url|video_url|stream_url|hls_url)\s*[:=(]\s*["']([^"'\s]+\.m3u8[^"'\s]*?)["']/gi,
  // Generic JS assignment
  /[A-Za-z_$][\w$]*\s*=\s*["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*?)["']/gi,
  // Bare m3u8 URLs in quotes
  /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*?)["']/gi,
];

const IFRAME_RE = /<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi;

// ── Internals ───────────────────────────────────────────────────────
const cache = new Map();

function abs(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

async function grab(url, referer, fetchFn) {
  const res = await fetchFn(url, {
    headers: {
      'user-agent': UA,
      referer: referer || url,
      accept: 'text/html,application/xhtml+xml,*/*',
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  return { body: await res.text(), finalUrl: res.url || url };
}

function findM3u8(html) {
  const found = new Set();
  for (const re of M3U8_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html))) {
      const u = m[1];
      if (u && /^https?:\/\//i.test(u)) found.add(u);
    }
  }
  return [...found];
}

function findIframes(html, base) {
  const out = [];
  IFRAME_RE.lastIndex = 0;
  let m;
  while ((m = IFRAME_RE.exec(html))) {
    const url = abs(m[1], base);
    if (url) out.push(url);
  }
  return out;
}

async function dig(url, referer, fetchFn, depth = 0) {
  const page = await grab(url, referer, fetchFn);
  if (!page) return [];

  // 1. Direct m3u8 in this page
  const urls = findM3u8(page.body);
  if (urls.length) return urls;

  // 2. Follow iframes (up to depth limit)
  if (depth < MAX_IFRAME_DEPTH) {
    for (const iframe of findIframes(page.body, page.finalUrl).slice(0, 4)) {
      try {
        const deeper = await dig(iframe, page.finalUrl, fetchFn, depth + 1);
        if (deeper.length) return deeper;
      } catch { /* skip */ }
    }
  }

  return [];
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Extract the live HLS (.m3u8) URL for a channel slug.
 * Returns { url, headers } or null.
 */
export async function extractStream(slug, fetchImpl = fetch) {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

  const pageUrl = `${EMBED_BASE}/${slug}`;
  try {
    const urls = await dig(pageUrl, EMBED_BASE, fetchImpl);
    const value = urls.length ? {
      url: urls[0],
      headers: { Referer: pageUrl, Origin: EMBED_BASE, 'User-Agent': UA },
    } : null;
    cache.set(slug, { value, ts: Date.now() });
    return value;
  } catch (err) {
    console.warn(`[EmbedTV] ${slug}: ${err.message}`);
    cache.set(slug, { value: null, ts: Date.now() });
    return null;
  }
}

/**
 * Extract streams for many slugs in parallel (bounded concurrency).
 * Returns Map<slug, {url, headers} | null>.
 */
export async function extractMany(slugs, { concurrency = 6, fetchImpl = fetch } = {}) {
  const results = new Map();
  let idx = 0;
  async function worker() {
    while (idx < slugs.length) {
      const slug = slugs[idx++];
      results.set(slug, await extractStream(slug, fetchImpl));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, slugs.length) }, worker));
  return results;
}

export function clearCache() { cache.clear(); }
export { EMBED_BASE };

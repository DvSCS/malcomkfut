import { readFileSync } from 'node:fs';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
});

const backgrounds = {
  poster: `data:image/jpeg;base64,${readFileSync(new URL('../assets/stadium-portrait.jpg', import.meta.url)).toString('base64')}`,
  background: `data:image/jpeg;base64,${readFileSync(new URL('../assets/stadium-wide.jpg', import.meta.url)).toString('base64')}`
};

function color(hex, fallback) {
  return /^[0-9a-f]{6}$/i.test(hex || '') ? `#${hex}` : fallback;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function initials(value) {
  return String(value || '').split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase();
}

function shield(x, y, size, logo, abbr, accent) {
  const w = size;
  const h = size * 1.13;
  const inset = size * .06;
  const outer = `M ${x + w * .11} ${y} H ${x + w * .89} L ${x + w} ${y + h * .12} V ${y + h * .66} Q ${x + w * .97} ${y + h * .81} ${x + w * .5} ${y + h} Q ${x + w * .03} ${y + h * .81} ${x} ${y + h * .66} V ${y + h * .12} Z`;
  const inner = `M ${x + w * .13} ${y + inset} H ${x + w * .87} L ${x + w - inset} ${y + h * .15} V ${y + h * .64} Q ${x + w * .92} ${y + h * .76} ${x + w * .5} ${y + h - inset} Q ${x + w * .08} ${y + h * .76} ${x + inset} ${y + h * .64} V ${y + h * .15} Z`;
  const logoSize = size * .72;
  const centerX = x + size / 2;
  const mark = logo
    ? `<image href="${logo}" x="${centerX - logoSize / 2}" y="${y + h * .16}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${centerX}" y="${y + h * .53}" text-anchor="middle" fill="#122147" font-family="Arial,sans-serif" font-size="${size * .31}" font-weight="900">${escapeXml(initials(abbr))}</text>`;
  return `<path d="${outer}" fill="${accent}" opacity=".95"/><path d="${inner}" fill="#f8fbff"/>${mark}`;
}

export function artSvg(match, kind, logos = {}) {
  const portrait = kind === 'poster';
  const width = portrait ? 600 : 1280;
  const height = portrait ? 900 : 720;
  const teamSize = portrait ? 206 : 245;
  const leftX = portrait ? 38 : 180;
  const rightX = portrait ? 356 : 855;
  const teamY = portrait ? 239 : 205;
  const homeColor = color(match.homeColor, '#1064b8');
  const awayColor = color(match.awayColor, '#61359b');
  const time = escapeXml(timeFormatter.format(new Date(match.date)));
  const pillX = portrait ? 145 : 490;
  const pillY = portrait ? 632 : 564;
  const pillW = portrait ? 310 : 300;
  const pillH = portrait ? 96 : 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="teamTint" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${homeColor}" stop-opacity=".36"/><stop offset="50%" stop-color="#071a40" stop-opacity=".08"/><stop offset="100%" stop-color="${awayColor}" stop-opacity=".36"/></linearGradient>
      <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#030817" stop-opacity="0"/><stop offset="100%" stop-color="#030817" stop-opacity=".58"/></linearGradient>
    </defs>
    <image href="${backgrounds[kind]}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${width}" height="${height}" fill="url(#teamTint)"/>
    <rect y="${height * .52}" width="${width}" height="${height * .48}" fill="url(#bottomFade)"/>
    ${shield(leftX, teamY, teamSize, logos.home, match.homeAbbr || match.home, homeColor)}
    ${shield(rightX, teamY, teamSize, logos.away, match.awayAbbr || match.away, awayColor)}
    <text x="${width / 2}" y="${portrait ? 370 : 345}" text-anchor="middle" fill="#facb4d" stroke="#13204b" stroke-width="${portrait ? 5 : 7}" paint-order="stroke" font-family="Arial,sans-serif" font-size="${portrait ? 58 : 70}" font-weight="900">VS</text>
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${portrait ? 24 : 22}" fill="#06122d" fill-opacity=".86" stroke="#f5c64b" stroke-width="2"/>
    <text x="${width / 2}" y="${pillY + (portrait ? 69 : 66)}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${portrait ? 68 : 65}" font-weight="800" letter-spacing="2">${time}</text>
  </svg>`;
}

async function fetchImage(url, fetchImpl = fetch) {
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const espn = parsed.hostname === 'a.espncdn.com' && parsed.pathname.startsWith('/i/teamlogos/soccer/');
  const sportsdb = ['www.thesportsdb.com', 'r2.thesportsdb.com'].includes(parsed.hostname) && parsed.pathname.startsWith('/images/media/team/');
  if (parsed.protocol !== 'https:' || (!espn && !sportsdb)) return null;
  try {
    const response = await fetchImpl(parsed, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim();
    if (!['image/png', 'image/jpeg'].includes(mime)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 300_000) return null;
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch { return null; }
}

function normalName(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(fc|sc|cf|club|clube|football|futebol)\b/g, '').replace(/[^a-z0-9]/g, '');
}

async function sportsDbBadge(name, espnId, fetchImpl = fetch) {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(name)}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json();
    const team = data.teams?.[0];
    if (!team || team.strSport !== 'Soccer') return null;
    const sameId = espnId && String(team.idESPN) === String(espnId);
    const sameName = normalName(team.strTeam) === normalName(name);
    if (!sameId && !sameName) return null;
    return fetchImage(team.strBadge, fetchImpl);
  } catch { return null; }
}

const logoCache = new Map();
export async function resolveLogo(name, espnId, espnUrl, fetchImpl = fetch) {
  const key = `${espnId || ''}:${name}`;
  if (logoCache.has(key)) return logoCache.get(key);
  const promise = (async () => {
    const direct = await fetchImage(espnUrl, fetchImpl);
    if (direct) return direct;
    if (/^\d+$/.test(String(espnId || ''))) {
      const inferred = await fetchImage(`https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`, fetchImpl);
      if (inferred) return inferred;
    }
    return sportsDbBadge(name, espnId, fetchImpl);
  })();
  logoCache.set(key, promise);
  return promise;
}

export async function renderArtwork(match, kind) {
  const [home, away] = await Promise.all([
    resolveLogo(match.home, match.homeId, match.homeLogo),
    resolveLogo(match.away, match.awayId, match.awayLogo)
  ]);
  const { Resvg } = await import('@resvg/resvg-js');
  const { default: sharp } = await import('sharp');
  const rendered = new Resvg(artSvg(match, kind, { home, away }), {
    fitTo: { mode: 'width', value: portraitWidth(kind) },
    font: { loadSystemFonts: true }
  }).render().asPng();
  return sharp(rendered).resize({ width: kind === 'poster' ? 320 : 960 })
    .png({ palette: true, colours: kind === 'poster' ? 128 : 256, effort: 8 }).toBuffer();
}

function portraitWidth(kind) { return kind === 'poster' ? 400 : 960; }

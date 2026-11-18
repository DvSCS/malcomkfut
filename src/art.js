const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
});

function teamColor(hex, fallback) {
  if (!/^[0-9a-f]{6}$/i.test(hex || '')) return fallback;
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  const dark = [9, 17, 22];
  return `#${channels.map((channel, index) => Math.round(channel * .42 + dark[index] * .58).toString(16).padStart(2, '0')).join('')}`;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function initials(name) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase();
}

function teamMark(cx, cy, radius, name, logoData) {
  const imageSize = radius * 1.48;
  const logo = logoData
    ? `<image href="${logoData}" x="${cx - imageSize / 2}" y="${cy - imageSize / 2}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${cx}" y="${cy + radius * .18}" text-anchor="middle" fill="#172020" font-family="Arial,sans-serif" font-size="${radius * .58}" font-weight="700">${escapeXml(initials(name))}</text>`;
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#fff" fill-opacity=".96"/>${logo}`;
}

export function artSvg(match, kind, logos = {}) {
  const portrait = kind === 'poster';
  const width = portrait ? 600 : 1280;
  const height = portrait ? 900 : 720;
  const left = portrait ? 158 : 344;
  const right = portrait ? 442 : 936;
  const centerY = portrait ? 350 : 300;
  const radius = portrait ? 100 : 142;
  const vsY = centerY + (portrait ? 12 : 16);
  const timeY = portrait ? 592 : 585;
  const time = escapeXml(timeFormatter.format(new Date(match.date)));
  const homeColor = teamColor(match.homeColor, '#183d32');
  const awayColor = teamColor(match.awayColor, '#233e5a');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="teams" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${homeColor}"/><stop offset="100%" stop-color="${awayColor}"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#teams)"/>
    ${teamMark(left, centerY, radius, match.home, logos.home)}
    ${teamMark(right, centerY, radius, match.away, logos.away)}
    <text x="${width / 2}" y="${vsY}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${portrait ? 36 : 48}" font-weight="700">VS</text>
    <text x="${width / 2}" y="${timeY}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${portrait ? 76 : 84}" font-weight="700">${time}</text>
  </svg>`;
}

const logoCache = new Map();
async function logo(url) {
  if (!url || !/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\//.test(url)) return null;
  if (logoCache.has(url)) return logoCache.get(url);
  const promise = fetch(url, { signal: AbortSignal.timeout(4000) }).then(async response => {
    if (!response.ok || !/image\/png/.test(response.headers.get('content-type') || '')) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length < 120_000 ? `data:image/png;base64,${bytes.toString('base64')}` : null;
  }).catch(() => null);
  logoCache.set(url, promise);
  return promise;
}

export async function renderArtwork(match, kind) {
  const [home, away] = await Promise.all([logo(match.homeLogo), logo(match.awayLogo)]);
  const { Resvg } = await import('@resvg/resvg-js');
  const svg = artSvg(match, kind, { home, away });
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: kind === 'poster' ? 400 : 960 },
    font: { loadSystemFonts: true }
  }).render().asPng();
}

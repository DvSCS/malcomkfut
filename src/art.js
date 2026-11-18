import { localDay } from './football.js';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', weekday: 'short'
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
});

function safe(value, max = 42) {
  return String(value ?? '').slice(0, max).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function color(value, fallback) {
  return /^[0-9a-f]{6}$/i.test(value || '') ? `#${value}` : fallback;
}

function shortName(name, max = 18) {
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}

function crest(x, y, size, name, logoData, accent) {
  const radius = Math.round(size * .18);
  const inner = logoData
    ? `<image href="${logoData}" x="${x + 20}" y="${y + 20}" width="${size - 40}" height="${size - 40}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${x + size / 2}" y="${y + size / 2 + 14}" text-anchor="middle" fill="#e9f5ee" font-family="Arial,sans-serif" font-size="42" font-weight="800">${safe(name.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</text>`;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="#10211e" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>${inner}`;
}

function sharedDefs(w, h, home, away) {
  const homeColor = color(home, '#2e8d6a');
  const awayColor = color(away, '#2b678a');
  return `<defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06130f"/><stop offset=".54" stop-color="#102a24"/><stop offset="1" stop-color="#071814"/></linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${homeColor}" stop-opacity=".44"/><stop offset=".55" stop-color="#0e3228" stop-opacity="0"/><stop offset="1" stop-color="${awayColor}" stop-opacity=".42"/></linearGradient>
    <pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0H1 M5 5H6" stroke="#fff" stroke-opacity=".055"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#base)"/><rect width="${w}" height="${h}" fill="url(#glow)"/><rect width="${w}" height="${h}" fill="url(#grain)"/>
  <path d="M${Math.round(w * .65)} 0 L${Math.round(w * .35)} ${h} M${Math.round(w * .82)} 0 L${Math.round(w * .52)} ${h}" stroke="#9ee7c4" stroke-opacity=".08" stroke-width="2"/>
  <circle cx="${Math.round(w * .5)}" cy="${Math.round(h * .46)}" r="${Math.round(w * .38)}" fill="none" stroke="#bcead2" stroke-opacity=".07" stroke-width="2"/>`;
}

function label(match) {
  if (match.state === 'in') return 'AO VIVO';
  if (match.state === 'post') return 'ENCERRADO';
  return 'EM BREVE';
}

function mainValue(match) {
  return match.state === 'pre' ? timeFormatter.format(new Date(match.date)) : `${match.homeScore ?? '–'}  :  ${match.awayScore ?? '–'}`;
}

export function artSvg(match, kind, logos = {}) {
  const portrait = kind === 'poster';
  const w = portrait ? 600 : 1280;
  const h = portrait ? 900 : 720;
  const day = dateFormatter.format(new Date(match.date)).replaceAll('.', '').toLocaleUpperCase('pt-BR');
  const league = safe(shortName(match.leagueName === 'all' ? 'FUTEBOL INTERNACIONAL' : match.leagueName.toLocaleUpperCase('pt-BR'), portrait ? 29 : 47));
  const home = safe(shortName(match.home, portrait ? 18 : 26));
  const away = safe(shortName(match.away, portrait ? 18 : 26));
  const value = safe(mainValue(match));
  const badge = safe(label(match));
  const homeAccent = color(match.homeColor, '#73be95');
  const awayAccent = color(match.awayColor, '#6b9fbc');
  const top = portrait
    ? `<rect x="38" y="38" width="7" height="35" rx="3" fill="#b8f794"/><text x="62" y="65" fill="#e6fff1" font-family="Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="2">FUTEBOL HOJE</text><text x="40" y="128" fill="#9ec4b3" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2">${league}</text><line x1="40" y1="152" x2="560" y2="152" stroke="#97bda9" stroke-opacity=".32"/>`
    : `<rect x="58" y="48" width="7" height="36" rx="3" fill="#b8f794"/><text x="82" y="76" fill="#e6fff1" font-family="Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="3">FUTEBOL HOJE</text><text x="60" y="124" fill="#9ec4b3" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2">${league}</text><line x1="60" y1="149" x2="1220" y2="149" stroke="#97bda9" stroke-opacity=".32"/>`;
  const body = portrait
    ? `${crest(54, 220, 204, match.home, logos.home, homeAccent)}${crest(342, 220, 204, match.away, logos.away, awayAccent)}
      <text x="300" y="341" text-anchor="middle" fill="#b5d5c0" font-family="Arial,sans-serif" font-size="28" font-weight="700">×</text>
      <text x="156" y="464" text-anchor="middle" fill="#f2fff5" font-family="Arial,sans-serif" font-size="21" font-weight="700">${home}</text>
      <text x="444" y="464" text-anchor="middle" fill="#f2fff5" font-family="Arial,sans-serif" font-size="21" font-weight="700">${away}</text>
      <text x="300" y="568" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="73" font-weight="800" letter-spacing="-2">${value}</text>
      <text x="300" y="611" text-anchor="middle" fill="#9db8ac" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="2">HORÁRIO DE BRASÍLIA</text>`
    : `${crest(240, 184, 212, match.home, logos.home, homeAccent)}${crest(828, 184, 212, match.away, logos.away, awayAccent)}
      <text x="640" y="314" text-anchor="middle" fill="#b5d5c0" font-family="Arial,sans-serif" font-size="38" font-weight="700">×</text>
      <text x="346" y="442" text-anchor="middle" fill="#f2fff5" font-family="Arial,sans-serif" font-size="30" font-weight="700">${home}</text>
      <text x="934" y="442" text-anchor="middle" fill="#f2fff5" font-family="Arial,sans-serif" font-size="30" font-weight="700">${away}</text>
      <text x="640" y="480" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="68" font-weight="800" letter-spacing="-2">${value}</text>`;
  const bottomY = portrait ? 704 : 578;
  const footer = `<line x1="${portrait ? 40 : 60}" y1="${bottomY}" x2="${portrait ? 560 : 1220}" y2="${bottomY}" stroke="#a7d9b3" stroke-opacity=".4"/>
    <text x="${portrait ? 40 : 60}" y="${bottomY + 54}" fill="#dff3e3" font-family="Arial,sans-serif" font-size="${portrait ? 23 : 26}" font-weight="800">${safe(day)}</text>
    <rect x="${portrait ? 410 : 1046}" y="${bottomY + 21}" width="${portrait ? 150 : 174}" height="44" rx="22" fill="${match.state === 'in' ? '#b8f794' : '#1e3d31'}"/>
    <text x="${portrait ? 485 : 1133}" y="${bottomY + 51}" text-anchor="middle" fill="${match.state === 'in' ? '#082011' : '#bbdcca'}" font-family="Arial,sans-serif" font-size="${portrait ? 16 : 18}" font-weight="800" letter-spacing="1">${badge}</text>
    <text x="${portrait ? 40 : 60}" y="${bottomY + 112}" fill="#819f91" font-family="Arial,sans-serif" font-size="${portrait ? 16 : 18}" font-weight="700" letter-spacing="2">${safe(localDay(new Date(match.date)))} · BRASÍLIA</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${sharedDefs(w, h, match.homeColor, match.awayColor)}${top}${body}${footer}</svg>`;
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

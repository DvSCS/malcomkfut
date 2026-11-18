import { extractMany, EMBED_BASE } from './embedtv.js';

const BRAZIL_GUIDE = 'https://sports.justwatch.com/br/futebol/campeonato-brasileiro';
const WORLD_GUIDE = 'https://sports.justwatch.com/br/futebol';
const CBF_SERIE_A = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026?documento=Tabela+Detalhada';
const UEFA_CHAMPIONS = 'https://pt.uefa.com/uefachampionsleague/news/0257-0e9532e6bd9d-f0435ad3b137-1000--onde-ver-a-uefa-champions-league-parceiros-tv-e-streams-/';

// ── EmbedTV channel catalog ─────────────────────────────────────────
const CH = {
  // Premiere (PPV futebol brasileiro)
  premiere1:   { name: 'Premiere 1',   slug: 'premiere1',   icon: '📺' },
  premiere2:   { name: 'Premiere 2',   slug: 'premiere2',   icon: '📺' },
  premiere3:   { name: 'Premiere 3',   slug: 'premiere3',   icon: '📺' },
  premiere4:   { name: 'Premiere 4',   slug: 'premiere4',   icon: '📺' },
  premiere5:   { name: 'Premiere 5',   slug: 'premiere5',   icon: '📺' },
  premiere6:   { name: 'Premiere 6',   slug: 'premiere6',   icon: '📺' },
  premiere7:   { name: 'Premiere 7',   slug: 'premiere7',   icon: '📺' },
  premiere8:   { name: 'Premiere 8',   slug: 'premiere8',   icon: '📺' },
  // SporTV
  sportv:      { name: 'SporTV',       slug: 'sportv',      icon: '🏟️' },
  sportv2:     { name: 'SporTV 2',     slug: 'sportv2',     icon: '🏟️' },
  sportv3:     { name: 'SporTV 3',     slug: 'sportv3',     icon: '🏟️' },
  // ESPN
  espn:        { name: 'ESPN',         slug: 'espn',        icon: '🌐' },
  espn2:       { name: 'ESPN 2',       slug: 'espn2',       icon: '🌐' },
  espn3:       { name: 'ESPN 3',       slug: 'espn3',       icon: '🌐' },
  espn4:       { name: 'ESPN 4',       slug: 'espn4',       icon: '🌐' },
  espnextra:   { name: 'ESPN Extra',   slug: 'espnextra',   icon: '🌐' },
  // Globo / TV aberta
  globosp:     { name: 'Globo SP',     slug: 'globosp',     icon: '📡' },
  globorj:     { name: 'Globo RJ',     slug: 'globorj',     icon: '📡' },
  // Band
  band:        { name: 'Band',         slug: 'band',        icon: '📡' },
  bandsports:  { name: 'Band Sports',  slug: 'bandsports',  icon: '📡' },
  // CazéTV
  cazetv:      { name: 'CazéTV',       slug: 'cazetv',      icon: '🎙️' },
  // Paramount+
  paramount:   { name: 'Paramount+',   slug: 'paramountplus', icon: '⭐' },
  // Record
  record:      { name: 'Record TV',    slug: 'record',      icon: '📡' },
  // TNT Sports
  tntsports:   { name: 'TNT Sports',   slug: 'tntsports',   icon: '🌐' },
};

// ── League → channel mapping ────────────────────────────────────────
const LEAGUE_CHANNELS = {
  'bra.1':                 ['premiere1','premiere2','premiere3','premiere4','premiere5',
                            'premiere6','premiere7','premiere8','sportv','globosp','globorj'],
  'bra.2':                 ['premiere1','premiere2','premiere3','premiere4','sportv','sportv2','band'],
  'bra.copa_do_brazil':    ['globosp','globorj','sportv','sportv2','premiere1','premiere2','paramount'],
  'conmebol.libertadores': ['paramount','espn','espn2','sportv'],
  'conmebol.sudamericana': ['paramount','espn','espn2','sportv'],
  'uefa.champions':        ['tntsports','cazetv','espn'],
  'uefa.europa':           ['espn','espn2','espn3'],
  'uefa.europa.conf':      ['espn','espn2'],
  'eng.1':                 ['espn','espn2','espn3','espn4','espnextra'],
  'eng.2':                 ['espn','espn2'],
  'eng.fa':                ['espn','espn2'],
  'esp.1':                 ['espn','espn2','espn3','espn4'],
  'ger.1':                 ['cazetv','band','bandsports'],
  'ita.1':                 ['espn','espn2','espn3','espn4'],
  'fra.1':                 ['cazetv'],
  'por.1':                 ['espn','espn2'],
  'ned.1':                 ['espn','espn4'],
  'usa.1':                 ['espn','espn2'],
  'mex.1':                 ['paramount','espn'],
  'arg.1':                 ['espn','espn2','espn3'],
  'fifa.world':            ['globosp','globorj','sportv','sportv2','sportv3','cazetv'],
};

const DEFAULT_CHANNELS = ['espn', 'espn2', 'sportv'];

function channelsFor(match) {
  return LEAGUE_CHANNELS[match.league] || DEFAULT_CHANNELS;
}

// ── Public API ──────────────────────────────────────────────────────

export function watchGuide(match) {
  return /^bra\.[1234]$/.test(match.league) ? BRAZIL_GUIDE : WORLD_GUIDE;
}

export function watchLinks(match) {
  const links = [
    { name: 'Onde assistir no Brasil · JustWatch', category: 'Transmissão', url: watchGuide(match) }
  ];
  if (match.league === 'bra.1') {
    links.push({ name: 'Tabela e transmissão · CBF', category: 'Transmissão', url: CBF_SERIE_A });
    links.push({ name: 'Premiere · programação oficial', category: 'Canais da competição', url: 'https://globoplay.globo.com/canais/premiere/' });
    links.push({ name: 'ge tv · canal oficial', category: 'Canais da competição', url: 'https://ge.globo.com/getv/' });
  }
  if (match.league === 'uefa.champions') {
    links.push({ name: 'Parceiros de TV · UEFA', category: 'Transmissão', url: UEFA_CHAMPIONS });
  }
  // EmbedTV channel links (for the meta page)
  for (const key of channelsFor(match)) {
    const ch = CH[key];
    if (ch) links.push({ name: `${ch.icon} ${ch.name} · EmbedTV`, category: 'Transmissão ao vivo', url: `${EMBED_BASE}/${ch.slug}` });
  }
  return links;
}

/**
 * Returns Stremio-compatible streams with PLAYABLE m3u8 URLs.
 * Streams play directly inside Stremio — no browser redirect.
 * Falls back to externalUrl when HLS extraction fails.
 */
export async function watchStreams(match) {
  const keys = channelsFor(match);
  const slugs = keys.map(k => CH[k]?.slug).filter(Boolean);

  // Extract all HLS streams in parallel
  const extracted = await extractMany(slugs);

  const streams = [];

  for (const key of keys) {
    const ch = CH[key];
    if (!ch) continue;

    const result = extracted.get(ch.slug);

    if (result?.url) {
      // ✅ Direct HLS stream — plays inside Stremio
      streams.push({
        url: result.url,
        name: `${ch.icon} ${ch.name}`,
        description: `Ao vivo · ${ch.name} via EmbedTV`,
        behaviorHints: {
          notWebReady: true,
          bingeGroup: `embedtv-${match.league}`,
          proxyHeaders: {
            request: result.headers,
          },
        },
      });
    } else {
      // ⚠️ Fallback — opens embed page in browser
      streams.push({
        externalUrl: `${EMBED_BASE}/${ch.slug}`,
        name: `${ch.icon} ${ch.name} (web)`,
        description: `Abre ${ch.name} no navegador · EmbedTV`,
      });
    }
  }

  // Always keep the official guide at the end
  streams.push({
    externalUrl: watchGuide(match),
    name: '📋 Guia oficial de transmissão',
    description: 'Confira onde assistir legalmente no Brasil',
  });

  return streams;
}

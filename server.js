import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createProvider } from './src/provider.js';
import { isBrazil, meta, parseMatchId, preview } from './src/football.js';
import { renderArtwork } from './src/art.js';
import { watchLinks, watchStreams } from './src/availability.js';

const provider = createProvider();
const manifest = {
  id: 'community.futebolhoje.catalogo',
  version: '2.0.0',
  name: 'Futebol Hoje',
  description: 'Jogos de futebol de hoje com transmissão ao vivo direto no player. Premiere, SporTV, ESPN, Globo, CazéTV e mais via EmbedTV.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie'],
  idPrefixes: ['futebolhoje:'],
  catalogs: [
    { type: 'movie', id: 'futebol-hoje', name: '⚽ Futebol · Jogos de Hoje' },
    { type: 'movie', id: 'brasileirao-hoje', name: '🇧🇷 Brasileirão · Jogos de Hoje' }
  ],
  behaviorHints: { configurable: false, configurationRequired: false }
};

function json(res, status, value, cache = 0) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': cache ? `public, max-age=${cache}` : 'no-store'
  });
  res.end(JSON.stringify(value));
}

function html(res, origin) {
  const manifestUrl = `${origin}/manifest.json`;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Futebol Hoje · Addon</title><style>body{font:18px system-ui;background:#101c18;color:#f4fff6;max-width:650px;margin:12vh auto;padding:0 24px}a{color:#9affaa}code{overflow-wrap:anywhere;background:#203a2b;padding:8px;border-radius:5px}p{line-height:1.5}</style><h1>⚽ Futebol Hoje</h1><p>Jogos do dia e do Brasileirão para Stremio e Nuvio, com capas dos times, horários de Brasília e links para consultar transmissões oficiais.</p><p>Copie o endereço abaixo e adicione como addon:</p><p><code>${manifestUrl}</code></p><p><a href="stremio://${manifestUrl.replace(/^https?:\/\//, '')}">Instalar no Stremio</a></p><p>Os links abrem guias e plataformas oficiais; a disponibilidade de cada jogo depende dos direitos de transmissão.</p></html>`);
}

const artCache = new Map();
function getOrigin(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return `${proto}://${host}`;
}

async function findMatch(dataProvider, id) {
  const parsed = parseMatchId(id);
  if (!parsed) return null;
  const day = `${parsed.day.slice(0, 4)}-${parsed.day.slice(4, 6)}-${parsed.day.slice(6)}`;
  const { matches } = await dataProvider.get(day);
  return matches.find(match => match.id === parsed.eventId) || null;
}

export function createServer(dataProvider = provider, artworkRenderer = renderArtwork) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': '*' });
      return res.end();
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    try {
      if (path === '/health') return json(res, 200, { status: 'ok' });
      if (path === '/manifest.json') return json(res, 200, manifest, 300);
      if (path === '/') {
        return html(res, getOrigin(req));
      }
      const catalogMatch = /^\/catalog\/movie\/(futebol-hoje|brasileirao-hoje)(?:\/[^/]*)?\.json$/.exec(path);
      if (catalogMatch) {
        const { matches } = await dataProvider.get();
        const selected = catalogMatch[1] === 'brasileirao-hoje' ? matches.filter(isBrazil) : matches;
        return json(res, 200, { metas: selected.map(match => preview(match, getOrigin(req))) }, 300);
      }
      const artMatch = /^\/art\/(poster|background)\/(futebolhoje:[a-z0-9._]+:\d{8}:\d+)\.png$/.exec(path);
      if (artMatch) {
        const match = await findMatch(dataProvider, artMatch[2]);
        if (!match) return json(res, 404, { error: 'Jogo não encontrado' });
        const key = `${artMatch[1]}:${artMatch[2]}:${match.state}:${match.homeScore}:${match.awayScore}`;
        let png = artCache.get(key);
        if (!png) {
          png = await artworkRenderer(match, artMatch[1]);
          if (artCache.size >= 200) artCache.clear();
          artCache.set(key, png);
        }
        res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' });
        return res.end(png);
      }
      const metaMatch = /^\/meta\/movie\/(futebolhoje:[a-z0-9._]+:\d{8}:\d+)\.json$/.exec(path);
      if (metaMatch) {
        const match = await findMatch(dataProvider, metaMatch[1]);
        return match ? json(res, 200, { meta: { ...meta(match, getOrigin(req)), links: watchLinks(match) } }, 60) : json(res, 404, { error: 'Jogo não encontrado' });
      }
      const streamMatch = /^\/stream\/movie\/(futebolhoje:[a-z0-9._]+:\d{8}:\d+)\.json$/.exec(path);
      if (streamMatch) {
        const match = await findMatch(dataProvider, streamMatch[1]);
        return match ? json(res, 200, { streams: await watchStreams(match) }, 60) : json(res, 404, { error: 'Jogo não encontrado' });
      }
      return json(res, 404, { error: 'Recurso não encontrado' });
    } catch (error) {
      console.error(error);
      return json(res, 503, { error: 'Não foi possível consultar os jogos agora' });
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '0.0.0.0', () => console.log(`Futebol Hoje na porta ${port}`));
}

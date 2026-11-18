import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createProvider } from '../src/provider.js';
import { isBrazil, localDay, matchId, mergeEvents, parseMatchId } from '../src/football.js';
import { artSvg, resolveLogo } from '../src/art.js';
import { extractStream, clearCache } from '../src/embedtv.js';

function event(id, date, league = 'bra.1') {
  return {
    id, date, league: { slug: league, name: 'Brasileirão Série A' },
    status: { type: { state: 'pre', description: 'Scheduled' } },
    competitions: [{ competitors: [
      { homeAway: 'home', team: { displayName: 'Flamengo', logo: 'https://example.com/fla.png' } },
      { homeAway: 'away', team: { displayName: 'Palmeiras', logo: 'https://example.com/pal.png' } }
    ] }]
  };
}

test('filtra pela data brasileira, remove duplicatas e conserva o ID local', () => {
  const e = event('42', '2026-11-19T01:00:00Z');
  const matches = mergeEvents([{ league: 'all', events: [e] }, { league: 'bra.1', events: [e] }], '2026-11-18');
  assert.equal(localDay(new Date(e.date)), '2026-11-18');
  assert.equal(matches.length, 1);
  assert.equal(isBrazil(matches[0]), true);
  assert.deepEqual(parseMatchId(matchId(matches[0])), { league: 'bra.1', day: '20261118', eventId: '42' });
});

test('consulta os dois dias UTC, usa cache e entrega catálogo e detalhes com streams jogáveis', async () => {
  let calls = 0;
  const provider = createProvider({
    leagues: ['bra.1'], now: () => new Date('2026-11-18T15:00:00Z'),
    fetchImpl: async url => {
      calls++;
      return { ok: true, json: async () => ({ events: url.includes('20261119') ? [event('42', '2026-11-19T01:00:00Z')] : [] }) };
    }
  });
  const server = createServer(provider, async () => Buffer.from('png'));
  const request = path => new Promise(resolve => {
    const res = {
      writeHead(status) { this.status = status; },
      end(body) { resolve({ status: this.status, body: Buffer.isBuffer(body) ? body : JSON.parse(body) }); }
    };
    server.emit('request', { method: 'GET', url: path, headers: {} }, res);
  });
  const manifest = (await request('/manifest.json')).body;
  assert.equal(manifest.catalogs.length, 2);
  const catalog = (await request('/catalog/movie/brasileirao-hoje.json')).body;
  assert.equal(catalog.metas.length, 1);
  assert.match(catalog.metas[0].name, /Flamengo/);
  assert.match(catalog.metas[0].poster, /\/art\/poster\/.*\.png/);
  assert.match(catalog.metas[0].background, /\/art\/background\/.*\.png/);
  const detail = await request(`/meta/movie/${catalog.metas[0].id}.json`);
  assert.equal(detail.status, 200);
  assert.match(detail.body.meta.description, /Brasília/);
  assert.ok(detail.body.meta.links.some(link => /CBF/.test(link.name)));
  assert.ok(detail.body.meta.links.some(link => /EmbedTV/.test(link.name)), 'meta links include EmbedTV channels');
  const streams = await request(`/stream/movie/${catalog.metas[0].id}.json`);
  assert.equal(streams.status, 200);
  assert.ok(streams.body.streams.length > 1, 'returns multiple streams');
  // Last stream is always the official guide fallback
  const last = streams.body.streams[streams.body.streams.length - 1];
  assert.match(last.externalUrl, /justwatch\.com/);
  // All EmbedTV streams should have either url (HLS) or externalUrl (fallback)
  for (const s of streams.body.streams.slice(0, -1)) {
    assert.ok(s.url || s.externalUrl, `stream "${s.name}" must have url or externalUrl`);
  }
  const art = await request(`/art/poster/${catalog.metas[0].id}.png`);
  assert.equal(art.status, 200);
  assert.equal(calls, 2);
});

test('extrator EmbedTV encontra m3u8 em HTML simples', async () => {
  clearCache();
  const fakeHtml = `<html><body><script>
    var player = new Clappr.Player({source: "https://cdn.example.com/live/stream.m3u8?token=abc123"});
  </script></body></html>`;

  const mockFetch = async (url, opts) => ({
    ok: true,
    url,
    text: async () => fakeHtml,
  });

  const result = await extractStream('testchannel', mockFetch);
  assert.ok(result, 'should extract stream');
  assert.match(result.url, /\.m3u8/);
  assert.match(result.url, /cdn\.example\.com/);
  assert.ok(result.headers.Referer, 'should include Referer header');
});

test('extrator EmbedTV segue iframes para achar m3u8', async () => {
  clearCache();
  const outerHtml = `<html><body><iframe src="https://player.example.com/embed/123"></iframe></body></html>`;
  const innerHtml = `<html><script>hlsPlayer.loadSource("https://hls.example.com/live/ch1/index.m3u8");</script></html>`;

  const mockFetch = async (url, opts) => {
    if (url.includes('player.example.com')) {
      return { ok: true, url, text: async () => innerHtml };
    }
    return { ok: true, url, text: async () => outerHtml };
  };

  const result = await extractStream('iframechannel', mockFetch);
  assert.ok(result, 'should extract stream from iframe');
  assert.match(result.url, /hls\.example\.com/);
  assert.match(result.url, /\.m3u8/);
});

test('extrator EmbedTV retorna null quando não acha m3u8', async () => {
  clearCache();
  const mockFetch = async () => ({
    ok: true, url: 'https://embedtv.cc/dead',
    text: async () => '<html><body>No video here</body></html>',
  });

  const result = await extractStream('deadchannel', mockFetch);
  assert.equal(result, null);
});

test('gera capa de estádio com dois escudos, VS e horário', () => {
  const match = {
    id: '1', league: 'bra.1', leagueName: 'Brasileirão Série A',
    date: '2026-11-18T22:30:00Z', home: 'Flamengo', away: 'Santos & FC',
    state: 'pre', homeColor: 'c60000', awayColor: '000000'
  };
  const poster = artSvg(match, 'poster', { home: 'data:image/png;base64,AA==', away: 'data:image/png;base64,AA==' });
  const background = artSvg(match, 'background');
  assert.match(poster, /width="600" height="900"/);
  assert.match(background, /width="1280" height="720"/);
  assert.equal((poster.match(/<image /g) || []).length, 3);
  assert.match(poster, /stadium-portrait|data:image\/jpeg;base64/);
  assert.match(poster, />VS<\/text>/);
  assert.match(poster, /19:30/);
  assert.doesNotMatch(poster, /FUTEBOL HOJE|Brasileirão|Flamengo|Santos/);
});

test('busca escudo alternativo quando a ESPN não o fornece', async () => {
  const calls = [];
  const image = Buffer.from([137, 80, 78, 71]);
  const fetchImpl = async url => {
    const address = String(url);
    calls.push(address);
    if (address.includes('espncdn')) return { ok: false };
    if (address.includes('searchteams.php')) return {
      ok: true, json: async () => ({ teams: [{ strSport: 'Soccer', strTeam: 'Clube Teste FC', idESPN: '999001', strBadge: 'https://r2.thesportsdb.com/images/media/team/badge/test.png' }] })
    };
    return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => image };
  };
  const badge = await resolveLogo('Clube Teste', '999001', null, fetchImpl);
  assert.match(badge, /^data:image\/png;base64,/);
  assert.ok(calls.some(url => url.includes('espncdn.com/i/teamlogos/soccer/500/999001.png')));
  assert.ok(calls.some(url => url.includes('thesportsdb.com/api/v1/json/123/searchteams.php')));
});

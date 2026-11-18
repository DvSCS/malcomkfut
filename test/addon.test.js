import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createProvider } from '../src/provider.js';
import { isBrazil, localDay, matchId, mergeEvents, parseMatchId } from '../src/football.js';
import { artSvg } from '../src/art.js';

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

test('consulta os dois dias UTC, usa cache e entrega catálogo e detalhes', async () => {
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
  const streams = await request(`/stream/movie/${catalog.metas[0].id}.json`);
  assert.equal(streams.status, 200);
  assert.match(streams.body.streams[0].externalUrl, /justwatch\.com/);
  const art = await request(`/art/poster/${catalog.metas[0].id}.png`);
  assert.equal(art.status, 200);
  assert.equal(calls, 2);
});

test('gera capa com duas equipes e texto escapado', () => {
  const match = {
    id: '1', league: 'bra.1', leagueName: 'Brasileirão Série A',
    date: '2026-11-18T22:30:00Z', home: 'Flamengo', away: 'Santos & FC',
    state: 'pre', homeColor: 'c60000', awayColor: '000000'
  };
  const poster = artSvg(match, 'poster');
  const background = artSvg(match, 'background');
  assert.match(poster, /width="600" height="900"/);
  assert.match(background, /width="1280" height="720"/);
  assert.match(poster, /Flamengo/);
  assert.match(poster, /Santos &amp; FC/);
  assert.match(poster, /19:30/);
});

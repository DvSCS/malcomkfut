import { LEAGUES, localDay, mergeEvents, requestedUtcDays, TIME_ZONE } from './football.js';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CACHE_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

export function createProvider({ fetchImpl = fetch, leagues = LEAGUES, now = () => new Date() } = {}) {
  const cache = new Map();
  const inFlight = new Map();

  async function fetchGroup(league, utcDay) {
    const url = `${BASE}/${encodeURIComponent(league)}/scoreboard?dates=${utcDay}&limit=1000`;
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'FutebolHojeAddon/1.0' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`ESPN ${league}: HTTP ${response.status}`);
    const data = await response.json();
    return { league, events: Array.isArray(data.events) ? data.events : [] };
  }

  async function load(day) {
    const jobs = leagues.flatMap(league => requestedUtcDays(day).map(utcDay => ({ league, utcDay })));
    const groups = [];
    let failures = 0;
    let next = 0;
    async function worker() {
      while (next < jobs.length) {
        const job = jobs[next++];
        try { groups.push(await fetchGroup(job.league, job.utcDay)); }
        catch (error) { failures++; console.warn(error.message); }
      }
    }
    await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, worker));
    if (groups.length === 0) throw new Error('Fonte de jogos indisponível');
    return { matches: mergeEvents(groups, day), failures, fetchedAt: now().toISOString() };
  }

  async function get(day = localDay(now())) {
    const cached = cache.get(day);
    if (cached && now().getTime() - new Date(cached.fetchedAt).getTime() < CACHE_MS) return cached;
    if (inFlight.has(day)) return inFlight.get(day);
    const promise = load(day).then(value => {
      cache.set(day, value);
      return value;
    }).catch(error => {
      if (cached) return { ...cached, stale: true };
      throw error;
    }).finally(() => inFlight.delete(day));
    inFlight.set(day, promise);
    return promise;
  }

  return { get, timeZone: TIME_ZONE };
}

export const TIME_ZONE = 'America/Sao_Paulo';

export const LEAGUES = [
  'all', 'bra.1', 'bra.2', 'bra.copa_do_brazil', 'conmebol.libertadores',
  'conmebol.sudamericana', 'eng.1', 'eng.2', 'eng.fa', 'esp.1', 'ger.1',
  'ita.1', 'fra.1', 'por.1', 'ned.1', 'usa.1', 'mex.1', 'arg.1', 'uefa.champions',
  'uefa.europa', 'uefa.europa.conf', 'fifa.world'
];

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});
const clockFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false
});

export function localDay(date) {
  return dayFormatter.format(date);
}

export function requestedUtcDays(localDate) {
  const base = new Date(`${localDate}T12:00:00Z`);
  return [0, 1].map(offset => {
    const date = new Date(base.getTime() + offset * 86400000);
    return date.toISOString().slice(0, 10).replaceAll('-', '');
  });
}

export function normalizeEvent(event, fallbackLeague) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find(c => c.homeAway === 'home') || competitors[0];
  const away = competitors.find(c => c.homeAway === 'away') || competitors[1];
  const date = new Date(event?.date || competition?.date);
  if (!event?.id || !home?.team || !away?.team || Number.isNaN(date.getTime())) return null;
  const league = event?.league?.slug || competition?.league?.slug || fallbackLeague;
  const status = competition?.status || event?.status || {};
  const statusType = status.type || {};
  const homeName = home.team.displayName || home.team.name || 'Mandante';
  const awayName = away.team.displayName || away.team.name || 'Visitante';
  const leagueName = event?.league?.name || competition?.league?.name || competition?.altGameNote || event?.season?.name ||
    (fallbackLeague === 'bra.1' ? 'Brasileirão Série A' : fallbackLeague);
  return {
    id: String(event.id), league, leagueName, date: date.toISOString(),
    home: homeName, away: awayName,
    homeLogo: home.team.logo || home.team.logos?.[0]?.href || null,
    awayLogo: away.team.logo || away.team.logos?.[0]?.href || null,
    homeColor: home.team.color || null, awayColor: away.team.color || null,
    homeScore: home.score ?? null, awayScore: away.score ?? null,
    status: statusType.description || statusType.shortDetail || statusType.name || 'Agendado',
    state: statusType.state || 'pre',
    venue: competition?.venue?.fullName || null,
    url: event?.links?.find(link => link.rel?.includes('summary'))?.href ||
      event?.links?.[0]?.href || null
  };
}

export function mergeEvents(groups, day) {
  const matches = new Map();
  for (const group of groups) {
    for (const event of group.events || []) {
      const match = normalizeEvent(event, group.league);
      if (!match || localDay(new Date(match.date)) !== day) continue;
      const existing = matches.get(match.id);
      if (!existing || (existing.league === 'all' && match.league !== 'all')) matches.set(match.id, match);
    }
  }
  return [...matches.values()].sort((a, b) => a.date.localeCompare(b.date) || a.home.localeCompare(b.home));
}

export function isBrazil(match) {
  return /^bra\.[1234]$/.test(match.league);
}

export function matchId(match) {
  return `futebolhoje:${match.league}:${localDay(new Date(match.date)).replaceAll('-', '')}:${match.id}`;
}

export function parseMatchId(id) {
  const match = /^futebolhoje:([a-z0-9._]+):(\d{8}):(\d+)$/.exec(id);
  return match ? { league: match[1], day: match[2], eventId: match[3] } : null;
}

export function preview(match, origin = '') {
  const time = clockFormatter.format(new Date(match.date));
  const score = match.state === 'pre' ? time : `${match.homeScore ?? '-'} × ${match.awayScore ?? '-'}`;
  return {
    id: matchId(match), type: 'movie',
    name: `${match.home} × ${match.away} · ${score}`,
    poster: origin ? `${origin}/art/poster/${matchId(match)}.png?v=clean2-${match.state}-${match.homeScore ?? ''}-${match.awayScore ?? ''}` : match.homeLogo || undefined,
    background: origin ? `${origin}/art/background/${matchId(match)}.png?v=clean2-${match.state}-${match.homeScore ?? ''}-${match.awayScore ?? ''}` : match.awayLogo || undefined,
    posterShape: 'poster',
    description: `${match.leagueName} · ${localDay(new Date(match.date))} às ${time} (Brasília) · ${match.status}`
  };
}

export function meta(match, origin = '') {
  const time = clockFormatter.format(new Date(match.date));
  const score = match.state === 'pre' ? '' : `\nPlacar: ${match.homeScore ?? '-'} × ${match.awayScore ?? '-'}`;
  return {
    ...preview(match, origin),
    releaseInfo: localDay(new Date(match.date)).slice(0, 4),
    description: `${match.home} × ${match.away}\n${match.leagueName}\n${localDay(new Date(match.date))} às ${time} (Brasília)\nStatus: ${match.status}${score}${match.venue ? `\nEstádio: ${match.venue}` : ''}${match.url ? `\nDetalhes: ${match.url}` : ''}`
  };
}

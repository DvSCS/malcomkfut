const BRAZIL_GUIDE = 'https://sports.justwatch.com/br/futebol/campeonato-brasileiro';
const WORLD_GUIDE = 'https://sports.justwatch.com/br/futebol';
const CBF_SERIE_A = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026?documento=Tabela+Detalhada';
const UEFA_CHAMPIONS = 'https://pt.uefa.com/uefachampionsleague/news/0257-0e9532e6bd9d-f0435ad3b137-1000--onde-ver-a-uefa-champions-league-parceiros-tv-e-streams-/';

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
  return links;
}

export function watchStreams(match) {
  return [{
    name: 'Onde assistir legalmente',
    description: 'Abre o guia de transmissão no Brasil. Confira a disponibilidade deste jogo e o serviço oficial.',
    externalUrl: watchGuide(match)
  }];
}

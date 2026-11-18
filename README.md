# Futebol Hoje — addon para Stremio e Nuvio

Mostra partidas do dia na tela inicial em dois catálogos: **Futebol · Jogos de Hoje** e **Brasileirão · Jogos de Hoje**. Cada partida ganha uma capa vertical e um fundo horizontal com estádio azul e violeta, taça ao fundo, escudos em destaque, `VS` e horário de Brasília. As cores dos times tingem discretamente a composição.

Os escudos vêm da ESPN; quando um time não recebe logo no placar, o addon tenta o endereço do clube na ESPN e depois a API gratuita do TheSportsDB. Se nenhuma fonte tiver imagem, mostra as iniciais do clube no espaço do escudo.

Veja as prévias reais de [capa vertical](previews/preview-poster.png) e [fundo horizontal](previews/preview-background.png).

O botão **Onde assistir legalmente** abre o guia de transmissão da JustWatch para o Brasil. Nos detalhes, o addon também mostra a tabela oficial da CBF para a Série A e canais oficiais da competição. Esses links ajudam a encontrar o detentor dos direitos; **não afirmam que uma plataforma transmite uma partida específica**. O addon não hospeda nem retransmite vídeo.

## Publicar no Render sem pagar por API

1. Envie estes arquivos para um repositório GitHub.
2. No Render, selecione **New → Blueprint** e conecte o repositório. O `render.yaml` cria um serviço web no plano `free`. Um serviço já criado pode ser atualizado com novo deploy do mesmo repositório.
3. Aguarde o deploy. Abra `https://SEU-SERVICO.onrender.com/health` e confirme `{"status":"ok"}`.
4. Instale `https://SEU-SERVICO.onrender.com/manifest.json` em **Stremio → Addons → Add addon**. No Nuvio, cole a mesma URL no campo de instalação de addon Stremio.

O endereço raiz do serviço também mostra a URL para copiar e um botão de instalação no Stremio.

### Atualizar uma instalação existente

Envie os arquivos atualizados para **o mesmo repositório** usado pelo serviço no Render e aguarde o novo deploy. O manifesto está na versão `1.2.0`. Atualize os addons no Stremio/Nuvio; se o cliente mantiver o manifesto antigo em cache, remova e reinstale a mesma URL `/manifest.json`.

## Rodar localmente

Requer Node.js 20 ou superior. Execute `npm install`, depois `npm start` e abra `http://localhost:3000`.

## Fonte e limites

O servidor consulta gratuitamente o placar público da ESPN, sem chave de API, com cache de 10 minutos. Busca `all` e competições de Brasil, América do Sul, Europa e América do Norte. A fonte não é uma API pública oficialmente documentada para terceiros: pode mudar, bloquear requisições ou deixar partidas e ligas de fora. Portanto, **não é possível prometer literalmente todos os jogos do mundo**. O Render gratuito também pode suspender o serviço após inatividade, causando demora na primeira abertura. Os horários são filtrados pela data de `America/Sao_Paulo`.

Para mudar as competições consultadas, edite `LEAGUES` em `src/football.js`. Cada liga extra aumenta as requisições à fonte.

## Endpoints

- `/manifest.json`
- `/catalog/movie/futebol-hoje.json`
- `/catalog/movie/brasileirao-hoje.json`
- `/meta/movie/{id}.json`
- `/stream/movie/{id}.json`
- `/art/poster/{id}.png` e `/art/background/{id}.png`
- `/health`

O addon usa `movie` como tipo para maximizar a exibição dos catálogos nos clientes Stremio. O recurso `stream` oferece somente um link externo para consultar disponibilidade legal. O PNG é gerado por `@resvg/resvg-js` e comprimido por `sharp`, bibliotecas locais sem API paga.

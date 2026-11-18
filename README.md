# Futebol Hoje — addon para Stremio e Nuvio

Mostra partidas do dia na tela inicial em dois catálogos: **Futebol · Jogos de Hoje** e **Brasileirão · Jogos de Hoje**. Cada item informa horário de Brasília, competição, status e placar quando disponível. É um addon de **calendário e resultados**; não fornece vídeo nem links de transmissão.

## Publicar no Render sem pagar por API

1. Envie estes arquivos para um repositório GitHub.
2. No Render, selecione **New → Blueprint** e conecte o repositório. O `render.yaml` cria um serviço web no plano `free`.
3. Aguarde o deploy. Abra `https://SEU-SERVICO.onrender.com/health` e confirme `{"status":"ok"}`.
4. Instale `https://SEU-SERVICO.onrender.com/manifest.json` em **Stremio → Addons → Add addon**. No Nuvio, cole a mesma URL no campo de instalação de addon Stremio.

O endereço raiz do serviço também mostra a URL para copiar e um botão de instalação no Stremio.

## Rodar localmente

Requer Node.js 20 ou superior. Execute `node server.js` e abra `http://localhost:3000`.

## Fonte e limites

O servidor consulta gratuitamente o placar público da ESPN, sem chave de API, com cache de 10 minutos. Busca `all` e competições de Brasil, América do Sul, Europa e América do Norte. A fonte não é uma API pública oficialmente documentada para terceiros: pode mudar, bloquear requisições ou deixar partidas e ligas de fora. Portanto, **não é possível prometer literalmente todos os jogos do mundo**. O Render gratuito também pode suspender o serviço após inatividade, causando demora na primeira abertura. Os horários são filtrados pela data de `America/Sao_Paulo`.

Para mudar as competições consultadas, edite `LEAGUES` em `src/football.js`. Cada liga extra aumenta as requisições à fonte.

## Endpoints

- `/manifest.json`
- `/catalog/movie/futebol-hoje.json`
- `/catalog/movie/brasileirao-hoje.json`
- `/meta/movie/{id}.json`
- `/health`

O addon usa `movie` como tipo para maximizar a exibição dos catálogos nos clientes Stremio. Nenhum item tem recurso `stream`.

# 🎬 filmarca

[![filmarca: site vira filme](guia/assets/banner.jpg)](https://inematds.github.io/filmarca/guia/)

**🇧🇷 [Português](README.md) · 🇺🇸 [English](README.en.md) · 🇪🇸 [Español](README.es.md)**

## O que é

O filmarca é uma ferramenta gratuita que transforma o site de uma empresa ou produto num vídeo curto de apresentação da marca. Você informa o endereço; ele copia as cores, as fontes, o logo e os textos do site, e a inteligência artificial escreve o roteiro e monta as cenas animadas. Serve para quem precisa de um vídeo para redes sociais ou para o próprio site e não tem editor de vídeo. Roda no seu computador e precisa do Node.js e de uma assinatura do Claude Code ou do Codex, sem pagar API.

**Do site ao filme da marca.** Aponte um endereço: o filmarca lê cores, fontes, logo, textos e prints do site, escreve o roteiro, anima as cenas e entrega o MP4 em 16:9, 9:16 e 1:1, em português, inglês e espanhol. A IA roda pela **sua assinatura** (Claude Code ou Codex), sem chave de API, e o render é local, com o [HyperFrames](https://hyperframes.dev).

## 📖 Guia de uso

Guia completo (landing + passo a passo): **https://inematds.github.io/filmarca/guia/**

## Demo

O filme do inema.club, feito pela própria ferramenta (8 cenas escritas pela IA, todas aprovadas na conferência, 2,7 min de ponta a ponta):

[![demo](docs/demo.gif)](docs/demo-pt-16x9.mp4)

[16:9 PT](docs/demo-pt-16x9.mp4) · [9:16 PT](docs/demo-pt-9x16.mp4) · [16:9 EN](docs/demo-en-16x9.mp4) · [16:9 ES](docs/demo-es-16x9.mp4)

## Instalação

Precisa de Node.js 22+, FFmpeg e o Claude Code (`claude`) ou o Codex (`codex`) logado no terminal.

```bash
git clone https://github.com/inematds/filmarca
cd filmarca
npm i
npx playwright install chromium
```

## Uso

```bash
# tudo de uma vez (rascunho rápido para revisar)
node bin/filmarca.mjs fazer https://seusite.com --out ~/filmes/seusite --duracao 30 --rascunho

# com orientação para o diretor, usando o Codex, já em três idiomas
node bin/filmarca.mjs fazer https://seusite.com --pedido "lançamento do plano anual" --motor codex --langs pt,en,es

# etapas soltas sobre a pasta do filme
node bin/filmarca.mjs editar ~/filmes/seusite c3 "o número entra contando"
node bin/filmarca.mjs voltar ~/filmes/seusite c3 1
node bin/filmarca.mjs traduzir ~/filmes/seusite --lang en
node bin/filmarca.mjs render ~/filmes/seusite --langs pt,en --trilha musica.mp3
```

`node bin/filmarca.mjs ajuda` lista todos os comandos. A pasta do filme guarda `marca.json`, `roteiro.json`, `cenas/` (com versões), `textos/<idioma>.json`, `revisao.html` e `renders/`.

## Como funciona

1. **DNA do site** (Playwright): cores por papel (fundo, texto, botão), fontes com os arquivos, logo (ou logotipo em texto gerado), títulos, números e prints do topo, de três faixas e do celular.
2. **Roteiro**: o diretor escreve o conceito e as cenas só com fatos do site.
3. **Cenas**: a IA escreve cada cena como HTML + CSS + GSAP seguindo um contrato fechado (medidas relativas ao quadro, textos por marcador `{{chave}}`).
4. **Conferência**: cada cena roda sozinha no Chromium em 16:9, 9:16 e 1:1. Recusa rede, relógio, acaso, animação CSS, texto fora do quadro, palavra partida e valores NaN. Recusada, a IA corrige uma vez; se falhar de novo, entra uma cena-modelo.
5. **Render**: uma composição HyperFrames por idioma e formato, `hyperframes lint` e MP4.

## Testes

```bash
npm test
```

## De onde veio a ideia

O método foi inspirado no [Motive](https://github.com/noeltg77/motive). Como ele não tem licença, o filmarca foi escrito do zero, sem copiar código nem prompts, com IA pela assinatura, HyperFrames no lugar do Remotion e conferência no navegador nos três formatos.

## Licença

MIT. As fontes embutidas (Inter e Sora) são SIL Open Font License. Fontes baixadas de um site servem só para o seu render local; não as redistribua.

---

Feito pelo [INEMA.CLUB](https://inema.club).

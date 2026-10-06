# 🎬 filmarca

[![filmarca: website becomes a film](guia/assets/banner-en.jpg)](https://inematds.github.io/filmarca/guia/en/)

**🇧🇷 [Português](README.md) · 🇺🇸 [English](README.en.md) · 🇪🇸 [Español](README.es.md)**

**From website to brand film.** Point it at a URL: filmarca reads the site's colors, fonts, logo, text and screenshots, writes the script, animates the scenes and delivers the MP4 in 16:9, 9:16 and 1:1, in Portuguese, English and Spanish. The AI runs on **your subscription** (Claude Code or Codex), no API key, and rendering is local, with [HyperFrames](https://hyperframes.dev).

## 📖 User guide

Full guide (landing page + step by step): **https://inematds.github.io/filmarca/guia/en/**

## Demo

The inema.club film, made by the tool itself (8 scenes written by the AI, all approved by the checks, 2.7 min end to end):

[![demo](docs/demo.gif)](docs/demo-pt-16x9.mp4)

[16:9 PT](docs/demo-pt-16x9.mp4) · [9:16 PT](docs/demo-pt-9x16.mp4) · [16:9 EN](docs/demo-en-16x9.mp4) · [16:9 ES](docs/demo-es-16x9.mp4)

## Installation

Requires Node.js 22+, FFmpeg and Claude Code (`claude`) or Codex (`codex`) logged in on the terminal.

```bash
git clone https://github.com/inematds/filmarca
cd filmarca
npm i
npx playwright install chromium
```

## Usage

```bash
# everything at once (quick draft to review)
node bin/filmarca.mjs fazer https://yoursite.com --out ~/filmes/yoursite --duracao 30 --rascunho

# with guidance for the director, using Codex, already in three languages
node bin/filmarca.mjs fazer https://yoursite.com --pedido "annual plan launch" --motor codex --langs pt,en,es

# individual steps on the film folder
node bin/filmarca.mjs editar ~/filmes/yoursite c3 "the number counts up as it appears"
node bin/filmarca.mjs voltar ~/filmes/yoursite c3 1
node bin/filmarca.mjs traduzir ~/filmes/yoursite --lang en
node bin/filmarca.mjs render ~/filmes/yoursite --langs pt,en --trilha musica.mp3
```

`node bin/filmarca.mjs ajuda` lists all commands. The film folder holds `marca.json`, `roteiro.json`, `cenas/` (with versions), `textos/<language>.json`, `revisao.html` and `renders/`.

## How it works

1. **Site DNA** (Playwright): colors by role (background, text, button), fonts with their files, logo (or a generated text wordmark), headings, numbers and screenshots of the top, three bands and mobile.
2. **Script**: the director writes the concept and scenes using only facts from the site.
3. **Scenes**: the AI writes each scene as HTML + CSS + GSAP following a strict contract (frame-relative measurements, text via `{{key}}` placeholders).
4. **Checks**: each scene runs on its own in Chromium at 16:9, 9:16 and 1:1. It rejects network access, clocks, randomness, CSS animation, text outside the frame, split words and NaN values. If rejected, the AI fixes it once; if it fails again, a template scene is used.
5. **Render**: one HyperFrames composition per language and format, `hyperframes lint` and MP4.

## Tests

```bash
npm test
```

## Where the idea came from

The method was inspired by [Motive](https://github.com/noeltg77/motive). Since it has no license, filmarca was written from scratch, without copying code or prompts, with AI from a subscription, HyperFrames in place of Remotion and browser checks in all three formats.

## License

MIT. The bundled fonts (Inter and Sora) are SIL Open Font License. Fonts downloaded from a site are for your local render only; do not redistribute them.

---

Made by [INEMA.CLUB](https://inema.club).

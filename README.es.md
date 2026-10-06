# 🎬 filmarca

[![filmarca: el sitio web se convierte en película](guia/assets/banner-es.jpg)](https://inematds.github.io/filmarca/guia/es/)

**🇧🇷 [Português](README.md) · 🇺🇸 [English](README.en.md) · 🇪🇸 [Español](README.es.md)**

**Del sitio web a la película de tu marca.** Indica una dirección: filmarca lee los colores, las fuentes, el logo, los textos y las capturas del sitio, escribe el guion, anima las escenas y entrega el MP4 en 16:9, 9:16 y 1:1, en portugués, inglés y español. La IA corre con **tu suscripción** (Claude Code o Codex), sin clave de API, y el render es local, con [HyperFrames](https://hyperframes.dev).

## 📖 Guía de uso

Guía completa (landing + paso a paso): **https://inematds.github.io/filmarca/guia/es/**

## Demo

La película de inema.club, hecha por la propia herramienta (8 escenas escritas por la IA, todas aprobadas en la revisión, 2,7 min de punta a punta):

[![demo](docs/demo.gif)](docs/demo-pt-16x9.mp4)

[16:9 PT](docs/demo-pt-16x9.mp4) · [9:16 PT](docs/demo-pt-9x16.mp4) · [16:9 EN](docs/demo-en-16x9.mp4) · [16:9 ES](docs/demo-es-16x9.mp4)

## Instalación

Necesita Node.js 22+, FFmpeg y Claude Code (`claude`) o Codex (`codex`) con sesión iniciada en la terminal.

```bash
git clone https://github.com/inematds/filmarca
cd filmarca
npm i
npx playwright install chromium
```

## Uso

```bash
# todo de una vez (borrador rápido para revisar)
node bin/filmarca.mjs fazer https://seusite.com --out ~/filmes/seusite --duracao 30 --rascunho

# con orientación para el director, usando Codex, ya en tres idiomas
node bin/filmarca.mjs fazer https://seusite.com --pedido "lanzamiento del plan anual" --motor codex --langs pt,en,es

# etapas sueltas sobre la carpeta de la película
node bin/filmarca.mjs editar ~/filmes/seusite c3 "el número entra contando"
node bin/filmarca.mjs voltar ~/filmes/seusite c3 1
node bin/filmarca.mjs traduzir ~/filmes/seusite --lang en
node bin/filmarca.mjs render ~/filmes/seusite --langs pt,en --trilha musica.mp3
```

`node bin/filmarca.mjs ajuda` lista todos los comandos. La carpeta de la película guarda `marca.json`, `roteiro.json`, `cenas/` (con versiones), `textos/<idioma>.json`, `revisao.html` y `renders/`.

## Cómo funciona

1. **ADN del sitio** (Playwright): colores por rol (fondo, texto, botón), fuentes con sus archivos, logo (o logotipo en texto generado), títulos, números y capturas de la parte superior, de tres franjas y del móvil.
2. **Guion**: el director escribe el concepto y las escenas solo con hechos del sitio.
3. **Escenas**: la IA escribe cada escena como HTML + CSS + GSAP siguiendo un contrato cerrado (medidas relativas al cuadro, textos mediante marcador `{{clave}}`).
4. **Revisión**: cada escena se ejecuta sola en Chromium en 16:9, 9:16 y 1:1. Rechaza red, reloj, azar, animación CSS, texto fuera del cuadro, palabras partidas y valores NaN. Si se rechaza, la IA la corrige una vez; si vuelve a fallar, entra una escena modelo.
5. **Render**: una composición HyperFrames por idioma y formato, `hyperframes lint` y MP4.

## Pruebas

```bash
npm test
```

## De dónde vino la idea

El método se inspiró en [Motive](https://github.com/noeltg77/motive). Como no tiene licencia, filmarca se escribió desde cero, sin copiar código ni prompts, con IA por suscripción, HyperFrames en lugar de Remotion y revisión en el navegador en los tres formatos.

## Licencia

MIT. Las fuentes incluidas (Inter y Sora) son SIL Open Font License. Las fuentes descargadas de un sitio sirven solo para tu render local; no las redistribuyas.

---

Hecho por [INEMA.CLUB](https://inema.club).

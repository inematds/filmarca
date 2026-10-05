// Monta o projeto HyperFrames: um index por formato (16x9, 9x16, 1x1), uma <section class="clip"> por cena.
// Cada cena é { id, duracao, textos, midia, css, html, js } — o contrato que a IA e as cenas-modelo seguem.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FORMATOS = { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Troca {{chave}} pelos textos da cena (escapados) e {{midia}}/{{logo}} pelos caminhos. */
export function preencher(html, cena, marca) {
  return html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => {
    if (k === 'midia') return esc(cena.midia ?? marca.prints?.[0]?.arquivo ?? '');
    if (k === 'logo') return esc(marca.logo ?? '');
    if (k === 'marca') return esc(marca.nome);
    if (k === 'dominio') return esc(marca.dominio);
    const v = cena.textos?.[k];
    return Array.isArray(v) ? v.map(esc).join(' · ') : esc(v ?? '');
  });
}

/** Fontes: as do site quando baixadas, senão as embutidas (Sora para títulos, Inter para texto, ambas OFL). */
export function fontesCSS(marca) {
  const regras = [];
  const familia = {};
  for (const [papel, reserva] of [['titulo', { nome: 'FM Sora', arq: [['assets/fonts/fm-sora-800.woff2', 800]] }], ['texto', { nome: 'FM Inter', arq: [['assets/fonts/fm-inter-400.woff2', 400], ['assets/fonts/fm-inter-700.woff2', 700]] }]]) {
    const f = marca.fontes?.[papel];
    if (f?.arquivos?.length) {
      const nome = `FM ${f.familia}`;
      for (const a of f.arquivos) regras.push(`@font-face{font-family:"${nome}";src:url("${a.arquivo}");font-weight:${a.peso.includes(' ') ? a.peso : a.peso};font-display:block}`);
      familia[papel] = nome;
    } else {
      for (const [arq, peso] of reserva.arq) regras.push(`@font-face{font-family:"${reserva.nome}";src:url("${arq}");font-weight:${peso};font-display:block}`);
      familia[papel] = reserva.nome;
    }
  }
  return { css: regras.join('\n'), titulo: familia.titulo, texto: familia.texto };
}

export function variaveisCSS(marca, fontes) {
  const c = marca.cores;
  return `--fundo:${c.fundo};--tinta:${c.tinta};--primaria:${c.primaria};--destaque:${c.destaque};--suave:${c.suave};` +
    `--fonte-titulo:"${fontes.titulo}",system-ui,sans-serif;--fonte-texto:"${fontes.texto}",system-ui,sans-serif;`;
}

function blocoCena(cena, marca, inicio) {
  const id = `cena-${cena.id}`;
  return {
    css: `#${id}{\n${cena.css}\n}`,
    html: `<section id="${id}" class="clip cena" data-start="${inicio.toFixed(3)}" data-duration="${cena.duracao.toFixed(3)}" data-track-index="1">\n${preencher(cena.html, cena, marca)}\n</section>`,
    js: `(function(){var el=document.getElementById(${JSON.stringify(id)});var q=function(s){return el.querySelector(s)};var qa=function(s){return el.querySelectorAll(s)};var tl=gsap.timeline();\n(function(tl,q,qa,D,gsap){\n${cena.js}\n})(tl,q,qa,${cena.duracao},gsap);\nmain.add(tl,${inicio.toFixed(3)});})();`,
  };
}

/**
 * Gera o HTML de uma composição completa. `cenas` já validadas. `trilha` (opcional) = caminho de áudio no projeto.
 */
export function composicao(marca, cenas, formato, { trilha = null, idComp = 'main', lang = 'pt' } = {}) {
  const [w, h] = FORMATOS[formato];
  const fontes = fontesCSS(marca);
  let t = 0;
  const blocos = cenas.map((c) => { const b = blocoCena(c, marca, t); t += c.duracao; return b; });
  const total = t;
  const audio = trilha ? `<audio id="trilha" src="${esc(trilha)}" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="9" data-volume="0.55"></audio>` : '';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${w}, height=${h}" />
<title>${esc(marca.nome)} · filmarca ${formato}</title>
<script src="assets/gsap.min.js"></script>
<style>
${fontes.css}
html,body{margin:0;width:100%;height:100%;background:${marca.cores.fundo}}
#root{position:relative;width:100%;height:100%;overflow:hidden;${variaveisCSS(marca, fontes)}background:var(--fundo);color:var(--tinta);font-family:var(--fonte-texto)}
.cena{position:absolute;inset:0;overflow:hidden;container-type:size;background:var(--fundo)}
.cena *{box-sizing:border-box}
${blocos.map((b) => b.css).join('\n')}
</style>
</head>
<body>
<div id="root" data-composition-id="${idComp}" data-start="0" data-width="${w}" data-height="${h}" data-duration="${total.toFixed(3)}" data-fps="30">
${blocos.map((b) => b.html).join('\n')}
${audio}
</div>
<script>
var main = gsap.timeline({ paused: true });
${blocos.map((b) => b.js).join('\n')}
window.__timelines[${JSON.stringify(idComp)}] = main;
</script>
</body>
</html>
`;
}

/** Copia gsap e fontes embutidas para o projeto (uma vez). */
export function prepararAssets(dir) {
  fs.mkdirSync(path.join(dir, 'assets/fonts'), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, 'node_modules/gsap/dist/gsap.min.js'), path.join(dir, 'assets/gsap.min.js'));
  for (const [de, para] of [['Sora-800', 'fm-sora-800'], ['Inter-400', 'fm-inter-400'], ['Inter-700', 'fm-inter-700']]) {
    fs.copyFileSync(path.join(RAIZ, `assets/fonts/${de}.woff2`), path.join(dir, `assets/fonts/${para}.woff2`));
  }
}

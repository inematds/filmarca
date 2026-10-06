// Validação de cena em duas etapas:
// 1) estática: só o que o contrato permite (sem rede, sem relógio, sem acaso, sem sair da cena);
// 2) execução: abre a cena sozinha no Chromium em 16:9, 9:16 e 1:1, avança a linha do tempo e mede
//    erros de script, valores NaN, texto saindo do quadro, marcadores {{ }} sem texto e cena vazia.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { composicao, FORMATOS } from './projeto.mjs';

const PROIBIDO_JS = [
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|Worker|eval|Function|require|import)\s*\(/, 'rede, import ou eval'],
  [/\bnew\s+Function\b/, 'new Function'],
  [/Math\s*\.\s*random/, 'Math.random (use valores fixos; o render precisa ser igual em todo quadro)'],
  [/\b(Date|performance)\s*[.(]/, 'relógio (Date/performance)'],
  [/\b(setTimeout|setInterval|requestAnimationFrame)\b/, 'timers (toda animação vai na linha do tempo tl)'],
  [/\b(window|document|globalThis|self|top|parent|location|localStorage|sessionStorage|indexedDB|navigator|cookie)\b/, 'acesso fora da cena (use só q/qa)'],
  [/repeat\s*:\s*-1/, 'repeat:-1 (use repetição finita)'],
  [/__proto__|\bconstructor\b|\bprototype\b/, 'protótipos'],
];
const PROIBIDO_HTML = [
  [/<script/i, '<script> no html'], [/<style/i, '<style> no html (vai no css)'], [/\son\w+\s*=/i, 'atributo on*'],
  [/(src|href)\s*=\s*["']?\s*(https?:|\/\/|data:text|javascript:)/i, 'endereço externo'], [/<(iframe|object|embed|link|meta|base|form|video|audio)\b/i, 'elemento não permitido'],
];
const PROIBIDO_CSS = [
  [/url\(\s*["']?\s*(https?:|\/\/)/i, 'url externa no css'], [/@import/i, '@import'], [/@keyframes|animation\s*:|transition\s*:/i, 'animação CSS (toda animação vai no GSAP)'],
  [/@font-face/i, '@font-face (as fontes já vêm prontas em var(--fonte-titulo)/var(--fonte-texto))'], [/<\/?style/i, 'tag style dentro do css'],
];

export function validarEstatico(cena) {
  const erros = [];
  const semComentarios = (s) => String(s ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const js = semComentarios(cena.js).replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  for (const [re, msg] of PROIBIDO_JS) if (re.test(js)) erros.push(`js: ${msg}`);
  for (const [re, msg] of PROIBIDO_HTML) if (re.test(cena.html)) erros.push(`html: ${msg}`);
  for (const [re, msg] of PROIBIDO_CSS) if (re.test(cena.css)) erros.push(`css: ${msg}`);
  if (!/\btl\s*\.\s*(to|from|fromTo|set|add|call)\b/.test(cena.js)) erros.push('js: nenhuma animação em tl');
  const usados = [...String(cena.html).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]);
  const livres = new Set(['midia', 'logo', 'marca', 'dominio']);
  const existe = (k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), cena.textos ?? {}) !== undefined;
  for (const k of usados) if (!livres.has(k) && !existe(k)) erros.push(`html: {{${k}}} não existe em textos`);
  if (usados.filter((k) => !livres.has(k)).length === 0 && Object.keys(cena.textos ?? {}).length) erros.push('html: os textos devem entrar por {{chave}} (para a tradução funcionar)');
  return erros;
}

// Mede a cena num quadro: erros, NaN, texto fora do quadro.
function medir() {
  const root = document.getElementById('root').getBoundingClientRect();
  const problemas = [];
  let textos = 0;
  for (const el of document.querySelectorAll('.cena *')) {
    const cs = getComputedStyle(el);
    if (/NaN/.test(cs.transform) || /NaN/.test(el.getAttribute('style') ?? '')) problemas.push(`valor NaN em <${el.tagName.toLowerCase()} class="${el.className}">`);
    const direto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!direto || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    textos++;
    const folga = 0.01 * root.width;
    if (r.left < root.left - folga || r.right > root.right + folga || r.top < root.top - folga || r.bottom > root.bottom + folga) {
      problemas.push(`texto sai do quadro: "${el.textContent.trim().slice(0, 40)}"`);
    }
    if (el.scrollWidth > el.clientWidth + 4 && cs.overflow !== 'visible' && el.clientWidth > 0) problemas.push(`texto cortado: "${el.textContent.trim().slice(0, 40)}"`);
    // Palavra partida entre duas linhas ("Comunidad|e"): cada palavra precisa caber numa linha só.
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const re = /\S{3,}/g;
      let m;
      while ((m = re.exec(n.textContent))) {
        const rg = document.createRange();
        rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const linhas = new Set([...rg.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
        if (linhas.size > 1) { problemas.push(`palavra partida em duas linhas: "${m[0]}" (diminua a fonte ou deixe a caixa mais larga)`); break; }
      }
    }
  }
  if (/\{\{/.test(document.querySelector('.cena').innerHTML)) problemas.push('marcador {{ }} sem texto');
  return { problemas, textos };
}

/**
 * Valida uma cena executando-a. Devolve { ok, erros[], miniaturas{fmt:caminho} }.
 * `dir` = pasta do projeto (para achar assets/). `browser` reaproveitado entre cenas.
 */
export async function validarExecucao(cena, marca, dir, browser, { miniaturas = true } = {}) {
  const erros = [];
  const fotos = {};
  for (const fmt of ['16x9', '9x16', '1x1']) {
    const arq = path.join(dir, `_valida-${cena.id}-${fmt}.html`);
    const html = composicao(marca, [cena], fmt).replace('<script src="assets/gsap.min.js"></script>', '<script>window.__timelines={}</script><script src="assets/gsap.min.js"></script>');
    fs.writeFileSync(arq, html);
    const [w, h] = FORMATOS[fmt];
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const falhas = [];
    page.on('pageerror', (e) => falhas.push(`erro de script: ${e.message.slice(0, 160)}`));
    try {
      await page.goto('file://' + arq, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.evaluate(() => Promise.race([Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 5000))]));
      await page.evaluate(() => Promise.race([document.fonts.ready.then(() => 1), new Promise((r) => setTimeout(r, 4000))]));
      const temTl = await page.evaluate(() => !!window.__timelines?.main);
      if (!temTl) falhas.push('a linha do tempo não foi registrada (erro no js?)');
      const D = cena.duracao;
      let vistos = 0;
      for (const f of [0.05, 0.35, 0.6, 0.85]) {
        if (!temTl) break;
        await page.evaluate((t) => { window.__timelines.main.seek(t, false); }, D * f);
        const m = await page.evaluate(medir);
        vistos = Math.max(vistos, m.textos);
        for (const p of m.problemas) falhas.push(`${fmt} em ${(D * f).toFixed(1)}s: ${p}`);
        if (f === 0.6 && miniaturas && fmt !== '1x1') {
          const foto = path.join(dir, 'revisao', `${cena.id}-${fmt}.jpg`);
          fs.mkdirSync(path.dirname(foto), { recursive: true });
          await page.screenshot({ path: foto, type: 'jpeg', quality: 70 });
          fotos[fmt] = path.relative(dir, foto);
        }
      }
      if (temTl && vistos === 0 && Object.keys(cena.textos ?? {}).length) falhas.push(`${fmt}: nenhum texto visível na cena`);
    } catch (e) {
      falhas.push(`${fmt}: ${e.message.slice(0, 160)}`);
    } finally {
      await page.close();
      fs.rmSync(arq, { force: true });
    }
    erros.push(...new Set(falhas));
  }
  return { ok: erros.length === 0, erros: erros.slice(0, 12), miniaturas: fotos };
}

export async function abrirNavegador() { return chromium.launch(); }

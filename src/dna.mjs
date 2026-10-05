// Lê o DNA visual de um site: cores por papel, fontes (com os arquivos), logo, textos e prints.
// Tudo local, com o Chromium do Playwright. Nenhuma IA aqui: só medição.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36 filmarca';

// Roda dentro da página: coleta cores com o papel do elemento, famílias de fonte em uso,
// fontes declaradas (@font-face), candidatos a logo e o texto que importa.
function coletar() {
  const rgb = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (a < 0.5) return null;
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden';
  };
  const cores = {};
  const soma = (hex, papel, peso) => {
    if (!hex) return;
    cores[hex] ??= { hex, peso: 0, papeis: {} };
    cores[hex].peso += peso;
    cores[hex].papeis[papel] = (cores[hex].papeis[papel] ?? 0) + peso;
  };
  const familias = {};
  const els = [...document.querySelectorAll('body, body *')].slice(0, 4000);
  for (const el of els) {
    if (!visivel(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const area = Math.min(r.width * r.height, 1920 * 1080) / 1e4;
    const tag = el.tagName.toLowerCase();
    const botao = tag === 'button' || (tag === 'a' && /btn|button|cta/i.test(el.className + ''));
    soma(rgb(cs.backgroundColor), botao ? 'botao' : 'fundo', botao ? 40 : area);
    const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (temTexto) {
      const tam = parseFloat(cs.fontSize);
      soma(rgb(cs.color), /^h[1-3]$/.test(tag) ? 'titulo' : botao ? 'texto-botao' : tag === 'a' ? 'link' : 'texto', tam);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const papel = /^h[1-3]$/.test(tag) || tam >= 32 ? 'titulo' : 'texto';
      familias[fam] ??= { familia: fam, titulo: 0, texto: 0, pesos: {} };
      familias[fam][papel] += el.textContent.trim().length;
      familias[fam].pesos[cs.fontWeight] = (familias[fam].pesos[cs.fontWeight] ?? 0) + 1;
    }
    if (cs.borderTopWidth !== '0px') soma(rgb(cs.borderTopColor), 'borda', 1);
  }
  const fontFaces = [];
  for (const sheet of document.styleSheets) {
    let regras;
    try { regras = sheet.cssRules; } catch { continue; }
    for (const r of regras) {
      if (r.constructor.name !== 'CSSFontFaceRule') continue;
      const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
      const urls = [...r.style.getPropertyValue('src').matchAll(/url\(["']?([^"')]+)["']?\)\s*format\(["']?([\w-]+)/g)].map((m) => ({ url: new URL(m[1], sheet.href || location.href).href, fmt: m[2] }));
      const ur = r.style.getPropertyValue('unicode-range');
      fontFaces.push({ familia: fam, peso: r.style.getPropertyValue('font-weight') || '400', estilo: r.style.getPropertyValue('font-style') || 'normal', urls, latin: !ur || /U\+0000-00FF|U\+0-FF|U\+0000/i.test(ur) });
    }
  }
  const logos = [];
  const cab = document.querySelector('header, nav, [class*=header], [class*=nav]') || document.body;
  for (const el of cab.querySelectorAll('img, svg')) {
    const r = el.getBoundingClientRect();
    if (r.top > 200 || r.width < 16) continue;
    const pista = (el.getAttribute('alt') || '') + ' ' + (el.getAttribute('class') || '') + ' ' + (el.getAttribute('src') || '') + ' ' + (el.closest('a')?.getAttribute('href') || '');
    const href = el.closest('a')?.href || '';
    const externo = href && new URL(href, location.href).hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, '');
    const raiz = href && !externo && /^\/?(#.*)?$/.test(new URL(href, location.href).pathname.replace(/\/index\.html?$/, '/'));
    const nota = (/logo|marca|brand/i.test(pista) ? 10 : 0) + (raiz ? 5 : 0) + (r.left < 400 ? 2 : 0) - (externo ? 20 : 0);
    logos.push({ tipo: el.tagName.toLowerCase(), src: el.currentSrc || el.getAttribute('src'), svg: el.tagName.toLowerCase() === 'svg' ? el.outerHTML.slice(0, 60000) : null, nota, w: r.width, h: r.height });
  }
  const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || null;
  const textos = (sel, n) => [...document.querySelectorAll(sel)].filter(visivel).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter((t) => t.length > 1 && t.length < 220).slice(0, n);
  return {
    titulo: document.title, descricao: meta('description') || meta('og:description'), ogImage: meta('og:image'),
    idioma: document.documentElement.lang || null,
    h1: textos('h1', 3), h2: textos('h2', 12), h3: textos('h3', 16), botoes: textos('button, a[class*=btn], a[class*=button], a[class*=cta]', 10),
    paragrafos: textos('main p, section p, p', 14),
    numeros: textos('main *, section *', 400).filter((t) => /^[+~≈]?\s?[\d.,]+\s?(%|k|mil|mi|M|\+|x)?\+?$/i.test(t)).slice(0, 8),
    cores: Object.values(cores).sort((a, b) => b.peso - a.peso).slice(0, 14),
    familias: Object.values(familias).sort((a, b) => b.titulo + b.texto - (a.titulo + a.texto)).slice(0, 6),
    fontFaces, logos: logos.sort((a, b) => b.nota - a.nota).slice(0, 4),
    favicon: [...document.querySelectorAll('link[rel*=icon]')].map((l) => l.href).pop() || null,
  };
}

async function baixar(url, destino) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Escolhe papéis de cor só com a medição: fundo = maior área; tinta = texto que mais contrasta;
// primária = botão (ou link) mais saturado; destaque = outra cor saturada diferente da primária.
export function papeisDeCor(cores) {
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const sat = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return (Math.max(...v) - Math.min(...v)) / 255; };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const porPapel = (p) => cores.filter((c) => c.papeis[p]).sort((a, b) => b.papeis[p] - a.papeis[p]);
  const fundo = porPapel('fundo')[0]?.hex ?? '#ffffff';
  const tinta = [...porPapel('titulo'), ...porPapel('texto')].sort((a, b) => contraste(b.hex, fundo) - contraste(a.hex, fundo))[0]?.hex ?? (lum(fundo) > 0.5 ? '#111111' : '#f5f5f5');
  const vivas = cores.filter((c) => sat(c.hex) > 0.25 && c.hex !== fundo);
  const primaria = (porPapel('botao').find((c) => sat(c.hex) > 0.2) ?? vivas.sort((a, b) => b.peso - a.peso)[0])?.hex ?? tinta;
  const dist = (a, b) => [1, 3, 5].reduce((s, i) => s + Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)), 0);
  const destaque = vivas.find((c) => dist(c.hex, primaria) > 120)?.hex ?? primaria;
  const suave = cores.find((c) => c.hex !== fundo && contraste(c.hex, fundo) < 1.4)?.hex ?? fundo;
  return { fundo, tinta, primaria, destaque, suave, escuro: lum(fundo) < 0.35 };
}

export async function lerDNA(url, dir, { log = console.log } = {}) {
  fs.mkdirSync(path.join(dir, 'assets/fonts'), { recursive: true });
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: UA });
    const page = await ctx.newPage();
    log(`  lendo ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.waitForLoadState('domcontentloaded'));
    await page.waitForTimeout(1500);
    // Fecha banners de cookie comuns para não aparecerem no print.
    for (const t of ['Aceitar', 'Accept', 'Aceptar', 'OK', 'Entendi', 'Concordo']) await page.getByRole('button', { name: t, exact: false }).first().click({ timeout: 500 }).catch(() => {});
    const d = await page.evaluate(coletar);

    // Prints: topo (1440×900), três faixas ao rolar e a versão celular.
    const prints = [];
    await page.screenshot({ path: path.join(dir, 'assets/print-topo.png') });
    prints.push({ arquivo: 'assets/print-topo.png', o: 'topo da página' });
    const altura = await page.evaluate(() => document.documentElement.scrollHeight);
    for (const [i, f] of [0.25, 0.5, 0.75].entries()) {
      if (altura < 1800) break;
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(altura * f));
      await page.waitForTimeout(700);
      const a = `assets/print-${i + 1}.png`;
      await page.screenshot({ path: path.join(dir, a) });
      prints.push({ arquivo: a, o: `faixa a ${Math.round(f * 100)}% da página` });
    }
    const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: UA, isMobile: true });
    const pc = await cel.newPage();
    await pc.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await pc.waitForTimeout(1000);
    await pc.screenshot({ path: path.join(dir, 'assets/print-celular.png') });
    prints.push({ arquivo: 'assets/print-celular.png', o: 'página no celular' });

    // Logo: SVG embutido > img marcada como logo > favicon.
    let logo = null;
    const melhor = d.logos[0];
    try {
      if (melhor?.svg && melhor.nota >= 5) { fs.writeFileSync(path.join(dir, 'assets/logo.svg'), melhor.svg); logo = 'assets/logo.svg'; }
      else if (melhor?.src && melhor.nota >= 5) { const ext = (melhor.src.match(/\.(svg|png|webp|jpe?g)(\?|$)/i)?.[1] ?? 'png').toLowerCase(); logo = `assets/logo.${ext}`; await baixar(new URL(melhor.src, url).href, path.join(dir, logo)); }
    } catch (e) { log(`  logo: ${e.message}`); logo = null; }

    // Fontes: as duas famílias mais usadas (título e texto), arquivo latino de cada peso.
    const titulo = [...d.familias].sort((a, b) => b.titulo - a.titulo)[0]?.familia;
    const texto = [...d.familias].sort((a, b) => b.texto - a.texto)[0]?.familia;
    const fontes = {};
    for (const [papel, fam] of [['titulo', titulo], ['texto', texto]]) {
      if (!fam) continue;
      const faces = d.fontFaces.filter((f) => f.familia.toLowerCase() === fam.toLowerCase() && f.estilo === 'normal');
      const escolhidas = faces.filter((f) => f.latin).length ? faces.filter((f) => f.latin) : faces;
      const arquivos = [];
      for (const f of escolhidas.slice(0, 4)) {
        const u = f.urls.find((x) => /woff2/.test(x.fmt)) ?? f.urls[0];
        if (!u) continue;
        const nome = `assets/fonts/${slug(fam)}-${slug(f.peso)}.${/woff2/.test(u.fmt) ? 'woff2' : u.fmt === 'woff' ? 'woff' : 'ttf'}`;
        try { await baixar(u.url, path.join(dir, nome)); arquivos.push({ arquivo: nome, peso: f.peso }); } catch (e) { log(`  fonte ${fam}: ${e.message}`); }
      }
      fontes[papel] = { familia: fam, arquivos };
    }

    const marca = {
      url, nome: d.titulo.split(/[|–—-]/)[0].trim() || new URL(url).hostname, dominio: new URL(url).hostname.replace(/^www\./, ''),
      idioma: d.idioma, titulo: d.titulo, descricao: d.descricao,
      cores: papeisDeCor(d.cores), paleta: d.cores.slice(0, 8).map((c) => ({ hex: c.hex, papeis: Object.keys(c.papeis) })),
      fontes, logo, prints,
      textos: { h1: d.h1, h2: d.h2, h3: d.h3, botoes: d.botoes, paragrafos: d.paragrafos, numeros: d.numeros },
      lidoEm: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, 'marca.json'), JSON.stringify(marca, null, 2));
    log(`  marca: ${marca.nome} · cores ${Object.values(marca.cores).filter((v) => typeof v === 'string').join(' ')} · fontes ${titulo ?? '—'} / ${texto ?? '—'} · logo ${logo ?? 'não achei'}`);
    return marca;
  } finally {
    await browser.close();
  }
}

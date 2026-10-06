// A linha de montagem: DNA → roteiro (diretor) → cenas (IA, validadas, com reserva) → tradução → render.
// Estado do filme vive em arquivos na pasta do projeto, então cada etapa pode ser refeita sozinha.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pedirJSON } from './ia.mjs';
import { cenaModelo, MODELOS } from './modelos.mjs';
import { validarEstatico, validarExecucao, abrirNavegador } from './validar.mjs';
import { composicao, prepararAssets, fontesCSS, FORMATOS } from './projeto.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prompt = (n) => fs.readFileSync(path.join(RAIZ, 'prompts', `${n}.md`), 'utf8');
const ler = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const gravar = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };
const IDIOMAS = { pt: 'português do Brasil', en: 'inglês (EUA)', es: 'espanhol (América Latina)' };

/** Resumo do DNA para a IA: o que importa, sem o SVG do logo nem a paleta inteira. */
function resumoDNA(marca) {
  const { url, nome, dominio, titulo, descricao, cores, fontes, prints, textos } = marca;
  return { url, nome_lido: nome, dominio, titulo, descricao, cores, fontes: { titulo: fontes?.titulo?.familia, texto: fontes?.texto?.familia }, prints: prints.map((p) => `${p.arquivo} (${p.o})`), textos };
}

export async function fazerRoteiro(dir, { pedido = '', duracao = 30, lang = 'pt', motor = 'claude', log = console.log } = {}) {
  const marca = ler(path.join(dir, 'marca.json'));
  const r = await pedirJSON({
    nome: 'diretor', motor, log, sistema: prompt('diretor'),
    pedido: `PEDIDO DO USUÁRIO: ${pedido || 'um filme de apresentação do produto, para redes sociais e para o site'}\nDURAÇÃO ALVO: ${duracao} s\nIDIOMA DOS TEXTOS: ${IDIOMAS[lang] ?? lang}\n\nDNA DO SITE (medido):\n${JSON.stringify(resumoDNA(marca), null, 1)}`,
  });
  // Normaliza: ids únicos, durações entre 2 e 7 s, mídia só dos prints que existem, cta no fim.
  const existentes = new Set(marca.prints.map((p) => p.arquivo));
  r.cenas = (r.cenas ?? []).map((c, i) => ({
    id: `c${i + 1}`, tipo: c.tipo in MODELOS || c.tipo === 'livre' ? c.tipo : 'titulo',
    duracao: Math.min(7, Math.max(2, Number(c.duracao) || 3.5)),
    textos: c.textos ?? {}, direcao: c.direcao ?? '',
    midia: existentes.has(c.midia) ? c.midia : c.tipo === 'print' ? marca.prints[0]?.arquivo ?? null : null,
  }));
  if (!r.cenas.length) throw new Error('o diretor não devolveu cenas');
  if (r.marca?.nome) { marca.nome = r.marca.nome; marca.tom = r.marca.tom; gravar(path.join(dir, 'marca.json'), marca); }
  r.lang = lang;
  gravar(path.join(dir, 'roteiro.json'), r);
  log(`  roteiro: "${r.titulo}" · ${r.cenas.length} cenas · ${r.cenas.reduce((s, c) => s + c.duracao, 0).toFixed(1)} s · ${r.conceito}`);
  return r;
}

async function escreverCena(cena, marca, roteiro, { motor, log, instrucao = null, anterior = null, erros = null }) {
  const contexto = {
    marca: { nome: marca.nome, tom: marca.tom, cores: marca.cores, fontes: { titulo: marca.fontes?.titulo?.familia, texto: marca.fontes?.texto?.familia }, logo: !!marca.logo },
    filme: { titulo: roteiro.titulo, conceito: roteiro.conceito, cenas: roteiro.cenas.map((c) => `${c.id} ${c.tipo}`).join(', ') },
    cena: { id: cena.id, tipo: cena.tipo, duracao_D: cena.duracao, textos: cena.textos, direcao: cena.direcao, midia: cena.midia },
  };
  let pedido = `Anime esta cena.\n\n${JSON.stringify(contexto, null, 1)}`;
  if (anterior) pedido += `\n\nCÓDIGO ATUAL DA CENA:\n${JSON.stringify({ css: anterior.css, html: anterior.html, js: anterior.js })}`;
  if (instrucao) pedido += `\n\nMUDANÇA PEDIDA: ${instrucao}`;
  if (erros) pedido += `\n\nA versão anterior foi RECUSADA pela validação. Corrija estes problemas:\n- ${erros.join('\n- ')}`;
  const j = await pedirJSON({ nome: `cena ${cena.id}`, motor, log, sistema: prompt('cena'), pedido });
  return { ...cena, css: String(j.css ?? ''), html: String(j.html ?? ''), js: String(j.js ?? ''), origem: 'ia' };
}

/** Escreve, valida e (se preciso) repara uma cena; cai na cena-modelo se ainda falhar. */
async function cenaValidada(cena, marca, roteiro, dir, browser, opts) {
  const { log } = opts;
  let tentativa = null, erros = null;
  for (let rodada = 1; rodada <= 2; rodada++) {
    try {
      tentativa = await escreverCena(cena, marca, roteiro, { ...opts, erros, anterior: erros ? tentativa : opts.anterior });
    } catch (e) { log(`  ${cena.id}: IA falhou (${e.message.slice(0, 100)})`); break; }
    erros = validarEstatico(tentativa);
    if (!erros.length) { const r = await validarExecucao(tentativa, marca, dir, browser); erros = r.erros; tentativa.miniaturas = r.miniaturas; }
    if (!erros.length) { log(`  ${cena.id} ✓ ${rodada === 1 ? 'aprovada' : 'aprovada após reparo'}`); return { ...tentativa, reparos: rodada - 1 }; }
    log(`  ${cena.id} ✗ ${erros.slice(0, 2).join(' | ')}`);
  }
  const m = cenaModelo(cena);
  const r = await validarExecucao(m, marca, dir, browser);
  log(`  ${cena.id} → cena-modelo "${m.tipo in MODELOS ? m.tipo : 'titulo'}"${r.ok ? '' : ` (avisos: ${r.erros[0]})`}`);
  return { ...m, miniaturas: r.miniaturas, recusada: erros };
}

async function emLotes(itens, n, fn) {
  const saida = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => { while (i < itens.length) { const k = i++; saida[k] = await fn(itens[k], k); } }));
  return saida;
}

/** Site sem logo em imagem: desenha o nome da marca com a fonte de título e a cor da marca (PNG transparente). */
async function logoEmTexto(dir, marca, browser) {
  const fontes = fontesCSS(marca);
  const page = await browser.newPage({ viewport: { width: 2400, height: 400 } });
  try {
    const html = `<html><head><style>${fontes.css.replace(/url\("/g, `url("file://${dir}/`)}html,body{margin:0;background:transparent}
span{display:inline-block;padding:20px 30px;font-family:"${fontes.titulo}",system-ui,sans-serif;font-weight:800;font-size:200px;line-height:1;color:${marca.cores.tinta};letter-spacing:-.02em;white-space:nowrap}
b{color:${marca.cores.primaria};font-weight:800}</style></head><body><span id="m"></span></body></html>`;
    await page.setContent(html);
    await page.evaluate((nome) => { const [a, ...b] = nome.split('.'); const m = document.getElementById('m'); m.textContent = a; if (b.length) { const x = document.createElement('b'); x.textContent = '.' + b.join('.'); m.append(x); } }, marca.nome);
    await page.evaluate(() => document.fonts.ready.then(() => 1));
    await page.locator('#m').screenshot({ path: path.join(dir, 'assets/logo-texto.png'), omitBackground: true });
  } finally { await page.close(); }
  marca.logo = 'assets/logo-texto.png';
  marca.logoGerado = true;
  gravar(path.join(dir, 'marca.json'), marca);
}

export async function fazerCenas(dir, { motor = 'claude', paralelo = 3, so = null, log = console.log } = {}) {
  const marca = ler(path.join(dir, 'marca.json'));
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  prepararAssets(dir);
  const browser = await abrirNavegador();
  try {
    if (!marca.logo || marca.logoGerado) { await logoEmTexto(dir, marca, browser); log(`  logo: o site não tem logo em imagem; gerei "${marca.nome}" em texto`); }
    const alvo = roteiro.cenas.filter((c) => !so || so.includes(c.id));
    const prontas = await emLotes(alvo, paralelo, (c) => cenaValidada(c, marca, roteiro, dir, browser, { motor, log }));
    for (const c of prontas) gravarCena(dir, c);
  } finally { await browser.close(); }
  revisao(dir);
}

function gravarCena(dir, c) {
  const pasta = path.join(dir, 'cenas');
  fs.mkdirSync(pasta, { recursive: true });
  const versoes = fs.readdirSync(pasta).filter((f) => f.startsWith(`${c.id}.v`)).length;
  gravar(path.join(pasta, `${c.id}.v${versoes + 1}.json`), c);
  gravar(path.join(pasta, `${c.id}.json`), { ...c, versao: versoes + 1 });
}

export function carregarCenas(dir) {
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  return roteiro.cenas.map((c) => {
    const f = path.join(dir, 'cenas', `${c.id}.json`);
    if (!fs.existsSync(f)) throw new Error(`cena ${c.id} ainda não foi escrita (rode "cenas")`);
    const s = { ...ler(f), duracao: c.duracao, textos: c.textos };
    return s.origem === 'modelo' ? { ...cenaModelo(s), versao: s.versao, miniaturas: s.miniaturas } : s;
  });
}

/** Muda uma cena em linguagem natural. A versão anterior fica guardada (cenas/<id>.vN.json). */
export async function editarCena(dir, id, instrucao, { motor = 'claude', log = console.log } = {}) {
  const marca = ler(path.join(dir, 'marca.json'));
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  const atual = carregarCenas(dir).find((c) => c.id === id);
  if (!atual) throw new Error(`não existe cena ${id}`);
  const browser = await abrirNavegador();
  try {
    const nova = await cenaValidada(atual, marca, roteiro, dir, browser, { motor, log, instrucao, anterior: atual });
    if (nova.origem === 'modelo' && atual.origem === 'ia') { log(`  ${id}: a mudança não passou na validação; a versão atual foi mantida`); return atual; }
    gravarCena(dir, nova);
    revisao(dir);
    return nova;
  } finally { await browser.close(); }
}

/** Volta uma cena para a versão N. */
export function voltarCena(dir, id, versao) {
  const f = path.join(dir, 'cenas', `${id}.v${versao}.json`);
  if (!fs.existsSync(f)) throw new Error(`não existe ${id} versão ${versao}`);
  gravar(path.join(dir, 'cenas', `${id}.json`), { ...ler(f), versao: Number(versao) });
}

/** Traduz só os TEXTOS do roteiro; o código das cenas é o mesmo. Revalida no idioma novo. */
export async function traduzir(dir, lang, { motor = 'claude', log = console.log } = {}) {
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  if (lang === roteiro.lang) return;
  const textos = Object.fromEntries(roteiro.cenas.map((c) => [c.id, c.textos]));
  const r = await pedirJSON({
    nome: `tradução ${lang}`, motor, nivel: 'menor', log,
    sistema: 'Você traduz textos curtos de um filme de produto. Mantenha as MESMAS chaves e a mesma estrutura JSON, traduza só os valores. Frases curtas e naturais, com o tom de marketing do original; nomes de marca, domínios e números ficam iguais. Responda SOMENTE com o JSON.',
    pedido: `Traduza para ${IDIOMAS[lang] ?? lang}:\n${JSON.stringify(textos, null, 1)}`,
  });
  for (const id of Object.keys(textos)) if (!r[id]) throw new Error(`tradução sem a cena ${id}`);
  gravar(path.join(dir, 'textos', `${lang}.json`), r);
  log(`  textos em ${lang} gravados`);
}

function cenasNoIdioma(dir, lang) {
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  const cenas = carregarCenas(dir);
  if (lang === roteiro.lang) return cenas;
  const f = path.join(dir, 'textos', `${lang}.json`);
  if (!fs.existsSync(f)) throw new Error(`faltam os textos em ${lang} (rode "traduzir")`);
  const t = ler(f);
  return cenas.map((c) => {
    const novo = { ...c, textos: t[c.id] ?? c.textos };
    return c.origem === 'modelo' ? cenaModelo(novo) : novo;
  });
}

function rodar(cmd, args, cwd, log) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let fim = '';
    const pega = (c) => { fim = (fim + c).slice(-3000); };
    p.stdout.on('data', pega); p.stderr.on('data', pega);
    p.on('close', (code) => (code === 0 ? resolve(fim) : reject(new Error(`${path.basename(cmd)} saiu com ${code}: ${fim.slice(-600)}`))));
  });
}

/** Monta um projeto HyperFrames por idioma×formato e renderiza. Revalida as cenas no idioma antes. */
export async function renderizar(dir, { langs = null, formatos = Object.keys(FORMATOS), qualidade = 'looks', trilha = null, log = console.log } = {}) {
  const marca = ler(path.join(dir, 'marca.json'));
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  langs ??= [roteiro.lang];
  const hf = path.join(RAIZ, 'node_modules/.bin/hyperframes');
  const nome = (roteiro.titulo || marca.nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'filme';
  const saidas = [];
  const browser = await abrirNavegador();
  try {
    for (const lang of langs) {
      let cenas = cenasNoIdioma(dir, lang);
      if (lang !== roteiro.lang) {
        // Texto traduzido pode ficar maior: revalida e troca pela cena-modelo o que estourar.
        cenas = await Promise.all(cenas.map(async (c) => c));
        for (const [i, c] of cenas.entries()) {
          const r = await validarExecucao(c, marca, dir, browser, { miniaturas: false });
          if (!r.ok) { log(`  ${lang}/${c.id}: ${r.erros[0]} → cena-modelo`); cenas[i] = cenaModelo(c); }
        }
      }
      for (const fmt of formatos) {
        const pasta = path.join(dir, 'render', `${lang}-${fmt}`);
        fs.rmSync(pasta, { recursive: true, force: true });
        fs.mkdirSync(pasta, { recursive: true });
        fs.cpSync(path.join(dir, 'assets'), path.join(pasta, 'assets'), { recursive: true });
        let audio = null;
        if (trilha) { const ext = path.extname(trilha); fs.copyFileSync(trilha, path.join(pasta, 'assets', `trilha${ext}`)); audio = `assets/trilha${ext}`; }
        fs.writeFileSync(path.join(pasta, 'index.html'), composicao(marca, cenas, fmt, { trilha: audio, lang }));
        const lint = await rodar(hf, ['lint'], pasta, log).catch((e) => { throw new Error(`lint recusou ${lang}-${fmt}: ${e.message}`); });
        const mp4 = path.join(dir, 'renders', `${nome}-${lang}-${fmt}.mp4`);
        fs.mkdirSync(path.dirname(mp4), { recursive: true });
        const t0 = Date.now();
        await rodar(hf, ['render', '--quality', qualidade, '-o', mp4, '--quiet'], pasta, log);
        log(`  ✓ ${path.relative(dir, mp4)} · ${((Date.now() - t0) / 1000).toFixed(0)} s${/✗|error/i.test(lint) ? ' (lint com avisos)' : ''}`);
        saidas.push(mp4);
      }
    }
  } finally { await browser.close(); }
  return saidas;
}

/** Página de revisão: miniatura de cada cena nos dois formatos, textos, origem e versão. */
export function revisao(dir) {
  const marca = ler(path.join(dir, 'marca.json'));
  const roteiro = ler(path.join(dir, 'roteiro.json'));
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const linhas = roteiro.cenas.map((c) => {
    const f = path.join(dir, 'cenas', `${c.id}.json`);
    const s = fs.existsSync(f) ? ler(f) : {};
    const mini = s.miniaturas ?? {};
    return `<article><header><b>${c.id}</b> · ${c.tipo} · ${c.duracao}s · <span class="${s.origem === 'ia' ? 'ia' : 'mod'}">${s.origem === 'ia' ? 'escrita pela IA' : 'cena-modelo'}</span> · v${s.versao ?? '-'}</header>
<div class="mini">${mini['16x9'] ? `<img src="${mini['16x9']}" class="h">` : ''}${mini['9x16'] ? `<img src="${mini['9x16']}" class="v">` : ''}</div>
<p>${Object.entries(c.textos).map(([k, v]) => `<i>${esc(k)}</i> ${esc(Array.isArray(v) ? v.join(' · ') : v)}`).join('<br>')}</p>
<p class="dir">${esc(c.direcao)}</p>${s.recusada ? `<p class="err">IA recusada: ${esc(s.recusada.slice(0, 2).join(' | '))}</p>` : ''}</article>`;
  }).join('\n');
  fs.writeFileSync(path.join(dir, 'revisao.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisão · ${esc(roteiro.titulo)}</title>
<style>body{margin:0;padding:24px;background:#111;color:#eee;font:14px/1.5 system-ui}h1{margin:0 0 4px}.sub{opacity:.7;margin:0 0 20px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}article{background:#1b1b1f;border-radius:10px;padding:12px}
.mini{display:flex;gap:8px;align-items:flex-start}.h{width:72%}.v{width:24%}img{border-radius:6px;border:1px solid #333}
i{opacity:.55;font-style:normal;margin-right:4px}.dir{opacity:.6;font-size:12px}.ia{color:#6ee7b7}.mod{color:#fbbf24}.err{color:#fca5a5;font-size:12px}</style>
<h1>${esc(roteiro.titulo)}</h1><p class="sub">${esc(marca.nome)} · ${esc(roteiro.conceito)} · ${roteiro.cenas.length} cenas</p><main>${linhas}</main></html>`);
}

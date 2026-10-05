#!/usr/bin/env node
// filmarca — do site ao filme da marca. Uso: filmarca <comando> [opções]  (filmarca ajuda)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { lerDNA } from '../src/dna.mjs';
import { fazerRoteiro, fazerCenas, editarCena, voltarCena, traduzir, renderizar, revisao } from '../src/filme.mjs';

const AJUDA = `filmarca — do site ao filme da marca (16:9, 9:16 e 1:1), com a IA da sua assinatura.

  filmarca fazer <url> [--out pasta] [--pedido "..."] [--duracao 30] [--lang pt] [--langs pt,en,es]
                       [--motor claude|codex] [--trilha musica.mp3] [--formatos 16x9,9x16,1x1] [--rascunho]
      Faz tudo: DNA → roteiro → cenas → (tradução) → render.

  Etapas soltas (sobre uma pasta de filme):
  filmarca dna <url> --out pasta           lê cores, fontes, logo, textos e prints do site
  filmarca roteiro pasta [--pedido ...]    o diretor escreve o roteiro (roteiro.json)
  filmarca cenas pasta [--so c2,c5]        escreve e valida as cenas (revisao.html)
  filmarca editar pasta c3 "mais impacto no número"   muda uma cena em texto (guarda a versão anterior)
  filmarca voltar pasta c3 1               volta a cena c3 para a versão 1
  filmarca traduzir pasta --lang en        traduz só os textos (o código das cenas é o mesmo)
  filmarca render pasta [--langs pt,en] [--formatos 16x9] [--rascunho] [--trilha arq]

A IA roda pelo Claude Code (claude -p) ou pelo Codex (codex exec) já logados — sem chave de API.
Modelos: ~/.config/inema/modelos.env (INEMA_CLAUDE_TOPO / _MENOR) ou FILMARCA_MODELO.`;

function opcoes(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; }
    else pos.push(a);
  }
  return { pos, o };
}

const [cmd, ...resto] = process.argv.slice(2);
const { pos, o } = opcoes(resto);
const motor = o.motor === 'codex' ? 'codex' : 'claude';
const lista = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);
const pastaPadrao = (url) => path.join(os.homedir(), 'projetos/output/filmarca', new URL(url).hostname.replace(/^www\./, '').replace(/\./g, '-') + '-' + new Date().toISOString().slice(0, 10));
const qualidade = o.rascunho ? 'draft' : o.qualidade ?? 'looks';
const t0 = Date.now();

try {
  switch (cmd) {
    case 'fazer': {
      const url = pos[0];
      if (!url) throw new Error('falta a url');
      const dir = path.resolve(o.out ?? pastaPadrao(url));
      const langs = lista(o.langs) ?? [o.lang ?? 'pt'];
      console.log(`filmarca → ${dir}`);
      console.log('1/4 DNA da marca');
      await lerDNA(url, dir);
      console.log('2/4 roteiro');
      await fazerRoteiro(dir, { pedido: o.pedido, duracao: Number(o.duracao ?? 30), lang: langs[0], motor });
      console.log('3/4 cenas');
      await fazerCenas(dir, { motor, paralelo: Number(o.paralelo ?? 3) });
      for (const l of langs.slice(1)) await traduzir(dir, l, { motor });
      console.log('4/4 render');
      const mp4 = await renderizar(dir, { langs, formatos: lista(o.formatos) ?? undefined, qualidade, trilha: o.trilha ?? null });
      console.log(`\npronto em ${((Date.now() - t0) / 60000).toFixed(1)} min · revisão: ${path.join(dir, 'revisao.html')}\n${mp4.join('\n')}`);
      break;
    }
    case 'dna': await lerDNA(pos[0], path.resolve(o.out ?? pastaPadrao(pos[0]))); break;
    case 'roteiro': await fazerRoteiro(path.resolve(pos[0]), { pedido: o.pedido, duracao: Number(o.duracao ?? 30), lang: o.lang ?? 'pt', motor }); break;
    case 'cenas': await fazerCenas(path.resolve(pos[0]), { motor, so: lista(o.so), paralelo: Number(o.paralelo ?? 3) }); break;
    case 'editar': await editarCena(path.resolve(pos[0]), pos[1], pos.slice(2).join(' '), { motor }); break;
    case 'voltar': voltarCena(path.resolve(pos[0]), pos[1], pos[2]); revisao(path.resolve(pos[0])); console.log(`  ${pos[1]} voltou para v${pos[2]}`); break;
    case 'traduzir': await traduzir(path.resolve(pos[0]), o.lang ?? 'en', { motor }); break;
    case 'render': {
      const mp4 = await renderizar(path.resolve(pos[0]), { langs: lista(o.langs), formatos: lista(o.formatos) ?? undefined, qualidade, trilha: o.trilha ?? null });
      console.log(mp4.join('\n'));
      break;
    }
    case 'revisao': revisao(path.resolve(pos[0])); break;
    default: console.log(AJUDA); process.exit(cmd && cmd !== 'ajuda' && cmd !== '--help' ? 1 : 0);
  }
} catch (e) {
  console.error(`\nerro: ${e.message}`);
  process.exit(1);
}

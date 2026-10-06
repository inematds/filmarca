// Garante que cena quebrada é recusada e que a cena-modelo entra no lugar e passa. Sem IA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarEstatico, validarExecucao, abrirNavegador } from '../src/validar.mjs';
import { cenaModelo, MODELOS } from '../src/modelos.mjs';
import { prepararAssets, composicao } from '../src/projeto.mjs';
import { extrairJSON } from '../src/ia.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const marca = {
  nome: 'Teste', dominio: 'teste.dev', logo: null, prints: [], fontes: {},
  cores: { fundo: '#0b1020', tinta: '#ffffff', primaria: '#22d3ee', destaque: '#a78bfa', suave: '#111827', escuro: true },
};
const quebrada = JSON.parse(fs.readFileSync(path.join(AQUI, 'cena-quebrada.json'), 'utf8'));

test('validação estática recusa a cena quebrada', () => {
  const erros = validarEstatico(quebrada);
  assert.ok(erros.some((e) => /rede|fetch/.test(e)), erros.join('\n'));
  assert.ok(erros.some((e) => /Math.random/.test(e)));
  assert.ok(erros.some((e) => /animação CSS/.test(e)));
  assert.ok(erros.some((e) => /não existe em textos/.test(e)));
});

test('cena que estoura o quadro é recusada na execução e a cena-modelo passa', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filmarca-teste-'));
  prepararAssets(dir);
  const b = await abrirNavegador();
  try {
    const estoura = { id: 'x1', tipo: 'titulo', duracao: 3, textos: { frase: 'Uma frase longa demais que não cabe' },
      css: '.f{position:absolute;left:50cqw;top:40cqh;white-space:nowrap;font-size:30cqmin}', html: '<div class="f">{{frase}}</div>',
      js: "tl.fromTo(q('.f'),{opacity:0},{opacity:1,duration:0.5},0);" };
    assert.deepEqual(validarEstatico(estoura), []);
    const r = await validarExecucao(estoura, marca, dir, b, { miniaturas: false });
    assert.equal(r.ok, false);
    assert.ok(r.erros.some((e) => /sai do quadro/.test(e)), r.erros.join('\n'));
    for (const tipo of Object.keys(MODELOS)) {
      const m = cenaModelo({ id: `m-${tipo}`, tipo, duracao: 3.5, textos: { frase: 'Frase', rotulo: 'R', numero: '+40', legenda: 'legenda', titulo: 'Título', itens: ['um', 'dois'], chamada: 'Vem', botao: 'Ir' } });
      assert.deepEqual(validarEstatico(m), [], tipo);
      const v = await validarExecucao(m, marca, dir, b, { miniaturas: false });
      assert.ok(v.ok, `${tipo}: ${v.erros.join(' | ')}`);
    }
  } finally { await b.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('palavra partida entre linhas é recusada', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filmarca-teste-'));
  prepararAssets(dir);
  const b = await abrirNavegador();
  try {
    const partida = { id: 'p1', tipo: 'livre', duracao: 3, textos: { t: 'Comunidade' },
      css: '.c{position:absolute;left:10cqw;top:30cqh;width:12cqmin;font-size:6cqmin;overflow-wrap:anywhere}', html: '<div class="c">{{t}}</div>',
      js: "tl.fromTo(q('.c'),{opacity:0},{opacity:1,duration:0.3},0);" };
    const r = await validarExecucao(partida, marca, dir, b, { miniaturas: false });
    assert.ok(r.erros.some((e) => /palavra partida/.test(e)), r.erros.join('\n'));
  } finally { await b.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('composição tem um único root com a duração somada', () => {
  const cenas = [cenaModelo({ id: 'a', tipo: 'titulo', duracao: 2, textos: { frase: 'x' } }), cenaModelo({ id: 'b', tipo: 'cta', duracao: 3, textos: { chamada: 'y', botao: 'z' } })];
  const html = composicao(marca, cenas, '9x16');
  assert.equal((html.match(/data-composition-id=/g) ?? []).length, 1);
  assert.match(html, /data-width="1080" data-height="1920" data-duration="5.000"/);
});

test('extrairJSON acha o JSON no meio do texto', () => {
  assert.deepEqual(extrairJSON('aqui:\n```json\n{"a":"}{","b":[1,2]}\n```'), { a: '}{', b: [1, 2] });
  assert.deepEqual(extrairJSON('ok {"x":1} fim'), { x: 1 });
});

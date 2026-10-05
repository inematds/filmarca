// IA pela ASSINATURA: chama o Claude Code (`claude -p`) ou o Codex (`codex exec`) já logados na máquina.
// Nenhuma chave de API é lida ou enviada. O modelo vem de ~/.config/inema/modelos.env quando existir.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function lerModelos() {
  const f = path.join(os.homedir(), '.config/inema/modelos.env');
  const env = {};
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}

// nivel: 'topo' (diretor, cenas) ou 'menor' (leitura, tradução).
export function escolherModelo(motor, nivel) {
  const env = { ...lerModelos(), ...process.env };
  const chave = `INEMA_${motor === 'codex' ? 'CODEX' : 'CLAUDE'}_${nivel === 'menor' ? 'MENOR' : 'TOPO'}`;
  if (process.env.FILMARCA_MODELO) return process.env.FILMARCA_MODELO;
  return env[chave] || (motor === 'codex' ? (nivel === 'menor' ? 'gpt-6-luna' : 'gpt-6-astra') : (nivel === 'menor' ? 'sonnet' : 'opus'));
}

function rodar(cmd, args, entrada, ms) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: os.tmpdir() });
    let out = '', err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`${cmd} passou de ${ms / 1000}s`)); }, ms);
    p.stdout.on('data', (c) => (out += c));
    p.stderr.on('data', (c) => (err += c));
    p.on('error', (e) => { clearTimeout(t); reject(e); });
    p.on('close', (code) => { clearTimeout(t); code === 0 ? resolve(out) : reject(new Error(`${cmd} saiu com ${code}: ${(err || out).slice(-400)}`)); });
    p.stdin.end(entrada);
  });
}

async function viaClaude(sistema, pedido, modelo, ms) {
  // Modo enxuto: sem ferramentas, sem MCP, sem hooks/CLAUDE.md do usuário, sem sessão gravada.
  const args = ['-p', '--output-format', 'json', '--model', modelo, '--system-prompt', sistema, '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence'];
  const out = await rodar('claude', args, pedido, ms);
  const j = JSON.parse(out);
  if (j.is_error) throw new Error(`claude: ${String(j.result).slice(0, 300)}`);
  return String(j.result ?? '');
}

async function viaCodex(sistema, pedido, modelo, ms) {
  const saida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'filmarca-')), 'resposta.txt');
  await rodar('codex', ['exec', '-m', modelo, '-s', 'read-only', '--skip-git-repo-check', '--ephemeral', '-o', saida, '-'], `${sistema}\n\n---\n\n${pedido}`, ms);
  return fs.readFileSync(saida, 'utf8');
}

/** Extrai o primeiro objeto/array JSON de uma resposta (aceita cerca de código ```json). */
export function extrairJSON(texto) {
  const cerca = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  const bruto = cerca ? cerca[1] : texto;
  const ini = bruto.search(/[[{]/);
  if (ini < 0) throw new Error('a resposta não tem JSON');
  const abre = bruto[ini], fecha = abre === '{' ? '}' : ']';
  let nivel = 0, emStr = false, esc = false;
  for (let i = ini; i < bruto.length; i++) {
    const c = bruto[i];
    if (emStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') emStr = false; continue; }
    if (c === '"') emStr = true;
    else if (c === abre) nivel++;
    else if (c === fecha && --nivel === 0) return JSON.parse(bruto.slice(ini, i + 1));
  }
  throw new Error('JSON incompleto na resposta');
}

/**
 * Pede JSON à IA. `motor` = 'claude' (padrão) ou 'codex'. Uma nova tentativa se o JSON vier quebrado.
 * Registra cada chamada em `log` (tempo e modelo) para o usuário ver o que foi usado da assinatura.
 */
export async function pedirJSON({ sistema, pedido, motor = 'claude', nivel = 'topo', ms = 300000, log = () => {}, nome = 'ia' }) {
  const modelo = escolherModelo(motor, nivel);
  const chamar = motor === 'codex' ? viaCodex : viaClaude;
  let ultimoErro;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const t0 = Date.now();
    try {
      const txt = await chamar(sistema, tentativa === 1 ? pedido : `${pedido}\n\nATENÇÃO: a resposta anterior não era JSON válido (${ultimoErro.message}). Responda SOMENTE com o JSON.`, modelo, ms);
      const j = extrairJSON(txt);
      log(`  [${nome}] ${motor}/${modelo} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return j;
    } catch (e) {
      ultimoErro = e;
      log(`  [${nome}] tentativa ${tentativa} falhou: ${e.message.slice(0, 160)}`);
    }
  }
  throw ultimoErro;
}

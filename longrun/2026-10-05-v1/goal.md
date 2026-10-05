# Goal — filmarca v1

Ferramenta nova, escrita do zero (clean-room — o `noeltg77/motive` não tem licença; só o método foi reaproveitado):
site → DNA da marca → roteiro → cenas HyperFrames → MP4 16:9, 9:16 e 1:1, com IA pela assinatura (claude -p / codex exec), sem chave de API.

## Critério de pronto (comando → saída esperada)

1. `node bin/filmarca.mjs dna https://inema.club --out <dir>` → `<dir>/marca.json` com cores (≥3 hex), fontes (≥1), logo ou nome, ≥1 screenshot.
2. `node bin/filmarca.mjs make https://inema.club --out <dir>` → `<dir>/renders/*-16x9.mp4`, `*-9x16.mp4`, `*-1x1.mp4`; ffprobe 1920×1080 / 1080×1920 / 1080×1080; duração = soma das cenas ±0,5 s.
3. `npx hyperframes lint` no projeto gerado → 0 erros.
4. Regressão/limite: cena propositalmente quebrada (`test/cena-quebrada.html`) → validador recusa, entra cena-modelo, render conclui (`node test/fallback.test.mjs` → OK).
5. Nenhuma chave de API lida: `grep -rnE "API_KEY|api.openai.com|api.anthropic.com" src bin` → vazio.
6. `--lang en` e `--lang es` geram textos no idioma (roteiro.json com lang correto).
7. Demo do inema.club gerado PELA ferramenta (não à mão) em `docs/demo-16x9.mp4` + gif.
8. Repo `inematds/filmarca` no ar; `https://inematds.github.io/filmarca/guia/`, `/guia/en/`, `/guia/es/` → 200.
9. Card no portal (inema.club) via atualiza-portal, push no origin.

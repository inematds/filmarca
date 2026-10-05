# Estado — 2026-10-05 ~18:55
Feito e testado: dna.mjs (inema.club ok), projeto.mjs (composição HF, 3 formatos), modelos.mjs (6 cenas-modelo validadas), validar.mjs (estático + execução), render HF 16:9 ok (22 s em 7 s).
Escrito, sem teste com IA: ia.mjs, filme.mjs, prompts/, bin/filmarca.mjs.
Parou: limite de sessão do claude -p (429, volta às 21h).
Próximo: 1) logo em texto quando não há logo (fazerCenas); 2) rodar `node bin/filmarca.mjs fazer https://inema.club --out ~/projetos/output/filmarca/teste1 --rascunho` (ou --motor codex); 3) teste de reserva (test/), README, LICENSE MIT; 4) repo inematds/filmarca, guia PT/EN/ES, portal.
Armadilhas: page.evaluate não pode devolver objeto GSAP/FontFaceSet (trava); o harness precisa de html/body 100%; um index por pasta (lint).

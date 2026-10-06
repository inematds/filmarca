Você anima UMA cena de um filme de produto. A cena é um pedaço de HTML + CSS + JavaScript (GSAP) que roda dentro de uma composição HyperFrames e é renderizada quadro a quadro em vídeo. Devolva SOMENTE um JSON `{ "css": "...", "html": "...", "js": "..." }`.

## O contrato (siga à risca; uma validação automática recusa o que fugir dele)

**Tela.** A cena ocupa um contêiner do tamanho do quadro, com `container-type: size`. O MESMO código é renderizado em 16:9 (1920×1080), 9:16 (1080×1920) e 1:1 (1080×1080). Por isso:
- Meça TUDO em unidades do contêiner: `cqw`, `cqh`, `cqmin`. Nunca `px` para tamanho de fonte, larguras ou posições (px só em bordas finas).
- Fonte do título entre 5 e 12 `cqmin`; texto de apoio entre 3 e 5 `cqmin`.
- Para layout diferente no vertical, use `@container (aspect-ratio < 1) { ... }`.
- Todo texto precisa caber no quadro nos três formatos. Margem lateral mínima de 6cqw.
- Nunca parta palavra ao meio: não use `word-break: break-all` nem `overflow-wrap: anywhere`. Em caixa estreita (cartão, coluna), reduza a fonte ou empilhe os cartões no vertical/quadrado com `@container`.

**CSS.** Escreva seletores simples (`.titulo`, `.cartao span`); eles são automaticamente aninhados dentro da cena, então não colidem com outras cenas. Use as variáveis da marca: `var(--fundo)`, `var(--tinta)`, `var(--primaria)`, `var(--destaque)`, `var(--suave)`, `var(--fonte-titulo)`, `var(--fonte-texto)`. Pode usar `color-mix()`, gradientes, `clip-path`, `box-shadow`, SVG inline. PROIBIDO: `@keyframes`, `animation`, `transition`, `@font-face`, `@import`, `url()` externa.

**HTML.** Só a marcação interna da cena (sem `<section>`, sem `<style>`, sem `<script>`). TODO texto visível entra por marcador `{{chave}}`, usando as chaves de `textos` da cena (item de lista: `{{itens.0}}`, `{{itens.1}}`…) — nunca escreva o texto literal no HTML (é assim que o filme é traduzido sem refazer o código). Marcadores extras disponíveis: `{{logo}}` (caminho do logo, para `<img src="{{logo}}">`), `{{midia}}` (caminho do print da cena), `{{marca}}`, `{{dominio}}`. Pode usar `<svg>` inline com formas. PROIBIDO: `<script>`, `<style>`, `<iframe>`, `<video>`, `<audio>`, atributos `on*`, qualquer `src`/`href` externo.

**JS.** É o CORPO de uma função `(tl, q, qa, D, gsap)`:
- `tl` = linha do tempo GSAP da cena (pausada; o tempo 0 é o início da cena). Coloque TODAS as animações nela com posição explícita: `tl.fromTo(q('.titulo'), {opacity:0, y:40}, {opacity:1, y:0, duration:0.8, ease:'power3.out'}, 0.3)`.
- `q(sel)` / `qa(sel)` = `querySelector` / `querySelectorAll` dentro da cena.
- `D` = duração da cena em segundos. Nada pode passar de `D`.
- Use `fromTo` (ou `set` + `to`) para o estado inicial ficar dentro do GSAP — não ponha `transform` inicial no CSS de um elemento que o GSAP vai mover.
- Para contar números: anime um objeto (`const o={v:0}; tl.to(o,{v:400,duration:1.5,onUpdate:()=>{q('.n').textContent=Math.round(o.v)}},0.4)`) — mas só se o texto for número puro; se o número vier com símbolo ("+400"), anime escala/opacidade em vez de contar.
- PROIBIDO: `window`, `document`, `Date`, `Math.random`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `fetch`, `import`, `eval`, `repeat:-1`. Repetição só finita (`repeat: 3`). Valores "aleatórios" = números fixos escritos no código.

## Qualidade

- Comece com movimento já no primeiro meio segundo; termine a cena composta (pode fazer saída nos últimos 0,4 s).
- Hierarquia clara: um elemento principal grande, o resto apoia.
- Movimento com intenção: entradas escalonadas (`stagger`), easing `power3.out`/`expo.out` para entrar, nada de piscar.
- Respeite a direção da cena e a identidade da marca (cores, fontes, raio de borda, tom).
- Fundo da cena já é `var(--fundo)`; acrescente profundidade (gradiente suave, formas, grade, brilho) quando ajudar.

## Exemplo de uma cena válida (tipo `numero`)

{"css": ".caixa{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2cqmin;text-align:center;padding:0 8cqw}\n.numero{font-family:var(--fonte-titulo);font-weight:800;font-size:30cqmin;line-height:.9;color:var(--primaria)}\n.legenda{font-size:4.6cqmin;max-width:70cqw}", "html": "<div class=\"caixa\"><div class=\"numero\">{{numero}}</div><div class=\"legenda\">{{legenda}}</div></div>", "js": "tl.fromTo(q('.numero'),{scale:0.6,opacity:0},{scale:1,opacity:1,duration:0.9,ease:'back.out(1.6)'},0.2)\n.fromTo(q('.legenda'),{opacity:0,y:30},{opacity:1,y:0,duration:0.7,ease:'power3.out'},0.8)\n.to(q('.caixa'),{opacity:0,duration:0.4},D-0.4);"}

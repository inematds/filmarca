// Cenas-modelo: escritas à mão, sempre funcionam. Entram quando a cena escrita pela IA não passa na validação,
// e servem de exemplo do contrato para a IA. Medidas em unidades do contêiner (cqw/cqh/cqmin),
// então a mesma cena serve em 16:9, 9:16 e 1:1.

export const MODELOS = {
  abertura: {
    textos: ['frase'],
    css: `
.fundo{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%, color-mix(in srgb,var(--primaria) 22%,transparent), transparent 62%)}
.centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4cqmin;padding:0 8cqw;text-align:center}
.logo{height:16cqmin;max-width:60cqw;object-fit:contain}
.frase{margin:0;font-family:var(--fonte-titulo);font-weight:800;font-size:6.4cqmin;line-height:1.08;max-width:80cqw}
.linha{width:18cqmin;height:.7cqmin;background:var(--primaria);border-radius:1cqmin}`,
    html: `<div class="fundo"></div><div class="centro"><img class="logo" src="{{logo}}" alt="{{marca}}" /><div class="linha"></div><h1 class="frase">{{frase}}</h1></div>`,
    js: `tl.fromTo(q('.fundo'),{opacity:0,scale:1.2},{opacity:1,scale:1,duration:D*0.8,ease:'power2.out'},0)
.fromTo(q('.logo'),{opacity:0,y:30},{opacity:1,y:0,duration:0.8,ease:'power3.out'},0.2)
.fromTo(q('.linha'),{scaleX:0},{scaleX:1,duration:0.6,ease:'power2.inOut'},0.7)
.fromTo(q('.frase'),{opacity:0,y:40},{opacity:1,y:0,duration:0.9,ease:'power3.out'},0.9)
.to(q('.centro'),{opacity:0,duration:0.4},D-0.4);`,
  },
  titulo: {
    textos: ['rotulo', 'frase'],
    css: `
.caixa{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:3cqmin;padding:0 9cqw}
.rotulo{font-size:3cqmin;letter-spacing:.3em;text-transform:uppercase;color:var(--primaria);font-weight:700}
.frase{margin:0;font-family:var(--fonte-titulo);font-weight:800;font-size:8.5cqmin;line-height:1.04}
.barra{position:absolute;left:0;bottom:0;height:1.2cqmin;width:100%;background:linear-gradient(90deg,var(--primaria),var(--destaque));transform-origin:left}`,
    html: `<div class="caixa"><div class="rotulo">{{rotulo}}</div><h2 class="frase">{{frase}}</h2></div><div class="barra"></div>`,
    js: `tl.fromTo(q('.rotulo'),{opacity:0,x:-40},{opacity:1,x:0,duration:0.6,ease:'power3.out'},0.1)
.fromTo(q('.frase'),{opacity:0,y:60},{opacity:1,y:0,duration:0.9,ease:'power4.out'},0.3)
.fromTo(q('.barra'),{scaleX:0},{scaleX:1,duration:D-0.6,ease:'none'},0.3)
.to(q('.caixa'),{opacity:0,y:-30,duration:0.4},D-0.4);`,
  },
  numero: {
    textos: ['numero', 'legenda'],
    css: `
.caixa{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2cqmin;text-align:center;padding:0 8cqw}
.numero{font-family:var(--fonte-titulo);font-weight:800;font-size:30cqmin;line-height:.9;color:var(--primaria)}
.legenda{font-size:4.6cqmin;max-width:70cqw;line-height:1.25}
.anel{position:absolute;left:50%;top:50%;width:80cqmin;height:80cqmin;margin:-40cqmin 0 0 -40cqmin;border-radius:50%;border:.5cqmin solid color-mix(in srgb,var(--primaria) 35%,transparent)}`,
    html: `<div class="anel"></div><div class="caixa"><div class="numero">{{numero}}</div><div class="legenda">{{legenda}}</div></div>`,
    js: `tl.fromTo(q('.anel'),{scale:0.4,opacity:0},{scale:1.15,opacity:1,duration:D,ease:'power1.out'},0)
.fromTo(q('.numero'),{scale:0.6,opacity:0},{scale:1,opacity:1,duration:0.9,ease:'back.out(1.6)'},0.2)
.fromTo(q('.legenda'),{opacity:0,y:30},{opacity:1,y:0,duration:0.7,ease:'power3.out'},0.8)
.to(q('.caixa'),{opacity:0,duration:0.4},D-0.4);`,
  },
  print: {
    textos: ['legenda'],
    css: `
.janela{position:absolute;left:7cqw;right:7cqw;top:9cqh;bottom:22cqh;border-radius:2cqmin;overflow:hidden;background:#fff;box-shadow:0 3cqmin 8cqmin rgba(0,0,0,.45)}
.barra{height:4.5cqmin;background:#e9e9ee;display:flex;align-items:center;gap:1.2cqmin;padding:0 2cqmin}
.barra i{width:1.6cqmin;height:1.6cqmin;border-radius:50%;background:#c9c9d1}
.tela{position:absolute;left:0;right:0;top:4.5cqmin;bottom:0;overflow:hidden}
.tela img{width:100%;display:block}
.legenda{position:absolute;left:7cqw;right:7cqw;bottom:6cqh;font-family:var(--fonte-titulo);font-weight:800;font-size:5cqmin;line-height:1.15}`,
    html: `<div class="janela"><div class="barra"><i></i><i></i><i></i></div><div class="tela"><img src="{{midia}}" alt="" /></div></div><div class="legenda">{{legenda}}</div>`,
    js: `tl.fromTo(q('.janela'),{opacity:0,y:80,scale:0.94},{opacity:1,y:0,scale:1,duration:0.9,ease:'power3.out'},0)
.fromTo(q('.tela img'),{yPercent:0},{yPercent:-18,duration:D,ease:'none'},0)
.fromTo(q('.legenda'),{opacity:0,y:30},{opacity:1,y:0,duration:0.7,ease:'power3.out'},0.5)
.to([q('.janela'),q('.legenda')],{opacity:0,duration:0.4},D-0.4);`,
  },
  lista: {
    textos: ['titulo', 'itens'],
    css: `
.caixa{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:4cqmin;padding:0 9cqw}
.titulo{margin:0;font-family:var(--fonte-titulo);font-weight:800;font-size:6.5cqmin;line-height:1.08}
.itens{display:flex;flex-direction:column;gap:2.6cqmin;margin:0;padding:0;list-style:none}
.itens li{display:flex;align-items:center;gap:2.4cqmin;font-size:4.4cqmin;line-height:1.2}
.itens li b{flex:none;width:5cqmin;height:5cqmin;border-radius:50%;background:var(--primaria);color:var(--fundo);display:flex;align-items:center;justify-content:center;font-size:2.8cqmin}`,
    html: `<div class="caixa"><h2 class="titulo">{{titulo}}</h2><ul class="itens">{{itens_li}}</ul></div>`,
    js: `tl.fromTo(q('.titulo'),{opacity:0,y:40},{opacity:1,y:0,duration:0.7,ease:'power3.out'},0.1)
.fromTo(qa('.itens li'),{opacity:0,x:-50},{opacity:1,x:0,duration:0.6,ease:'power3.out',stagger:0.35},0.6)
.to(q('.caixa'),{opacity:0,duration:0.4},D-0.4);`,
  },
  cta: {
    textos: ['chamada', 'botao'],
    css: `
.caixa{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4.5cqmin;text-align:center;padding:0 8cqw;background:linear-gradient(160deg,var(--fundo) 40%,color-mix(in srgb,var(--primaria) 25%,var(--fundo)))}
.logo{height:12cqmin;max-width:50cqw;object-fit:contain}
.chamada{margin:0;font-family:var(--fonte-titulo);font-weight:800;font-size:7cqmin;line-height:1.08;max-width:84cqw}
.botao{padding:2.4cqmin 6cqmin;border-radius:10cqmin;background:var(--primaria);color:var(--fundo);font-weight:700;font-size:4cqmin}
.dominio{font-size:3.4cqmin;opacity:.8;letter-spacing:.06em}`,
    html: `<div class="caixa"><img class="logo" src="{{logo}}" alt="{{marca}}" /><h2 class="chamada">{{chamada}}</h2><div class="botao">{{botao}}</div><div class="dominio">{{dominio}}</div></div>`,
    js: `tl.fromTo(q('.logo'),{opacity:0,scale:0.8},{opacity:1,scale:1,duration:0.7,ease:'back.out(1.4)'},0.1)
.fromTo(q('.chamada'),{opacity:0,y:40},{opacity:1,y:0,duration:0.8,ease:'power3.out'},0.4)
.fromTo(q('.botao'),{opacity:0,scale:0.7},{opacity:1,scale:1,duration:0.6,ease:'back.out(2)'},1.0)
.fromTo(q('.dominio'),{opacity:0},{opacity:0.8,duration:0.6},1.4);`,
  },
};

/** Constrói a cena-modelo do tipo pedido com os textos da cena (lista vira <li>). */
export function cenaModelo(cena) {
  const m = MODELOS[cena.tipo] ?? MODELOS.titulo;
  let html = m.html;
  if (html.includes('{{itens_li}}')) {
    const itens = Array.isArray(cena.textos?.itens) ? cena.textos.itens : String(cena.textos?.itens ?? '').split(/\s*[·|;]\s*/);
    html = html.replace('{{itens_li}}', itens.filter(Boolean).slice(0, 5).map((_, i) => `<li><b>${i + 1}</b><span>{{item${i + 1}}}</span></li>`).join(''));
    cena = { ...cena, textos: { ...cena.textos, ...Object.fromEntries(itens.map((t, i) => [`item${i + 1}`, t])) } };
  }
  // Tipo sem modelo próprio: usa o primeiro texto como frase.
  if (!MODELOS[cena.tipo]) {
    const vals = Object.values(cena.textos ?? {}).flat();
    cena = { ...cena, textos: { rotulo: '', frase: vals[0] ?? '', ...cena.textos } };
  }
  return { ...cena, css: m.css, html, js: m.js, origem: 'modelo' };
}

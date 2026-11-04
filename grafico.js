// Gráfico de barras em SVG com as entradas e saídas de cada dia do mês.

function desenharGrafico(caixas, mes) {
  const area = document.getElementById('grafico');
  const totais = document.getElementById('graficoTotais');
  const [ano, numeroMes] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, numeroMes, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, () => ({ entradas: 0, saidas: 0 }));

  for (const caixa of caixas.filter(c => c.data.startsWith(mes))) {
    const dia = dias[Number(caixa.data.slice(8)) - 1];
    const { entradas, saidas } = resumir(caixa);
    dia.entradas += entradas;
    dia.saidas += saidas;
  }

  const somaEntradas = dias.reduce((soma, dia) => soma + dia.entradas, 0);
  const somaSaidas = dias.reduce((soma, dia) => soma + dia.saidas, 0);
  if (somaEntradas + somaSaidas === 0) {
    area.innerHTML = '<p class="suave">Nenhum lançamento neste mês.</p>';
    totais.textContent = '';
    return;
  }

  const largura = 720, altura = 280, esquerda = 70, topo = 12, base = 28;
  const alturaUtil = altura - topo - base;
  const maior = Math.max(...dias.flatMap(dia => [dia.entradas, dia.saidas]));
  const passo = (largura - esquerda) / diasNoMes;
  const barra = Math.max(passo * 0.36, 2);
  const y = valor => topo + alturaUtil - (valor / maior) * alturaUtil;

  let svg = '';
  for (let i = 0; i <= 4; i++) {
    const valor = (maior / 4) * i;
    svg += `<line x1="${esquerda}" x2="${largura}" y1="${y(valor)}" y2="${y(valor)}"/>`;
    svg += `<text x="${esquerda - 8}" y="${y(valor) + 4}" text-anchor="end">${Math.round(valor / 100)}</text>`;
  }
  dias.forEach((dia, i) => {
    const x = esquerda + i * passo + passo * 0.12;
    const rotulo = `${String(i + 1).padStart(2, '0')}/${String(numeroMes).padStart(2, '0')}`;
    if (dia.entradas) svg += `<rect class="barra-entrada" x="${x}" y="${y(dia.entradas)}" width="${barra}" height="${topo + alturaUtil - y(dia.entradas)}"><title>${rotulo}: entradas ${moeda(dia.entradas)}</title></rect>`;
    if (dia.saidas) svg += `<rect class="barra-saida" x="${x + barra}" y="${y(dia.saidas)}" width="${barra}" height="${topo + alturaUtil - y(dia.saidas)}"><title>${rotulo}: saídas ${moeda(dia.saidas)}</title></rect>`;
    if (i === 0 || (i + 1) % 5 === 0) svg += `<text x="${x + barra}" y="${altura - 8}" text-anchor="middle">${i + 1}</text>`;
  });

  const descricao = `Entradas de ${moeda(somaEntradas)} e saídas de ${moeda(somaSaidas)} no mês`;
  area.innerHTML = `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${descricao}">${svg}</svg>`;
  totais.textContent = `Total do mês: entradas ${moeda(somaEntradas)}, saídas ${moeda(somaSaidas)}, resultado ${moeda(somaEntradas - somaSaidas)}. Valores do eixo em reais.`;
}

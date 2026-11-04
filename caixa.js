// Tela do sistema: abertura, lançamentos, fechamento e histórico.

const el = id => document.getElementById(id);
let caixas = carregar();
let editandoId = null;

const caixaAberto = () => caixas.find(caixa => !caixa.fechado);

function avisar(id, texto, erro = false) {
  el(id).textContent = texto;
  el(id).classList.toggle('erro', erro);
}

function limparAvisos() {
  ['msgGeral', 'msgAbrir', 'msgLanc', 'msgFechar'].forEach(id => avisar(id, ''));
}

function persistir() {
  if (!salvar(caixas)) avisar('msgGeral', 'Não foi possível salvar neste navegador.', true);
  desenhar();
}

function confirmar(texto) {
  return new Promise(resolver => {
    const dialogo = el('dialogo');
    const responder = resposta => {
      dialogo.close();
      resolver(resposta);
    };
    el('dialogoTexto').textContent = texto;
    el('dialogoSim').onclick = () => responder(true);
    el('dialogoNao').onclick = () => responder(false);
    dialogo.oncancel = () => resolver(false); // tecla Esc
    dialogo.showModal();
  });
}

function desenharResumo(caixa) {
  const { entradas, saidas, esperado } = resumir(caixa);
  const cartoes = [
    ['Valor inicial', moeda(caixa.inicial)],
    ['Entradas', moeda(entradas)],
    ['Saídas', moeda(saidas)],
    ['Dinheiro esperado na gaveta', moeda(esperado)],
  ];
  el('tAberto').textContent = `Caixa aberto em ${dataBR(caixa.data)}`;
  el('resumo').innerHTML = cartoes.map(([rotulo, valor]) => `<div class="cartao"><span>${rotulo}</span><strong>${valor}</strong></div>`).join('');
}

function desenharCaixas(lista) {
  el('tabelaCaixas').innerHTML = lista.map(caixa => {
    const { entradas, saidas, esperado } = resumir(caixa);
    const diferenca = caixa.fechado ? caixa.contado - esperado : null;
    const classe = diferenca < 0 ? 'saida' : diferenca > 0 ? 'entrada' : '';
    return `<tr>
      <td>${dataBR(caixa.data)}</td><td>${caixa.fechado ? 'Fechado' : 'Aberto'}</td>
      <td class="num">${moeda(caixa.inicial)}</td><td class="num">${moeda(entradas)}</td>
      <td class="num">${moeda(saidas)}</td><td class="num">${moeda(esperado)}</td>
      <td class="num">${caixa.fechado ? moeda(caixa.contado) : '-'}</td>
      <td class="num ${classe}">${caixa.fechado ? moeda(diferenca) : '-'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="suave">Nenhum caixa encontrado.</td></tr>';
}

function desenharLancamentos(lista) {
  el('tabelaLanc').innerHTML = lista.flatMap(caixa => caixa.lancamentos.map(lanc => `<tr>
    <td>${dataBR(caixa.data)}</td>
    <td class="${lanc.tipo}">${lanc.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
    <td>${escapar(lanc.descricao)}</td><td>${escapar(lanc.categoria)}</td><td>${escapar(lanc.pagamento)}</td>
    <td class="num">${moeda(lanc.valor)}</td>
    <td>${caixa.fechado ? '<span class="suave">Caixa fechado</span>' : `<button type="button" data-editar="${lanc.id}">Editar</button> <button type="button" class="perigo" data-excluir="${lanc.id}">Excluir</button>`}</td>
  </tr>`)).join('') || '<tr><td colspan="7" class="suave">Nenhum lançamento encontrado.</td></tr>';
}

function desenhar() {
  const aberto = caixaAberto();
  el('secAbrir').hidden = Boolean(aberto);
  el('secAberto').hidden = !aberto;
  if (aberto) desenharResumo(aberto);

  const filtro = el('filtroData').value;
  const lista = caixas.filter(caixa => !filtro || caixa.data === filtro).sort((a, b) => b.data.localeCompare(a.data));
  desenharCaixas(lista);
  desenharLancamentos(lista);
  desenharGrafico(caixas, el('graficoMes').value || dataISO().slice(0, 7));
}

function sairDaEdicao() {
  editandoId = null;
  el('formLanc').reset();
  el('tLanc').textContent = 'Novo lançamento';
  el('btnSalvarLanc').textContent = 'Adicionar';
  el('btnCancelarEdicao').hidden = true;
}

function iniciarEdicao(id) {
  const lanc = caixaAberto().lancamentos.find(item => item.id === id);
  editandoId = id;
  el('lancTipo').value = lanc.tipo;
  el('lancDescricao').value = lanc.descricao;
  el('lancValor').value = paraTexto(lanc.valor);
  el('lancCategoria').value = lanc.categoria;
  el('lancPagamento').value = lanc.pagamento;
  el('tLanc').textContent = 'Editar lançamento';
  el('btnSalvarLanc').textContent = 'Salvar alteração';
  el('btnCancelarEdicao').hidden = false;
  el('lancDescricao').focus();
}

async function excluirLancamento(id) {
  if (!await confirmar('Excluir este lançamento?')) return;
  const aberto = caixaAberto();
  aberto.lancamentos = aberto.lancamentos.filter(lanc => lanc.id !== id);
  if (editandoId === id) sairDaEdicao();
  limparAvisos();
  avisar('msgLanc', 'Lançamento excluído.');
  persistir();
}

el('formAbrir').addEventListener('submit', evento => {
  evento.preventDefault();
  limparAvisos();
  const data = el('abrirData').value;
  const inicial = paraCentavos(el('abrirValor').value);

  if (!data) return avisar('msgAbrir', 'Informe a data.', true);
  if (data > dataISO()) return avisar('msgAbrir', 'A data não pode estar no futuro.', true);
  if (caixas.some(caixa => caixa.data === data)) return avisar('msgAbrir', 'Já existe um caixa nesta data.', true);
  if (inicial === null) return avisar('msgAbrir', 'Informe um valor inicial válido, como 100,00.', true);

  caixas.push({ id: novoId(), data, inicial, lancamentos: [], contado: null, fechado: false });
  el('formAbrir').reset();
  el('abrirData').value = dataISO();
  el('graficoMes').value = data.slice(0, 7);
  avisar('msgLanc', 'Caixa aberto.');
  persistir();
});

el('formLanc').addEventListener('submit', evento => {
  evento.preventDefault();
  limparAvisos();
  const aberto = caixaAberto();
  if (!aberto) return avisar('msgAbrir', 'Abra o caixa antes de lançar.', true);

  const descricao = el('lancDescricao').value.trim();
  const valor = paraCentavos(el('lancValor').value);
  if (!descricao) return avisar('msgLanc', 'Informe a descrição.', true);
  if (!valor) return avisar('msgLanc', 'Informe um valor maior que zero, como 25,90.', true);

  const dados = {
    tipo: el('lancTipo').value, descricao, valor,
    categoria: el('lancCategoria').value, pagamento: el('lancPagamento').value,
  };
  if (editandoId) {
    Object.assign(aberto.lancamentos.find(lanc => lanc.id === editandoId), dados);
    avisar('msgLanc', 'Lançamento alterado.');
  } else {
    aberto.lancamentos.push({ id: novoId(), ...dados });
    avisar('msgLanc', 'Lançamento adicionado.');
  }
  sairDaEdicao();
  persistir();
});

el('formFechar').addEventListener('submit', async evento => {
  evento.preventDefault();
  limparAvisos();
  const aberto = caixaAberto();
  const contado = paraCentavos(el('fecharValor').value);
  if (contado === null) return avisar('msgFechar', 'Informe o dinheiro contado, como 150,00.', true);
  if (!await confirmar(`Fechar o caixa de ${dataBR(aberto.data)}? Depois disso os lançamentos não poderão ser alterados.`)) return;

  const diferenca = contado - resumir(aberto).esperado;
  aberto.contado = contado;
  aberto.fechado = true;
  el('formFechar').reset();
  sairDaEdicao();
  const resultado = diferenca === 0 ? 'sem diferença' : `com ${diferenca > 0 ? 'sobra' : 'falta'} de ${moeda(Math.abs(diferenca))}`;
  avisar('msgAbrir', `Caixa de ${dataBR(aberto.data)} fechado ${resultado}.`, diferenca !== 0);
  persistir();
});

el('tabelaLanc').addEventListener('click', evento => {
  const { editar, excluir } = evento.target.dataset;
  if (editar) iniciarEdicao(editar);
  if (excluir) excluirLancamento(excluir);
});

el('btnCancelarEdicao').addEventListener('click', sairDaEdicao);
el('filtroData').addEventListener('change', desenhar);
el('graficoMes').addEventListener('change', desenhar);
el('btnLimparFiltro').addEventListener('click', () => {
  el('filtroData').value = '';
  desenhar();
});

el('btnExemplo').addEventListener('click', async () => {
  if (caixas.length && !await confirmar('Substituir os dados atuais pelos dados de exemplo?')) return;
  caixas = criarExemplo();
  sairDaEdicao();
  limparAvisos();
  el('graficoMes').value = dataISO().slice(0, 7);
  avisar('msgGeral', 'Dados de exemplo carregados.');
  persistir();
});

el('btnCsv').addEventListener('click', () => {
  limparAvisos();
  if (!caixas.some(caixa => caixa.lancamentos.length)) return avisar('msgGeral', 'Não há lançamentos para exportar.', true);
  baixarCsv(caixas);
  avisar('msgGeral', 'Arquivo CSV gerado.');
});

el('btnLimpar').addEventListener('click', async () => {
  if (!await confirmar('Apagar todos os dados salvos neste navegador?')) return;
  caixas = [];
  sairDaEdicao();
  limparAvisos();
  avisar('msgGeral', 'Todos os dados foram apagados.');
  persistir();
});

for (const [id, opcoes] of [['lancCategoria', CATEGORIAS], ['lancPagamento', PAGAMENTOS]]) {
  el(id).innerHTML = opcoes.map(opcao => `<option>${opcao}</option>`).join('');
}
el('abrirData').value = dataISO();
el('abrirData').max = dataISO();
el('graficoMes').value = dataISO().slice(0, 7);
desenhar();

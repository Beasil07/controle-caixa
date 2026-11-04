// Armazenamento, regras de cálculo e formatação.
// Os valores são guardados em centavos (inteiros) para evitar erros de arredondamento.

const CHAVE = 'controle-caixa';
const CATEGORIAS = ['Vendas', 'Serviços', 'Fornecedores', 'Despesas', 'Retirada', 'Outros'];
const PAGAMENTOS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];

function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvar(caixas) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(caixas));
    return true;
  } catch {
    return false;
  }
}

// Aceita "10", "10,5", "10.50" e "1.234,56". Retorna null quando o texto é inválido.
function paraCentavos(texto) {
  let valor = String(texto).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(valor)) valor = valor.replaceAll('.', '');
  if (!/^\d+([.,]\d{1,2})?$/.test(valor)) return null;
  const [reais, decimais = ''] = valor.replace(',', '.').split('.');
  return Number(reais) * 100 + Number(decimais.padEnd(2, '0'));
}

const moeda = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paraTexto = centavos => (centavos / 100).toFixed(2).replace('.', ',');
const dataBR = iso => iso.split('-').reverse().join('/');
const novoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function dataISO(data = new Date()) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function escapar(texto) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto).replace(/[&<>"']/g, c => mapa[c]);
}

// Somente o dinheiro físico entra no valor esperado na gaveta: Pix e cartão não passam por ela.
function resumir(caixa) {
  const total = { entradas: 0, saidas: 0, esperado: caixa.inicial };
  for (const lanc of caixa.lancamentos) {
    const sinal = lanc.tipo === 'entrada' ? 1 : -1;
    total[lanc.tipo === 'entrada' ? 'entradas' : 'saidas'] += lanc.valor;
    if (lanc.pagamento === 'Dinheiro') total.esperado += sinal * lanc.valor;
  }
  return total;
}

function criarExemplo() {
  const modelos = [
    ['entrada', 'Venda de balcão', 8450, 'Vendas', 'Dinheiro'],
    ['entrada', 'Venda de balcão', 12990, 'Vendas', 'Pix'],
    ['entrada', 'Serviço de manutenção', 18000, 'Serviços', 'Cartão de débito'],
    ['saida', 'Material de limpeza', 3275, 'Despesas', 'Dinheiro'],
    ['entrada', 'Venda online', 9700, 'Vendas', 'Cartão de crédito'],
    ['saida', 'Pagamento de fornecedor', 11000, 'Fornecedores', 'Pix'],
  ];
  const caixas = [];
  for (let diasAtras = 20; diasAtras >= 0; diasAtras--) {
    const dia = new Date();
    dia.setDate(dia.getDate() - diasAtras);
    if (dia.getDay() === 0) continue;

    const quantidade = 3 + (diasAtras % 4);
    const lancamentos = Array.from({ length: quantidade }, (_, i) => {
      const [tipo, descricao, valor, categoria, pagamento] = modelos[(diasAtras + i) % modelos.length];
      return { id: novoId(), tipo, descricao, valor: valor + diasAtras * 35, categoria, pagamento };
    });
    const caixa = { id: novoId(), data: dataISO(dia), inicial: 20000, lancamentos, contado: null, fechado: false };
    if (diasAtras > 0) {
      caixa.contado = resumir(caixa).esperado - (diasAtras % 5 === 0 ? 150 : 0);
      caixa.fechado = true;
    }
    caixas.push(caixa);
  }
  return caixas;
}

// Exportação dos lançamentos em CSV, com ponto e vírgula para abrir direto no Excel em português.

function campoCsv(valor) {
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`; // impede que a planilha execute o texto como fórmula
  return `"${texto.replaceAll('"', '""')}"`;
}

function gerarCsv(caixas) {
  const linhas = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Pagamento', 'Valor']];
  for (const caixa of caixas) {
    for (const lanc of caixa.lancamentos) {
      const tipo = lanc.tipo === 'entrada' ? 'Entrada' : 'Saída';
      linhas.push([dataBR(caixa.data), tipo, lanc.descricao, lanc.categoria, lanc.pagamento, paraTexto(lanc.valor)]);
    }
  }
  return linhas.map(linha => linha.map(campoCsv).join(';')).join('\r\n');
}

function baixarCsv(caixas) {
  const arquivo = new Blob(['﻿', gerarCsv(caixas)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(arquivo);
  link.download = `controle-caixa-${dataISO()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

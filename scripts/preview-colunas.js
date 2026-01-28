const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./scripts/dados-migracao-financeiro.json'));

console.log('========================================================================');
console.log('         PREVIEW DAS COLUNAS - 5 PRIMEIROS REGISTROS                   ');
console.log('========================================================================');

console.log('\n--- TABELA: financeiro_despesas ---\n');

data.despesas.slice(0, 5).forEach((d, i) => {
  console.log(`  DESPESA ${i+1}:`);
  console.log(`    escritorio_id   : f2568999-0ae6-47db-9293-a6f1672ed421`);
  console.log(`    categoria       : ${d.categoria}`);
  console.log(`    descricao       : ${d.descricao.substring(0, 55)}...`);
  console.log(`    valor           : ${d.valor.toFixed(2)}`);
  console.log(`    data_vencimento : ${d.data_vencimento}`);
  console.log(`    data_pagamento  : ${d.data_pagamento || 'NULL'}`);
  console.log(`    status          : ${d.status}`);
  console.log(`    forma_pagamento : ${d.forma_pagamento}`);
  console.log(`    fornecedor      : ${d.fornecedor.substring(0, 35)}`);
  console.log('');
});

console.log('\n--- TABELA: financeiro_receitas ---\n');

data.receitas.slice(0, 5).forEach((r, i) => {
  console.log(`  RECEITA ${i+1}:`);
  console.log(`    escritorio_id   : f2568999-0ae6-47db-9293-a6f1672ed421`);
  console.log(`    tipo            : honorarios`);
  console.log(`    categoria       : honorarios`);
  console.log(`    descricao       : ${r.descricao.substring(0, 55)}...`);
  console.log(`    valor           : ${r.valor.toFixed(2)}`);
  console.log(`    data_vencimento : ${r.data_vencimento}`);
  console.log(`    data_pagamento  : ${r.data_pagamento || 'NULL'}`);
  console.log(`    status          : ${r.status}`);
  console.log(`    forma_pagamento : ${r.forma_pagamento}`);
  console.log(`    contrato_id     : ${r.contratoVinculado ? '(UUID de ' + r.contratoVinculado + ')' : 'NULL (avulso)'}`);
  console.log(`    observacoes     : Migrado VIOS - ${r.contratoOriginal || 'N/A'}`);
  console.log('');
});

console.log('\n--- COLUNAS NAO PREENCHIDAS (NULL/default) ---\n');
console.log(`  DESPESAS:
    - id                : UUID auto
    - documento_fiscal  : NULL
    - conta_bancaria_id : NULL
    - reembolsavel      : false
    - processo_id       : NULL
    - cliente_id        : NULL
    - advogado_id       : NULL
    - recorrente        : false

  RECEITAS:
    - id                : UUID auto
    - cliente_id        : NULL (herda do contrato se vinculado)
    - processo_id       : NULL
    - data_competencia  : = data_vencimento
    - valor_pago        : = valor (se pago)
    - recorrente        : false
    - parcelado         : false
`);

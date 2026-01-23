const fs = require('fs');

// Ler CSV com encoding Latin1
const csv = fs.readFileSync('./scripts/migracao-contratos.csv', 'latin1');
const lines = csv.split('\n');

// Índices
const pastaIdx = 2;
const objetoIdx = 10;
const statusIdx = 5;
const clienteIdx = 13;

// Siglas que devem permanecer em maiúsculo
const siglas = [
  'YOFC', 'ITCMD', 'INSS', 'LGPD', 'M&A', 'CNJ', 'RT', 'MS', 'TRT', 'TST',
  'STF', 'STJ', 'OAB', 'CNPJ', 'CPF', 'ICMS', 'ISS', 'PIS', 'COFINS', 'IRPJ',
  'CSLL', 'FGTS', 'CLT', 'CPC', 'CC', 'CF', 'CTN', '4FX', 'CR', 'TS', 'DOU',
  'A2M', 'WI'
];

// Palavras que devem ficar em minúsculo (preposições, artigos)
const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com', 'sem', 'a', 'o', 'à', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'x', 'as', 'os', 'pelo', 'pela', 'pelos', 'pelas', 'contra'];

// Nomes de empresas que devem ter formatação específica
const nomesEspeciais = {
  'BELCORP': 'Belcorp',
  'PLATLOG': 'Platlog',
  'INOVA': 'Inova',
  'ZAIT': 'Zait',
  'SCIENTIA': 'Scientia',
  'SCIENCIA': 'Scientia',
  'DIGON': 'Digon',
  'VELOSO': 'Veloso',
  'FORFUTURING': 'Forfuturing',
  'PROMISSOR': 'Promissor',
  'BONEVILLE': 'Boneville',
  'LIBERIUS': 'Liberius',
  'LAVISKA': 'Laviska',
  'BAMBOO': 'Bamboo',
  'KONA': 'Kona',
  'REFRICON': 'Refricon',
  'PROHABITAT': 'Prohabitat',
  'APOIO': 'Apoio',
  'MOVINORD': 'Movinord',
  'POLYCARPO': 'Polycarpo',
  'SUNGLASSES': 'Sunglasses',
  'OPTICAL': 'Optical',
  'DELQUÍMICA': 'Delquímica',
  'MAQBRIT': 'Maqbrit',
  'UNIQQ': 'Uniqq'
};

function formatarTitulo(texto) {
  if (!texto || texto.trim() === '') return null;

  // Dividir por espaços e hífens mantendo os separadores
  const partes = texto.split(/(\s+|-)/);

  const resultado = partes.map((parte, index) => {
    const parteUpper = parte.toUpperCase();
    const parteLower = parte.toLowerCase();

    // Manter separadores como estão
    if (parte.match(/^\s+$/) || parte === '-') return parte;

    // Verificar se é sigla conhecida
    if (siglas.includes(parteUpper)) return parteUpper;

    // Verificar se é nome especial
    if (nomesEspeciais[parteUpper]) return nomesEspeciais[parteUpper];

    // Verificar se é preposição/artigo (não no início)
    if (index > 0 && minusculas.includes(parteLower)) return parteLower;

    // Verificar se é número de processo ou código
    if (parte.match(/^\d+$/)) return parte;
    if (parte.match(/^nº$/i)) return 'nº';

    // Title case padrão
    return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
  });

  return resultado.join('');
}

// Processar dados
const mapeamento = [];
for (let i = 2; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (!cols[0] || cols[0].trim() === '') continue;
  if (cols[statusIdx] !== 'Ativo') continue;

  const pasta = cols[pastaIdx]?.trim();
  const objeto = cols[objetoIdx]?.trim();
  const cliente = cols[clienteIdx]?.trim();

  if (pasta && objeto) {
    const tituloFormatado = formatarTitulo(objeto);
    mapeamento.push({
      descricao: pasta,
      titulo_original: objeto,
      titulo_formatado: tituloFormatado,
      cliente: cliente
    });
  }
}

console.log('=== MAPEAMENTO COM FORMATAÇÃO TITLE CASE ===\n');
console.log('Total de contratos para atualizar:', mapeamento.length);
console.log('\n| Descricao | Título Original | Título Formatado |');
console.log('|-----------|-----------------|------------------|');
mapeamento.forEach(m => {
  console.log(`| ${m.descricao.substring(0, 40).padEnd(40)} | ${m.titulo_original.substring(0, 50).padEnd(50)} | ${m.titulo_formatado} |`);
});

// Salvar JSON para usar no SQL
fs.writeFileSync('./scripts/mapeamento-titulos-formatados.json', JSON.stringify(mapeamento, null, 2));
console.log('\nArquivo salvo: scripts/mapeamento-titulos-formatados.json');

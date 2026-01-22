const fs = require('fs');

// Ler clientes do xlsx
const clientesXlsx = require('./clientes-consultivo.json');

// Ler resultado do banco (arquivo salvo pelo MCP)
const dbResultPath = 'C:/Users/victo/.claude/projects/c--Users-victo-Zyra-Legal/daa42c2c-96d5-4633-822b-a6ee655b00e5/tool-results/mcp-supabase-execute_sql-1769010469754.txt';
const dbResultRaw = fs.readFileSync(dbResultPath, 'utf8');
const dbResult = JSON.parse(dbResultRaw);

// Extrair JSON dos clientes do resultado
const textContent = dbResult[0].text;
const jsonMatch = textContent.match(/\[[\s\S]*\]/);
if (!jsonMatch) {
  console.error('Não foi possível extrair JSON do resultado');
  process.exit(1);
}

const clientesDB = JSON.parse(jsonMatch[0]);
console.log('Clientes no banco:', clientesDB.length);
console.log('Clientes no xlsx:', clientesXlsx.length);

// Criar mapa normalizado dos clientes do banco
function normalizar(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

const mapaDB = {};
clientesDB.forEach(c => {
  mapaDB[normalizar(c.nome_completo)] = c.id;
  // Também mapear pelo nome original
  mapaDB[c.nome_completo] = c.id;
});

// Mapear clientes do xlsx
const mapeamento = {};
const naoEncontrados = [];

clientesXlsx.forEach(clienteXlsx => {
  // Tentar encontrar pelo nome exato
  let id = mapaDB[clienteXlsx];

  // Se não encontrou, tentar normalizado
  if (!id) {
    id = mapaDB[normalizar(clienteXlsx)];
  }

  // Se ainda não encontrou, tentar busca parcial
  if (!id) {
    const normalizado = normalizar(clienteXlsx);
    const match = Object.entries(mapaDB).find(([key, _]) => {
      const keyNorm = normalizar(key);
      return keyNorm.includes(normalizado) || normalizado.includes(keyNorm);
    });
    if (match) {
      id = match[1];
    }
  }

  if (id) {
    mapeamento[clienteXlsx] = id;
  } else {
    naoEncontrados.push(clienteXlsx);
  }
});

console.log('\n=== RESULTADO ===');
console.log('Mapeados:', Object.keys(mapeamento).length);
console.log('Não encontrados:', naoEncontrados.length);

if (naoEncontrados.length > 0) {
  console.log('\n=== NÃO ENCONTRADOS ===');
  naoEncontrados.forEach(c => console.log('-', c));
}

// Salvar mapeamento
fs.writeFileSync('./scripts/mapeamento-clientes.json', JSON.stringify(mapeamento, null, 2));
console.log('\nMapeamento salvo em: scripts/mapeamento-clientes.json');

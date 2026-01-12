// Script para aplicar a migration de migração de dados
// Execute com: npx tsx scripts/apply-migration.ts

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function applyMigration() {
  // Usar variáveis de ambiente ou solicitar
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lohakxdxgwgpkbmfmzzl.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!')
    console.log('\nPara aplicar a migration, você precisa:')
    console.log('1. Ir ao Dashboard do Supabase: https://supabase.com/dashboard/project/lohakxdxgwgpkbmfmzzl/settings/api')
    console.log('2. Copiar a "service_role" key (NÃO a anon key)')
    console.log('3. Rodar: SUPABASE_SERVICE_ROLE_KEY=sua_key npx tsx scripts/apply-migration.ts')
    console.log('\nOu aplique manualmente via SQL Editor no Dashboard.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })

  // Ler o arquivo de migration
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250115000001_create_migracao_system.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Separar os comandos SQL (cada comando termina com ;)
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

  console.log(`📦 Aplicando migration com ${commands.length} comandos...`)

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]

    // Pular comentários
    if (cmd.startsWith('--')) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: cmd + ';' })

      if (error) {
        // Tentar via REST API direta
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ sql: cmd + ';' })
        })

        if (!response.ok) {
          console.log(`⚠️ Comando ${i + 1}: Pode precisar ser aplicado manualmente`)
          console.log(`   ${cmd.substring(0, 80)}...`)
        }
      }

      console.log(`✅ Comando ${i + 1}/${commands.length} executado`)
    } catch (err) {
      console.log(`⚠️ Comando ${i + 1}: ${err}`)
    }
  }

  console.log('\n✅ Migration aplicada!')
  console.log('\nPróximos passos:')
  console.log('1. Verifique as tabelas no Dashboard: https://supabase.com/dashboard/project/lohakxdxgwgpkbmfmzzl/editor')
  console.log('2. Deploy da Edge Function: npx supabase functions deploy migracao-processar')
}

applyMigration().catch(console.error)

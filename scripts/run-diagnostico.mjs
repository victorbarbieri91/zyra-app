// Script para executar diagnóstico de publicações via Supabase API
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lohakxdxgwgpkbmfmzzl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurado')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executarDiagnostico() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('         DIAGNÓSTICO DE PUBLICAÇÕES - ZYRA LEGAL')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Total geral
  console.log('📊 1. TOTAL GERAL DE PUBLICAÇÕES')
  console.log('─────────────────────────────────')
  const { count: total } = await supabase
    .from('publicacoes_publicacoes')
    .select('*', { count: 'exact', head: true })
  console.log(`   Total: ${total || 0} publicações\n`)

  // 2. Por status
  console.log('📊 2. BREAKDOWN POR STATUS')
  console.log('─────────────────────────────────')
  const { data: byStatus } = await supabase
    .from('publicacoes_publicacoes')
    .select('status')

  const statusCount = {}
  byStatus?.forEach(p => {
    statusCount[p.status || 'null'] = (statusCount[p.status || 'null'] || 0) + 1
  })
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })
  console.log('')

  // 3. Por fonte
  console.log('📊 3. BREAKDOWN POR FONTE')
  console.log('─────────────────────────────────')
  const { data: byFonte } = await supabase
    .from('publicacoes_publicacoes')
    .select('aasp_id, escavador_aparicao_id')

  let aaspCount = 0, escavadorCount = 0, outroCount = 0
  byFonte?.forEach(p => {
    if (p.aasp_id) aaspCount++
    else if (p.escavador_aparicao_id) escavadorCount++
    else outroCount++
  })
  console.log(`   AASP: ${aaspCount}`)
  console.log(`   Diário Oficial (Escavador): ${escavadorCount}`)
  if (outroCount > 0) console.log(`   Outra fonte: ${outroCount}`)
  console.log('')

  // 4. Últimos 7 dias
  console.log('📊 4. PUBLICAÇÕES DOS ÚLTIMOS 7 DIAS')
  console.log('─────────────────────────────────')
  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const { data: ultimos7dias } = await supabase
    .from('publicacoes_publicacoes')
    .select('data_captura, aasp_id, escavador_aparicao_id, status')
    .gte('data_captura', seteDiasAtras.toISOString())

  const porDia = {}
  ultimos7dias?.forEach(p => {
    const dia = p.data_captura?.split('T')[0] || 'sem data'
    const fonte = p.aasp_id ? 'AASP' : 'Escavador'
    const key = `${dia} | ${fonte} | ${p.status}`
    porDia[key] = (porDia[key] || 0) + 1
  })
  Object.entries(porDia)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([key, count]) => {
      console.log(`   ${key}: ${count}`)
    })
  console.log('')

  // 5. Publicações pendentes
  console.log('📊 5. PUBLICAÇÕES PENDENTES (que devem aparecer na lista)')
  console.log('─────────────────────────────────')
  const { data: pendentes } = await supabase
    .from('publicacoes_publicacoes')
    .select('id, data_publicacao, tribunal, tipo_publicacao, numero_processo, status, aasp_id')
    .in('status', ['pendente', 'em_analise'])
    .order('data_publicacao', { ascending: false })
    .limit(15)

  if (pendentes?.length === 0) {
    console.log('   ⚠️ Nenhuma publicação pendente encontrada!')
  } else {
    pendentes?.forEach(p => {
      const fonte = p.aasp_id ? 'AASP' : 'Escav'
      console.log(`   ${p.data_publicacao} | ${fonte} | ${p.tipo_publicacao || 'outro'} | ${p.numero_processo || 'sem processo'} | ${p.tribunal?.substring(0, 30) || 'sem tribunal'}`)
    })
  }
  console.log('')

  // 6. Duplicatas por hash
  console.log('📊 6. VERIFICANDO DUPLICATAS POR HASH')
  console.log('─────────────────────────────────')
  const { data: allPubs } = await supabase
    .from('publicacoes_publicacoes')
    .select('hash_conteudo')
    .not('hash_conteudo', 'is', null)

  const hashCount = {}
  allPubs?.forEach(p => {
    hashCount[p.hash_conteudo] = (hashCount[p.hash_conteudo] || 0) + 1
  })
  const duplicatasHash = Object.entries(hashCount).filter(([_, count]) => count > 1)
  if (duplicatasHash.length === 0) {
    console.log('   ✅ Nenhuma duplicata por hash encontrada')
  } else {
    console.log(`   ⚠️ ${duplicatasHash.length} grupos de duplicatas encontrados`)
    duplicatasHash.slice(0, 5).forEach(([hash, count]) => {
      console.log(`      Hash ${hash.substring(0, 12)}...: ${count} registros`)
    })
  }
  console.log('')

  // 7. Duplicatas por processo+data+tipo
  console.log('📊 7. VERIFICANDO DUPLICATAS POR PROCESSO+DATA+TIPO')
  console.log('─────────────────────────────────')
  const { data: allPubsProcesso } = await supabase
    .from('publicacoes_publicacoes')
    .select('numero_processo, data_publicacao, tipo_publicacao')
    .not('numero_processo', 'is', null)

  const procCount = {}
  allPubsProcesso?.forEach(p => {
    const key = `${p.numero_processo}|${p.data_publicacao}|${p.tipo_publicacao}`
    procCount[key] = (procCount[key] || 0) + 1
  })
  const duplicatasProc = Object.entries(procCount).filter(([_, count]) => count > 1)
  if (duplicatasProc.length === 0) {
    console.log('   ✅ Nenhuma duplicata por processo+data+tipo encontrada')
  } else {
    console.log(`   ⚠️ ${duplicatasProc.length} grupos de duplicatas encontrados`)
    duplicatasProc.slice(0, 5).forEach(([key, count]) => {
      const [proc, data, tipo] = key.split('|')
      console.log(`      ${proc} | ${data} | ${tipo}: ${count} registros`)
    })
  }
  console.log('')

  // 8. Termos Escavador
  console.log('📊 8. TERMOS DO ESCAVADOR CONFIGURADOS')
  console.log('─────────────────────────────────')
  const { data: termos } = await supabase
    .from('publicacoes_termos_escavador')
    .select('termo, escavador_status, escavador_monitoramento_id, ativo, total_aparicoes, ultima_sync, escavador_erro')
    .order('ativo', { ascending: false })

  if (termos?.length === 0) {
    console.log('   ⚠️ Nenhum termo configurado')
  } else {
    termos?.forEach(t => {
      const registrado = t.escavador_monitoramento_id ? '✅' : '❌'
      const ativo = t.ativo ? '🟢' : '⚪'
      console.log(`   ${ativo} ${t.termo}`)
      console.log(`      Status: ${t.escavador_status} | Registrado: ${registrado} | Aparições: ${t.total_aparicoes || 0}`)
      if (t.escavador_erro) console.log(`      ❌ Erro: ${t.escavador_erro}`)
      if (t.ultima_sync) console.log(`      Última sync: ${t.ultima_sync}`)
      console.log('')
    })
  }

  // 9. Associados AASP
  console.log('📊 9. ASSOCIADOS AASP CONFIGURADOS')
  console.log('─────────────────────────────────')
  const { data: associados } = await supabase
    .from('publicacoes_associados')
    .select('nome, oab_numero, oab_uf, ativo, ultima_sync, publicacoes_sync_count')
    .order('ativo', { ascending: false })

  if (associados?.length === 0) {
    console.log('   ⚠️ Nenhum associado configurado')
  } else {
    associados?.forEach(a => {
      const ativo = a.ativo ? '🟢' : '⚪'
      console.log(`   ${ativo} ${a.nome} (OAB ${a.oab_numero}/${a.oab_uf})`)
      console.log(`      Publicações sincronizadas: ${a.publicacoes_sync_count || 0}`)
      if (a.ultima_sync) console.log(`      Última sync: ${a.ultima_sync}`)
      console.log('')
    })
  }

  // 10. Histórico de sync AASP
  console.log('📊 10. HISTÓRICO DE SYNC AASP (últimos 7 dias)')
  console.log('─────────────────────────────────')
  const { data: syncAasp } = await supabase
    .from('publicacoes_sincronizacoes')
    .select('data_inicio, tipo, publicacoes_novas, sucesso')
    .gte('data_inicio', seteDiasAtras.toISOString())
    .order('data_inicio', { ascending: false })
    .limit(20)

  if (syncAasp?.length === 0) {
    console.log('   Nenhuma sincronização AASP nos últimos 7 dias')
  } else {
    syncAasp?.forEach(s => {
      const status = s.sucesso ? '✅' : '❌'
      console.log(`   ${s.data_inicio?.split('T')[0]} ${s.data_inicio?.split('T')[1]?.substring(0,5)} | ${s.tipo} | ${status} | ${s.publicacoes_novas || 0} novas`)
    })
  }
  console.log('')

  // 11. Histórico de sync Escavador
  console.log('📊 11. HISTÓRICO DE SYNC ESCAVADOR (últimos 7 dias)')
  console.log('─────────────────────────────────')
  const { data: syncEsc } = await supabase
    .from('publicacoes_sync_escavador')
    .select('data_inicio, tipo, publicacoes_novas, publicacoes_duplicadas, sucesso')
    .gte('data_inicio', seteDiasAtras.toISOString())
    .order('data_inicio', { ascending: false })
    .limit(20)

  if (syncEsc?.length === 0) {
    console.log('   Nenhuma sincronização Escavador nos últimos 7 dias')
  } else {
    syncEsc?.forEach(s => {
      const status = s.sucesso ? '✅' : '❌'
      console.log(`   ${s.data_inicio?.split('T')[0]} ${s.data_inicio?.split('T')[1]?.substring(0,5)} | ${s.tipo} | ${status} | ${s.publicacoes_novas || 0} novas, ${s.publicacoes_duplicadas || 0} dup`)
    })
  }
  console.log('')

  // Resumo final
  console.log('═══════════════════════════════════════════════════════════')
  console.log('                      RESUMO FINAL')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   📦 Total de publicações no banco: ${total || 0}`)
  console.log(`   ⏳ Pendentes: ${statusCount['pendente'] || 0}`)
  console.log(`   ✅ Tratadas: ${statusCount['processada'] || 0}`)
  console.log(`   🗄️  Arquivadas: ${statusCount['arquivada'] || 0}`)
  console.log(`   📰 Via AASP: ${aaspCount}`)
  console.log(`   📰 Via Escavador: ${escavadorCount}`)
  console.log(`   🔗 Termos Escavador ativos: ${termos?.filter(t => t.ativo).length || 0}`)
  console.log(`   👤 Associados AASP ativos: ${associados?.filter(a => a.ativo).length || 0}`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

executarDiagnostico().catch(console.error)

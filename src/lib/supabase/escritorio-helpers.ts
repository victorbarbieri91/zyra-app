/**
 * Helpers para gerenciamento de escritórios multi-tenant
 */

import { createClient } from './client';

export interface Escritorio {
  id: string;
  nome: string;
  cnpj?: string;
  logo_url?: string;
  plano: 'free' | 'basic' | 'professional' | 'enterprise';
  max_usuarios: number;
  ativo: boolean;
  owner_id?: string;
  grupo_id?: string;
  endereco?: any;
  config?: any;
  created_at: string;
  updated_at: string;
}

export interface UsuarioEscritorio {
  id: string;
  user_id: string;
  escritorio_id: string;
  role: 'owner' | 'admin' | 'advogado' | 'assistente' | 'readonly';
  is_owner: boolean;
  ativo: boolean;
  ultimo_acesso?: string;
}

export interface EscritorioComRole extends Escritorio {
  role: string;
  is_owner: boolean;
  ultimo_acesso?: string;
}

/**
 * Lista todos os escritórios que o usuário tem acesso
 */
export async function getEscritoriosDoUsuario(): Promise<EscritorioComRole[]> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Erro ao obter usuário:', userError);
    return [];
  }

  const { data, error } = await supabase
    .from('escritorios_usuarios')
    .select(`
      role,
      is_owner,
      ultimo_acesso,
      escritorios:escritorio_id (
        id,
        nome,
        cnpj,
        logo_url,
        plano,
        max_usuarios,
        ativo,
        owner_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userData.user.id)
    .eq('ativo', true)
    .order('ultimo_acesso', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Erro ao buscar escritórios:', error.message, error.code);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('Nenhum escritório encontrado para o usuário');
    return [];
  }

  return data
    .filter((item: any) => item.escritorios) // Filtrar itens sem escritório
    .map((item: any) => ({
      ...item.escritorios,
      role: item.role,
      is_owner: item.is_owner,
      ultimo_acesso: item.ultimo_acesso,
    }));
}

/**
 * Obtém o escritório atualmente ativo do usuário
 */
export async function getEscritorioAtivo(): Promise<Escritorio | null> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Erro ao obter usuário:', userError);
    return null;
  }

  // Buscar o escritório ativo do usuário
  const { data: ativoData, error: ativoError } = await supabase
    .from('escritorios_usuarios_ativo')
    .select('escritorio_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (ativoError) {
    console.error('Erro ao buscar escritório ativo:', ativoError.message, ativoError.code);
    return null;
  }

  // Se não encontrou na tabela de ativo, tentar fallback pelo profile
  let escritorioId = ativoData?.escritorio_id;

  if (!escritorioId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    escritorioId = profileData?.escritorio_id;

    // Se encontrou pelo profile, criar entrada na tabela de ativo
    if (escritorioId) {
      await supabase
        .from('escritorios_usuarios_ativo')
        .upsert({
          user_id: userData.user.id,
          escritorio_id: escritorioId,
          updated_at: new Date().toISOString()
        });
    }
  }

  if (!escritorioId) {
    console.warn('Nenhum escritório ativo encontrado para o usuário');
    return null;
  }

  // Buscar os dados completos do escritório
  const { data: escritorioData, error: escritorioError } = await supabase
    .from('escritorios')
    .select('*')
    .eq('id', escritorioId)
    .single();

  if (escritorioError) {
    console.error('Erro ao buscar dados do escritório:', escritorioError.message, escritorioError.code);
    return null;
  }

  return escritorioData as Escritorio;
}

/**
 * Troca o escritório ativo do usuário
 */
export async function trocarEscritorio(escritorioId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  // Chama a function SQL que já valida permissão
  const { data, error } = await supabase.rpc('set_escritorio_ativo', {
    user_uuid: userData.user.id,
    escritorio_uuid: escritorioId,
  });

  if (error) {
    console.error('Erro ao trocar escritório:', error);
    throw error;
  }

  return data === true;
}

/**
 * Cria um novo escritório e define o usuário como owner
 * Se o usuário já tem um escritório, o novo será do mesmo grupo
 * Usa RPC com SECURITY DEFINER para evitar problemas de RLS
 */
export async function criarEscritorio(dados: {
  nome: string;
  cnpj?: string;
  endereco?: any;
}): Promise<Escritorio | null> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Usuário não autenticado');

  // Usar RPC que faz tudo em uma transação com SECURITY DEFINER
  const { data: escritorioId, error: errorRpc } = await supabase.rpc('criar_escritorio', {
    p_nome: dados.nome,
    p_cnpj: dados.cnpj || null,
  });

  if (errorRpc) {
    console.error('Erro ao criar escritório:', errorRpc);
    throw errorRpc;
  }

  // Buscar os dados completos do escritório criado
  const { data: escritorio, error: errorFetch } = await supabase
    .from('escritorios')
    .select('*')
    .eq('id', escritorioId)
    .single();

  if (errorFetch) {
    console.error('Erro ao buscar escritório criado:', errorFetch);
    throw errorFetch;
  }

  return escritorio as Escritorio;
}

/**
 * Busca todos os escritórios do mesmo grupo do escritório ativo
 */
export async function getEscritoriosDoGrupo(): Promise<EscritorioComRole[]> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Erro ao obter usuário:', userError);
    return [];
  }

  // Buscar escritório ativo para obter o grupo_id
  const escritorioAtivo = await getEscritorioAtivo();
  if (!escritorioAtivo) return [];

  // O grupo_id do escritório ativo aponta para o escritório principal do grupo
  const grupoId = escritorioAtivo.grupo_id || escritorioAtivo.id;

  // Buscar todos os escritórios do grupo
  const { data, error } = await supabase
    .from('escritorios')
    .select(`
      id,
      nome,
      cnpj,
      logo_url,
      plano,
      max_usuarios,
      ativo,
      owner_id,
      grupo_id,
      created_at,
      updated_at
    `)
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error) {
    // Tentar busca alternativa usando RPC
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_escritorios_do_grupo', { p_escritorio_id: grupoId });

    if (rpcError) {
      console.error('Erro ao buscar escritórios do grupo:', rpcError);
      return [];
    }

    return (rpcData || []).map((e: any) => ({
      ...e,
      role: 'owner', // Simplificação - ajustar se necessário
      is_owner: true,
    }));
  }

  // Buscar roles do usuário em cada escritório
  const escritoriosIds = (data || []).map(e => e.id);
  const { data: rolesData } = await supabase
    .from('escritorios_usuarios')
    .select('escritorio_id, role, is_owner')
    .eq('user_id', userData.user.id)
    .in('escritorio_id', escritoriosIds)
    .eq('ativo', true);

  const rolesMap = new Map((rolesData || []).map(r => [r.escritorio_id, r]));

  return (data || []).map(e => ({
    ...e,
    role: rolesMap.get(e.id)?.role || 'readonly',
    is_owner: rolesMap.get(e.id)?.is_owner || false,
  }));
}

/**
 * Convida um novo usuário para o escritório
 */
export async function convidarUsuario(dados: {
  email: string;
  role: 'admin' | 'advogado' | 'assistente' | 'readonly';
  escritorioId: string;
}): Promise<{ token: string; expira_em: string }> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('escritorios_convites')
    .insert({
      escritorio_id: dados.escritorioId,
      email: dados.email,
      role: dados.role,
      convidado_por: userData.user.id,
    })
    .select('token, expira_em')
    .single();

  if (error) {
    console.error('Erro ao criar convite:', error);
    throw error;
  }

  return data;
}

/**
 * Aceita um convite e adiciona usuário ao escritório
 */
export async function aceitarConvite(token: string): Promise<boolean> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Usuário não autenticado');

  // 1. Buscar convite
  const { data: convite, error: errorConvite } = await supabase
    .from('escritorios_convites')
    .select('*')
    .eq('token', token)
    .eq('aceito', false)
    .gt('expira_em', new Date().toISOString())
    .single();

  if (errorConvite || !convite) {
    throw new Error('Convite inválido ou expirado');
  }

  // 2. Criar relacionamento usuário-escritório
  const { error: errorRelacao } = await supabase
    .from('escritorios_usuarios')
    .insert({
      user_id: userData.user.id,
      escritorio_id: convite.escritorio_id,
      role: convite.role,
      is_owner: false,
      ativo: true,
      convidado_por: convite.convidado_por,
    });

  if (errorRelacao) {
    console.error('Erro ao aceitar convite:', errorRelacao);
    throw errorRelacao;
  }

  // 3. Marcar convite como aceito
  const { error: errorUpdate } = await supabase
    .from('escritorios_convites')
    .update({
      aceito: true,
      aceito_por: userData.user.id,
      aceito_em: new Date().toISOString(),
    })
    .eq('id', convite.id);

  if (errorUpdate) {
    console.error('Erro ao atualizar convite:', errorUpdate);
  }

  // 4. Atualizar profile para vincular ao escritório e pular onboarding
  await supabase
    .from('profiles')
    .update({
      escritorio_id: convite.escritorio_id,
      primeiro_acesso: false,
      onboarding_completo: true,
      onboarding_completado_em: new Date().toISOString(),
    })
    .eq('id', userData.user.id);

  // 5. Trocar para o novo escritório
  await trocarEscritorio(convite.escritorio_id);

  return true;
}

/**
 * Lista membros do escritório (apenas para owner/admin)
 */
export async function getMembrosEscritorio(
  escritorioId: string
): Promise<any[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('escritorios_usuarios')
    .select(`
      id,
      role,
      is_owner,
      ativo,
      ultimo_acesso,
      created_at,
      profiles:user_id (
        id,
        nome_completo,
        email,
        oab_numero,
        oab_uf,
        avatar_url
      )
    `)
    .eq('escritorio_id', escritorioId)
    .order('is_owner', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar membros:', error);
    throw error;
  }

  // Flatten data para facilitar o uso nos componentes
  return (data || []).map((item: any) => ({
    id: item.id,
    usuario_id: item.profiles?.id || '',
    role: item.role,
    is_owner: item.is_owner,
    ativo: item.ativo,
    ultimo_acesso: item.ultimo_acesso,
    created_at: item.created_at,
    nome_completo: item.profiles?.nome_completo || '',
    nome: item.profiles?.nome_completo || '', // Alias para compatibilidade
    email: item.profiles?.email || '',
    oab_numero: item.profiles?.oab_numero,
    oab_uf: item.profiles?.oab_uf,
    avatar_url: item.profiles?.avatar_url,
  }));
}

/**
 * Atualiza role de um membro (apenas owner/admin)
 */
export async function atualizarRoleMembro(
  usuarioEscritorioId: string,
  novaRole: 'admin' | 'advogado' | 'assistente' | 'readonly'
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('escritorios_usuarios')
    .update({ role: novaRole })
    .eq('id', usuarioEscritorioId)
    .eq('is_owner', false); // Não pode mudar role do owner

  if (error) {
    console.error('Erro ao atualizar role:', error);
    throw error;
  }

  return true;
}

/**
 * Remove membro do escritório (apenas owner/admin)
 */
export async function removerMembroEscritorio(
  usuarioEscritorioId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('escritorios_usuarios')
    .update({ ativo: false })
    .eq('id', usuarioEscritorioId)
    .eq('is_owner', false); // Não pode remover owner

  if (error) {
    console.error('Erro ao remover membro:', error);
    throw error;
  }

  return true;
}

/**
 * Verifica se usuário tem permissão específica
 */
export async function verificarPermissao(
  modulo: string,
  permissao: 'read' | 'write' | 'delete' | 'manage'
): Promise<boolean> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const escritorioAtivo = await getEscritorioAtivo();
  if (!escritorioAtivo) return false;

  const { data, error } = await supabase.rpc('has_permission', {
    user_uuid: userData.user.id,
    escritorio_uuid: escritorioAtivo.id,
    modulo_name: modulo,
    permission_type: permissao,
  });

  if (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }

  return data === true;
}

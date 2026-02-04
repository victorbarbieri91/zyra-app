# Plano de Correções - Relatório de Testes Zyra Legal

**Data**: 03/02/2026
**Baseado em**: Relatório de testes do Claude (Chrome)
**Total de bugs**: 10 problemas identificados

---

## Resumo da Análise

Após analisar o código-fonte e a estrutura do banco de dados, identifiquei as causas raiz de cada problema:

| # | Erro | Causa Raiz | Complexidade |
|---|------|------------|--------------|
| 4 | Cadastro de Pessoas não salva | RLS policy ou escritorio_id faltando | Média |
| 6 | Cadastro Manual quebra app | `SelectItem value=""` inválido | Baixa |
| 7 | Criar Evento não funciona | Erro silencioso no onSubmit | Média |
| 10 | Coluna endereco não existe | IA usando campo errado (campos são separados) | Baixa |
| 2 | CPF inválido aceito | Falta validação no frontend | Baixa |
| 3 | CEP não auto-completa | Falta integração ViaCEP | Média |
| 5 | Botões Nova Oportunidade | onClick sem handler | Baixa |
| 1 | Validação sem feedback | Falta mensagens de erro nos campos | Baixa |
| 8 | Consultivo bloqueado | Falta opção criar cliente | Baixa |

---

## Correções Detalhadas

### ERRO #4 - Cadastro de Pessoas Não Salva (CRÍTICO)

**Arquivo**: [src/app/dashboard/crm/pessoas/page.tsx](src/app/dashboard/crm/pessoas/page.tsx#L556-L591)

**Análise**:
- O `onSave` no `PessoaWizardModal` faz insert mas não passa `escritorio_id`
- A tabela `crm_pessoas` tem RLS que exige `escritorio_id` do usuário
- O erro é capturado mas não exibido ao usuário (apenas `console.error`)

**Solução**:
```typescript
// Adicionar escritorio_id ao insert
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('escritorio_id')
  .eq('id', user.id)
  .single()

const insertData = {
  escritorio_id: profile.escritorio_id, // FALTAVA ISSO
  tipo_pessoa: data.tipo_pessoa,
  // ... resto dos campos
}
```

**Prioridade**: URGENTE

---

### ERRO #6 - Cadastro Manual Quebra Aplicação (CRÍTICO)

**Arquivos Afetados**:
- [src/components/processos/ProcessoWizard.tsx:784](src/components/processos/ProcessoWizard.tsx#L784)
- [src/components/financeiro/cartoes/DespesaCartaoModal.tsx:413](src/components/financeiro/cartoes/DespesaCartaoModal.tsx#L413)

**Análise**:
- `SelectItem value=""` é inválido no Radix UI Select
- Causa erro: "A Select.Item must have a value prop that is not an empty string"

**Solução**:
```typescript
// DE:
<SelectItem value="">Automático (INPC/SELIC)</SelectItem>

// PARA:
<SelectItem value="auto">Automático (INPC/SELIC)</SelectItem>

// E ajustar a lógica para tratar "auto" como valor nulo ao salvar
```

**Prioridade**: URGENTE

---

### ERRO #7 - Criar Evento na Agenda Não Funciona (CRÍTICO)

**Arquivo**: [src/components/agenda/EventoWizard.tsx:267-320](src/components/agenda/EventoWizard.tsx#L267-L320)

**Análise**:
- O `handleComplete` chama `onSubmit(formData)` mas não trata erros corretamente
- O erro é apenas logado no console sem feedback ao usuário
- O `onClose()` é chamado mesmo quando há erro

**Solução**:
```typescript
const handleComplete = async () => {
  setIsSubmitting(true)
  try {
    // ... código existente

    toast.success('Evento criado com sucesso!') // Adicionar feedback
    onClose()
  } catch (error) {
    console.error('Erro ao criar evento:', error)
    toast.error('Erro ao criar evento. Verifique os dados e tente novamente.')
    // NÃO chamar onClose() em caso de erro
  } finally {
    setIsSubmitting(false)
  }
}
```

Também verificar se `escritorio_id` está sendo passado corretamente no `EventoFormData`.

**Prioridade**: URGENTE

---

### ERRO #10 - Estrutura do Banco de Dados (Centro de Comando)

**Análise**:
A tabela `crm_pessoas` NÃO tem coluna `endereco`. Os campos são separados:
- `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`

**Causa**:
O Centro de Comando (IA) está tentando usar um campo que não existe.

**Solução**:
Ajustar os prompts/tools do Centro de Comando para usar os campos corretos:
```sql
-- Campos de endereço disponíveis:
cep, logradouro, numero, complemento, bairro, cidade, uf
```

**Prioridade**: ALTA

---

### ERRO #2 - CPF Inválido é Aceito

**Arquivo**: [src/components/crm/PessoaWizardModal.tsx](src/components/crm/PessoaWizardModal.tsx)

**Solução**:
Criar função de validação de CPF/CNPJ:

```typescript
// src/lib/validators.ts
export function validarCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '')
  if (numbers.length !== 11) return false
  if (/^(\d)\1+$/.test(numbers)) return false // Todos iguais

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numbers[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numbers[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numbers[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(numbers[10])
}

export function validarCNPJ(cnpj: string): boolean {
  // Implementação similar
}
```

E adicionar validação no step de dados básicos.

**Prioridade**: MÉDIA

---

### ERRO #3 - CEP Não Auto-Completa

**Arquivo**: [src/components/crm/PessoaWizardModal.tsx](src/components/crm/PessoaWizardModal.tsx)

**Solução**:
```typescript
const buscarCEP = async (cep: string) => {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length !== 8) return

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data = await response.json()

    if (!data.erro) {
      handleChange('logradouro', data.logradouro)
      handleChange('bairro', data.bairro)
      handleChange('cidade', data.localidade)
      handleChange('uf', data.uf)
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
  }
}

// No input de CEP:
<Input
  onBlur={(e) => buscarCEP(e.target.value)}
  // ...
/>
```

**Prioridade**: MÉDIA

---

### ERRO #5 - Botões Nova Oportunidade Não Funcionam

**Arquivo**: [src/app/dashboard/crm/funil/page.tsx:217-223, 251-257](src/app/dashboard/crm/funil/page.tsx#L217-L257)

**Análise**:
Os botões não têm `onClick` handler:
```tsx
<Button size="sm" className="...">
  <Plus className="w-4 h-4 mr-2" />
  Nova Oportunidade
</Button>
```

**Solução**:
Criar modal de oportunidade e adicionar handler:
```tsx
const [oportunidadeModalOpen, setOportunidadeModalOpen] = useState(false)

<Button
  size="sm"
  onClick={() => setOportunidadeModalOpen(true)}
>
  Nova Oportunidade
</Button>
```

**Prioridade**: ALTA

---

### PROBLEMA #1 - Validação Sem Feedback Visual

**Arquivo**: [src/components/crm/PessoaWizardModal.tsx:364-370](src/components/crm/PessoaWizardModal.tsx#L364-L370)

**Análise**:
A validação usa `alert()` que não é uma boa prática de UX:
```tsx
validate: () => {
  if (!formData.nome_completo) {
    alert('Nome/Razao Social e obrigatorio')
    return false
  }
  return true
}
```

**Solução**:
Usar estados de erro por campo e exibir mensagens inline:
```tsx
const [errors, setErrors] = useState<Record<string, string>>({})

// Na validação:
if (!formData.nome_completo) {
  setErrors(prev => ({ ...prev, nome_completo: 'Nome/Razão Social é obrigatório' }))
  return false
}

// No input:
<Input
  className={cn(errors.nome_completo && 'border-red-500')}
/>
{errors.nome_completo && (
  <p className="text-xs text-red-500 mt-1">{errors.nome_completo}</p>
)}
```

**Prioridade**: BAIXA

---

### PROBLEMA #8 - Formulário Bloqueado sem Opção Criar Cliente

**Arquivo**: Consultivo > Nova Consulta

**Solução**:
Adicionar botão "Criar novo cliente" no dropdown de seleção:
```tsx
<SelectContent>
  <div className="p-2 border-b">
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={() => {/* Abrir modal criar cliente */}}
    >
      <Plus className="w-4 h-4 mr-2" />
      Criar novo cliente
    </Button>
  </div>
  {clientes.map(cliente => (
    <SelectItem key={cliente.id} value={cliente.id}>
      {cliente.nome}
    </SelectItem>
  ))}
</SelectContent>
```

**Prioridade**: BAIXA

---

## Ordem de Execução Recomendada

### Fase 1 - Críticos (Bloqueia uso do sistema)
1. **ERRO #4** - Cadastro de Pessoas (adicionar escritorio_id)
2. **ERRO #6** - SelectItem value="" (trocar para valor não-vazio)
3. **ERRO #7** - Criar Evento (adicionar feedback e tratamento de erro)

### Fase 2 - Importantes (Funcionalidades comprometidas)
4. **ERRO #10** - Centro de Comando (ajustar campos de endereço)
5. **ERRO #5** - Botões Nova Oportunidade (adicionar handler)
6. **ERRO #2** - Validação CPF/CNPJ (implementar algoritmo)

### Fase 3 - Melhorias de UX
7. **ERRO #3** - Auto-complete CEP (integrar ViaCEP)
8. **PROBLEMA #1** - Feedback de validação (mensagens inline)
9. **PROBLEMA #8** - Criar cliente no Consultivo

---

## Checklist de Verificação Pós-Correção

- [ ] Cadastrar pessoa com todos os campos preenchidos
- [ ] Cadastrar pessoa apenas com campos obrigatórios
- [ ] Criar processo via cadastro manual
- [ ] Criar evento na agenda com todas as etapas
- [ ] Testar Centro de Comando com "criar cliente"
- [ ] Validar CPF inválido (111.111.111-11)
- [ ] Testar auto-complete de CEP
- [ ] Criar nova oportunidade no CRM
- [ ] Verificar feedback de campos obrigatórios
- [ ] Criar consulta no Consultivo sem clientes

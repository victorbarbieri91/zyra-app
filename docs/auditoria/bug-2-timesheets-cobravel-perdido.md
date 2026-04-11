# Auditoria do Bug 2 — Timesheets com escolha manual de "Cobrável" sobrescrita

## O que é o Bug 2

O sistema Zyra tinha um defeito no módulo de timesheet em que, sempre que um advogado abria o modal de lançamento de horas e clicava manualmente na opção "Cobrável", um trigger do banco de dados sobrescrevia essa escolha e gravava o registro como `faturavel = false`. Na prática, horas que deveriam virar receita eram marcadas como não-faturáveis sem que o usuário percebesse, o que gerou perda silenciosa de faturamento ao longo do tempo.

## Quando foi corrigido

A correção do trigger e da função de cálculo foi aplicada em **10/04/2026**. A partir de agora, novos lançamentos respeitam a escolha manual do advogado.

## Por que esse arquivo existe

Mesmo após a correção, restaram **78** registros históricos no banco que carregam a marca do bug — todos com `faturavel_manual = true` mas `faturavel = false`. Em vez de corrigir tudo em massa (o que poderia gerar inconsistência fiscal e contábil em registros que já viraram fatura), este documento lista cada caso para revisão manual. Você decide, registro a registro, qual deve ser corrigido.

> **AVISO IMPORTANTE:** Nenhum registro foi alterado automaticamente. O conteúdo abaixo é apenas para auditoria. Toda e qualquer mudança no banco depende da sua decisão explícita.

## Resumo estatístico

| Métrica | Valor |
|---|---|
| Total de registros impactados | 78 |
| Não faturados (corrigíveis sem impacto fiscal) | 78 |
| Já faturados (decisão case-by-case) | 0 |
| Soma total de horas envolvidas | 64,94 h |
| Soma total de valor estimado perdido | R$ 72.979,50 |
| Horas — não faturados | 64,94 h |
| Valor perdido — não faturados | R$ 72.979,50 |
| Horas — já faturados | 0,00 h |
| Valor perdido — já faturados | R$ 0,00 |
| Colaboradores únicos | 4 |
| Contratos únicos | 16 |

## Não faturados (corrigíveis)

São **78** registros que ainda não viraram fatura. Podem ser corrigidos com segurança, pois não há impacto fiscal nem necessidade de retrabalho contábil.

| timesheet_id | data | colaborador | contrato | atividade | horas | valor estimado | recálculo backend |
|---|---|---|---|---|---|---|---|
| 8e5eeee2-7041-43b5-ba24-94a5a24e2a64 | 11/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Aula de Francês | 1,00 | R$ 1.150,00 | false |
| 97f60eb7-a76e-4c3e-9648-0d7390a49978 | 12/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | revisão do relatório | 1,00 | R$ 1.150,00 | false |
| 145b0584-dd15-442d-8aa5-803ce0f3f49a | 19/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | providências iniciais de abertura de pasta econtrato de hon… | 1,00 | R$ 1.150,00 | false |
| cb87f15d-64c1-497b-9a07-88d8043f124e | 23/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Atividades administrativas | 2,55 | R$ 2.932,50 | false |
| 970c7907-213d-4cfe-ad10-2af5049e6cc1 | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | DOB. Reunião mensal de diretoria | 1,50 | R$ 1.725,00 | false |
| 95d761b8-2e64-4884-b59f-486232606ee1 | 23/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Trabalho na tarefa: Atividades administrativas | 0,18 | R$ 207,00 | false |
| beba23a2-1744-44a7-b1b3-693d123baec1 | 30/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Atividades administrativas | 4,30 | R$ 4.945,00 | false |
| 90bc5a3f-4e15-4a80-84a2-e903b34acee2 | 31/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Trabalho na tarefa: EUSTÁQUIO: Preparar apresentação | 3,72 | R$ 4.278,00 | false |
| cf42cbbe-67f0-468a-a665-9ef6549af5b3 | 01/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | PUBLICAÇÕES no Zyra: verificar manhã e tarde | 0,08 | R$ 92,00 | false |
| 5a973284-d3fb-43a4-aa80-6e6b86371e44 | 02/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Atividades administrativas | 1,00 | R$ 1.150,00 | false |
| 7b212f99-bc86-4d90-ad9d-cbc7b81262ef | 06/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | Novos projetos | 1,00 | R$ 1.150,00 | false |
| 90bcb355-5afb-442f-9f54-39c249a3f3a4 | 07/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0039 (fixo) | cancelamento da recorrência duplicada | 0,08 | R$ 92,00 | false |
| a782e483-88e7-4b05-8677-2b6ceb52cc8e | 13/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0041 (fixo) | Elaboração de defesa IDPJ | 2,28 | R$ 2.622,00 | false |
| 706f5857-739e-4900-9190-f67b1daa3b56 | 19/03/2026 | Andrei Gomes da Silva Pinto | CONT-0055 (por_cargo) | Montes Claros_Participação em reunião com Soloenge para def… | 1,33 | R$ 997,50 | true |
| a032b67c-34d7-42b0-a27d-af92ffe09664 | 11/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | Envio de informações Dr. Gustavo | 0,50 | R$ 575,00 | false |
| 60c323a4-d369-4ed9-b76f-0f6e6e4dd14d | 28/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | lançamento para cobrança | 1,00 | R$ 1.150,00 | false |
| 186f776e-078a-4f3a-9f10-5f2e3e6c35fe | 01/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | E-social_ACORDO.Enviar planilha | 0,42 | R$ 483,00 | false |
| 455a4ec2-ad21-4f65-9894-b19ee308b611 | 24/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | Conferência dos prazos cadastrados. | 0,08 | R$ 92,00 | false |
| be281529-1e83-4906-904d-41482364fd78 | 26/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | Dra. Samara - Ação Trabalhista Brisas Avaré | 0,08 | R$ 92,00 | false |
| 2f62d9b1-0f4b-41b4-b29e-882ecc768b53 | 30/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | RES: Brisas Avaré - Ação Trabalhista - AURELIO SILVERIO SAM… | 0,67 | R$ 770,50 | false |
| cd26260c-8b8c-429f-b53c-b0ae397cdab2 | 02/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0056 (por_ato) | FUP- verificar providências do acordo | 0,18 | R$ 207,00 | false |
| 05b7a42b-a2a6-4cbb-bf20-d0cf95fa6c71 | 11/02/2026 | Paloma Luczka | CONT-0080 (por_ato) | Envio de e-mail. | 1,00 | R$ 850,00 | false |
| dd69cfc4-bc40-45b7-9047-0b5626407b66 | 11/02/2026 | Almir Polycarpo | CONT-0082 (fixo) | Teste | 1,50 | R$ 1.725,00 | false |
| 80a883bc-543a-46fe-bc55-e474fbadc334 | 23/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0082 (fixo) | Reunião interna para tratar da utilização do Zyra e do Vios | 1,50 | R$ 1.725,00 | false |
| 11b9b4ab-1c1b-46e4-a3d7-51d3ca2cbba3 | 19/02/2026 | Almir Polycarpo | CONT-0085 (pro_bono) | Não treinei. Instalação do Holter. | 0,25 | R$ 287,50 | false |
| 683c4861-23ce-4938-ba62-594b810b34d0 | 24/03/2026 | Almir Polycarpo | CONT-0085 (pro_bono) | Treino diário | 1,08 | R$ 1.242,00 | false |
| 3a095637-f8a8-46b1-b482-196c4bf4b86d | 12/02/2026 | Paloma Luczka | CONT-0088 (por_ato) | Atualização do débito para o mês de Fevereiro. Elaboração e… | 0,75 | R$ 637,50 | false |
| 493597a0-6d04-44bf-a4a6-518bb5fa5e2d | 09/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | envio de protocolo de acordo | 0,17 | R$ 195,50 | false |
| 91aa4756-43c2-476d-bb96-a4ca80cc309e | 09/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Ennvio de e-mail informando protocolo de acordo | 0,17 | R$ 195,50 | false |
| 6280346a-501a-4859-b722-5c4fc2fa2abd | 23/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Primeiro ato na abertura de pastas. Incluir o valor da sucu… | 0,25 | R$ 287,50 | false |
| 2c57dc73-5866-4532-b2aa-632bf32d8e8f | 24/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Cancelada audiência por acordo | 0,25 | R$ 287,50 | false |
| ff0cc88b-213c-40ad-b92d-7cfae3cd5431 | 24/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | CANCELADA: Audiência PRESENCIAL: Letícia Laís X Inova | 0,25 | R$ 287,50 | false |
| e8b67f4c-46d0-4526-bf3f-1f7dddeeed8d | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Verificação de  publicação que suspendeu o nosso RR | 0,25 | R$ 287,50 | false |
| d47e9e0b-04dc-490e-8e92-70e7b457b55b | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | E-mail para cliente e cotação de perícia | 0,25 | R$ 287,50 | false |
| 4f483b8f-7862-4b3d-9506-1eca94cbc552 | 26/02/2026 | Paloma Luczka | CONT-0094 (por_ato) | Elaboração e protocolo de petição habilitando-se nos autos,… | 0,42 | R$ 357,00 | false |
| aa4de9db-40a3-429f-b691-01fef535b6d9 | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Providenciar documentação inicial necessária e análise. | 1,00 | R$ 1.150,00 | false |
| ad465343-5d0a-43ca-a1c0-03e56b7fe371 | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Providenciar documentação inicial necessária e análise. | 0,48 | R$ 552,00 | false |
| a224eb49-04ee-4a6c-8267-5884a3166430 | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 0,25 | R$ 287,50 | false |
| b901b03b-85f3-45fa-9eb2-8f1c7aec57ab | 28/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Sobrestamento_informar Cida | 0,25 | R$ 287,50 | false |
| 96514cae-b825-493b-9d90-c21533932ac1 | 28/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Elaboração de Defesa (Prazo Fatal: 02/03/2026). | 4,67 | R$ 5.370,50 | false |
| e89bc863-b0bd-4485-9916-44d644990354 | 01/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Primeiro ato na abertura de pastas. Incluir o valor da sucu… | 0,25 | R$ 287,50 | false |
| 5bb887be-e744-4526-80f4-c4dd7ad0ca48 | 03/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Conferi documentos para defesa e organização | 1,25 | R$ 1.437,50 | false |
| 4f656586-76c1-467f-bacd-fce9daba5764 | 03/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Audiência: Manoel X Inova- preparação e realização | 0,50 | R$ 575,00 | false |
| a5630211-1a4e-4ff8-b114-0a93b59f70f7 | 03/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | redesignaçãode prazo | 0,25 | R$ 287,50 | false |
| 0a2962d9-5e91-4e06-9300-608b3af82f3d | 03/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | FUP- verificar resposta da CIda para acordo | 0,25 | R$ 287,50 | false |
| 9d6e36cc-6c08-4388-8fa4-2d9b46f1a81a | 09/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | e-mails para empresa e para Dr. Caio. Providências para rea… | 0,25 | R$ 287,50 | false |
| 668ea44a-797b-445d-b46b-780d0588c1bd | 10/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Trabalho na tarefa: Conclusão de Defesa e organização dos d… | 1,55 | R$ 1.782,50 | false |
| c28b5234-6400-4499-b0a7-6e3005fc5768 | 11/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 1,00 | R$ 1.150,00 | false |
| 4a2de65d-e14f-4e45-b2c4-abd3affe9b36 | 13/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Confirmada audiência pelo Dr. Gustavo | 0,17 | R$ 195,50 | false |
| 8c21b264-1719-4b75-8170-a6b5944b286d | 17/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | E-mail para correspondente confirmando providências para au… | 0,08 | R$ 92,00 | false |
| c4e9400b-eced-4718-b6d5-bb36bfdefd39 | 20/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Adiantamento facultativo honorários periciais (R$ 1.000,00) | 0,08 | R$ 92,00 | false |
| 4e62e830-bed1-4c8a-af81-1cea78442ad0 | 30/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 1,00 | R$ 1.150,00 | false |
| de3a6b3c-f114-4537-92da-ff53c44780d9 | 30/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 1,00 | R$ 1.150,00 | false |
| d1a3d8fe-1424-41ce-9c07-fc56f2452fdf | 31/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | FUP- confirmado Dr.Caio | 0,17 | R$ 195,50 | false |
| be8edae9-2bb6-4008-8975-aaa9d956f4c0 | 31/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 1,00 | R$ 1.150,00 | false |
| b17b8913-ff2c-4bee-906e-2aafe7602cb4 | 31/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | reagendamento | 0,08 | R$ 92,00 | false |
| 297c90aa-c33c-4070-9d60-1af1c29221a4 | 31/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Julgamento do IRR  93  no TST | 1,00 | R$ 1.150,00 | false |
| 504670e7-a191-44d4-8a46-5fca6f85415d | 01/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Solicitar documentos e informações | 1,60 | R$ 1.840,00 | false |
| 18fcfbf3-8a05-477a-ad75-f546b54e3256 | 09/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | Trabalho na tarefa: FUP_ Verificar possibilidade de acordo,… | 0,27 | R$ 310,50 | false |
| b9f4c8f6-9edd-42e7-babe-fa8131fa8ccb | 09/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0094 (por_ato) | FUP - Correspondente- audiência TelePRESENCIAL-  para conci… | 0,15 | R$ 172,50 | false |
| c1dfcdba-4a41-4b8b-b2f2-43f1150abadb | 20/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0108 (por_ato) | ACORDO: Juntar comprovante da 1ª parcela e pagamento dos ho… | 1,00 | R$ 1.150,00 | false |
| 9cfc9297-d587-43a3-a865-691ca5a5e452 | 20/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0108 (por_ato) | Pagamento da parcela 01/03 para o recte e para o advogado :… | 1,00 | R$ 1.150,00 | false |
| 22dbee12-781c-471a-abc9-1d8092f42f54 | 02/04/2026 | Flávia Martins Fuzaro Polycar… | CONT-0108 (por_ato) | Acordo ou parcelamento | 1,00 | R$ 1.150,00 | false |
| 7cd9bb81-81d9-4084-8a21-f3e1c4b39827 | 20/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0114 (fixo) | andamento | 0,33 | R$ 379,50 | false |
| 59878f32-07ee-4bef-9238-4e33f1ec8372 | 20/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0116 (por_ato) | ACORDO: R$ 3.500,00 em 03 (três) parcelas. Período: começa … | 1,00 | R$ 1.150,00 | false |
| d7d0e32c-d576-48f1-8a2a-65a89aba447f | 01/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0116 (por_ato) | Acordo quitado. Calcular o ÊXITO. Encerrar Pasta. | 0,18 | R$ 207,00 | false |
| 673ebac5-78d0-4c80-af3d-d9575203ba43 | 20/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0119 (fixo) | Acompanhar admissibilidade do RR da Reclamante. (19/12 venc… | 1,00 | R$ 1.150,00 | false |
| e97d4a96-2e7f-4c54-8a2f-1f6ab850c754 | 24/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0119 (fixo) | CANCELADO!Enviar os cálculos para Adalmário já providenciar… | 0,25 | R$ 287,50 | false |
| 79fe4472-99f9-40e5-93f5-9ea000f9c249 | 03/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0119 (fixo) | Apuração do cálculo e elaboração da petição | 2,62 | R$ 3.013,00 | false |
| 4327ed0d-b8c6-4a29-9772-8c4ab933e76b | 20/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0120 (por_ato) | ACORDO: R$ 53.000,00 em 15 parcelas. Vencimento da 3ª parce… | 0,25 | R$ 287,50 | false |
| 983aa630-c330-47f0-ab64-d75115bcd315 | 05/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0120 (por_ato) | ACORDO: R$ 53.000,00 em 15 parcelas. Vencimento das parcela… | 0,25 | R$ 287,50 | false |
| db0efa38-39e2-4ec7-8942-83c27e879513 | 01/04/2026 | Andrei Gomes da Silva Pinto | CONT-0125 (por_hora) | Validação final das minutas para assinatura dos investidore… | 0,67 | R$ 402,00 | true |
| 8c8e743a-b12b-478d-a776-9d2164b758c4 | 25/02/2026 | Paloma Luczka | CONT-0126 ([fixo, por_ato]) | Elaboração e protocolo de petição habilitando-se nos autos. | 0,50 | R$ 425,00 | false |
| fd6835ac-5e09-4de3-b653-6fdb9e5294d0 | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0126 ([fixo, por_ato]) | Trabalho na tarefa: ACORDO.Preparar minuta e avisar Selma | 2,00 | R$ 2.300,00 | false |
| da9bccb4-960c-4ecf-a70a-c9610c50a5ed | 26/02/2026 | Flávia Martins Fuzaro Polycar… | CONT-0126 ([fixo, por_ato]) | ACORDO. Preparar para Dra. Michelli | 0,80 | R$ 920,00 | false |
| b5250864-de7b-4811-8e8c-428dd56dc2f7 | 02/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0126 ([fixo, por_ato]) | Despacho para homologação e retirada de pauta | 0,25 | R$ 287,50 | false |
| 861d0bb6-81bc-446a-aef9-2987c4ea135b | 02/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0126 ([fixo, por_ato]) | CANCELADO.Elaboração de Defesa (Prazo Fatal: 16/03/2026). | 0,25 | R$ 287,50 | false |
| 84df1371-f487-4a4d-9c87-02257213107b | 02/03/2026 | Flávia Martins Fuzaro Polycar… | CONT-0126 ([fixo, por_ato]) | FUP Acordo para protocolo | 1,00 | R$ 1.150,00 | false |

## Já faturados (decisão manual)

São **0** registros que **já estão vinculados a uma fatura emitida** (ou marcados como faturados). Corrigir o `faturavel` aqui pode quebrar a conciliação contábil e fiscal. Cada caso precisa de análise específica.

_Nenhum registro nessa categoria._

## Recomendações

### Para os registros não faturados

- Você pode editar cada registro pelo módulo de timesheet, na rota `/dashboard/financeiro/timesheet`, abrindo o modal e marcando "Cobrável" novamente — agora a escolha manual é respeitada.
- Caso prefira corrigir em lote, use o UPDATE SQL específico (modelo na seção "Como executar a correção") apenas para os IDs que você revisou e aprovou.
- Antes de corrigir, confira a coluna **recálculo backend**: se for `true`, é forte sinal de que o bug realmente afetou o registro. Se for `false`, atenção dobrada — talvez o contrato tenha mudado depois do bug e a hora seria não cobrável mesmo hoje.

### Para os registros já faturados

Cada caso precisa de uma decisão consciente. As opções típicas são:

- **Emitir cobrança complementar** ao cliente, referente às horas não cobradas.
- **Aceitar a perda** caso o valor seja pequeno, o cliente seja sensível ou já exista contrato fechado por escopo.
- **Conversar com o cliente** antes de qualquer alteração contábil, principalmente quando a fatura já foi paga.
- Se decidir corrigir o registro, lembre-se de também avaliar o impacto na fatura original (ela pode precisar ser refeita ou complementada).

### Sobre o recálculo backend (`deveria_ser_faturavel`)

A coluna **recálculo backend** é o que a função nova retornaria **hoje** para o mesmo processo/consulta:

- Se for `true`: forte indício de que o bug afetou o registro e ele realmente deveria ser cobrável. Candidato natural à correção.
- Se for `false`: pode ser que o contrato tenha mudado depois do bug (por exemplo, virou "fixo" ou "por ato"). Nesse caso, a hora seria não cobrável mesmo agora — atenção dobrada antes de corrigir.

## Como executar a correção

Para corrigir um timesheet específico, use o seguinte UPDATE no banco (sempre via MCP Supabase):

```sql
UPDATE financeiro_timesheet
SET faturavel = true,
    faturavel_auto = false
WHERE id = '<timesheet_id_aqui>';
```

Recomendações de execução:

- Rode um `SELECT` antes do `UPDATE` para confirmar o estado atual do registro.
- Faça as correções em pequenos lotes (5 a 10 por vez) e revise após cada lote.
- Para registros já faturados, verifique também a fatura associada antes de qualquer alteração.
- Após a correção, marque o registro como revisado neste documento (riscando a linha ou anotando ao lado).

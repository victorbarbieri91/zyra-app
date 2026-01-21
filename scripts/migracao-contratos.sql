-- Migração de Contratos de Honorários
-- Total: 123 contratos
-- Erros: 6 registros não migrados
-- Gerado em: 2026-01-20T21:28:39.598Z

-- =====================================================
-- CONTRATOS COM ERRO (clientes não encontrados)
-- =====================================================
-- Linha 98: CI 195 - Cliente: Maristella Fuganti Cabello Campos - Cliente não encontrado no CRM
-- Linha 113: CI 203 - Cliente: 3Fg Negocios Imobiliarios e Intermediacao de Negocios Ltda - Cliente não encontrado no CRM
-- Linha 117: CI 209 - Cliente: Edinei Mercure - Cliente não encontrado no CRM
-- Linha 128: CI 225 - Cliente: Leonardo de Almeida Lira - Cliente não encontrado no CRM
-- Linha 129: CI 227 - Cliente: César Augusto dos Santos - Cliente não encontrado no CRM
-- Linha 131: CI 228 - Cliente: César Augusto dos Santos - Cliente não encontrado no CRM

-- =====================================================
-- INSERIR CONTRATOS
-- =====================================================

-- LOTE 1 (1 a 20)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0001', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'processo', 'por_etapa', '2024-09-01', 0, '391', true),
  ('CONT-2026-0002', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'd81a9417-48bc-4bbc-8dfb-c155b0c39765', 'consultoria', 'por_hora', '2013-01-01', 0, 'João Hamilton - Time Sheet', true),
  ('CONT-2026-0003', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b3953702-a382-4d46-bce2-68b35e01fdd7', 'processo', 'por_etapa', '2013-04-25', 0, 'Digon - Movinord', true),
  ('CONT-2026-0004', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ea4a6262-cb93-4a72-9d2d-462c65409a7d', 'processo', 'por_etapa', '2014-01-07', 0, 'Sciencia - CR Com. e Serv. Ltda', true),
  ('CONT-2026-0005', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ea4a6262-cb93-4a72-9d2d-462c65409a7d', 'processo', 'por_etapa', '2014-10-27', 0, 'Scientia - Maria da Penha', true),
  ('CONT-2026-0006', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4251acbd-f79e-4ebb-bf13-83dfb0c32d6c', 'processo', 'por_etapa', '2016-02-18', 0, 'Platlog - Êxito', true),
  ('CONT-2026-0007', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ca54027a-7d01-4728-a6ed-be73314ed938', 'processo', 'por_etapa', '2016-02-18', 0, 'Refricon - Êxito', true),
  ('CONT-2026-0008', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4251acbd-f79e-4ebb-bf13-83dfb0c32d6c', 'consultoria', 'por_hora', '2016-03-23', 0, 'Platlog - Time Sheet', true),
  ('CONT-2026-0009', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'c5737626-3742-404c-b8fb-c832bb0c3c98', 'misto', 'por_hora', '2016-04-01', 0, 'Marco Vitiello - Time Sheet', true),
  ('CONT-2026-0010', 'f2568999-0ae6-47db-9293-a6f1672ed421', '33c23eb2-bdc6-4a42-8e31-db1b8c208bfa', 'misto', 'por_etapa', '2016-04-01', 0, '28', true),
  ('CONT-2026-0011', 'f2568999-0ae6-47db-9293-a6f1672ed421', '9ead1364-96c1-44b9-911b-91b0c7585dd1', 'misto', 'por_etapa', '2016-04-12', 0, '32', true),
  ('CONT-2026-0012', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a68014ad-4744-46bc-82e9-757312624b04', 'misto', 'por_etapa', '2016-05-13', 0, '41', true),
  ('CONT-2026-0013', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7acf4228-5c98-480c-92f4-3d5a7dd64af5', 'misto', 'por_etapa', '2016-05-13', 0, '40', true),
  ('CONT-2026-0014', 'f2568999-0ae6-47db-9293-a6f1672ed421', '3d4a2e4d-b0ea-4bf4-9ddb-5839d0437fd9', 'consultoria', 'por_hora', '2016-07-06', 0, 'Veloso Time Sheet', true),
  ('CONT-2026-0015', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4b5438a7-1f6a-4326-95a2-981a688968f3', 'misto', 'por_etapa', '2016-07-11', 0, '50', true),
  ('CONT-2026-0016', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'd60086e9-5257-47e9-a11d-bae8c01c12a1', 'consultoria', 'por_etapa', '2017-07-26', 0, 'Luiz Octávio - ITCMD', true),
  ('CONT-2026-0017', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'f597a652-8e95-412e-8dab-d5aa2efe6c1f', 'consultoria', 'por_hora', '2018-09-18', 0, 'Forfuturing - Time Sheet', true),
  ('CONT-2026-0018', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8f3d71f2-5db5-4b1a-ae80-bd1f2d130ddf', 'misto', 'por_etapa', '2018-10-17', 0, '91', true),
  ('CONT-2026-0019', 'f2568999-0ae6-47db-9293-a6f1672ed421', '92e88394-22c1-47d0-90f3-1511533dab8d', 'misto', 'por_etapa', '2018-11-19', 0, '92', true),
  ('CONT-2026-0020', 'f2568999-0ae6-47db-9293-a6f1672ed421', '3387e692-a093-4160-abc4-5c64ed58cec4', 'misto', 'por_etapa', '2019-06-14', 0, '260', true);

-- LOTE 2 (21 a 40)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0021', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'dccc86e2-6a60-49f1-ace4-5a748db42ded', 'misto', 'por_etapa', '2019-10-01', 0, '221', true),
  ('CONT-2026-0022', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'e98e7690-7dae-4dd9-b746-6ebc3b7312b2', 'processo', 'por_etapa', '2020-02-18', 0, 'Kona - Contencioso ~Exito', true),
  ('CONT-2026-0023', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'processo', 'por_etapa', '2020-06-23', 0, 'Belcorp Bandeira', true),
  ('CONT-2026-0024', 'f2568999-0ae6-47db-9293-a6f1672ed421', '322702b5-30f9-4f1f-a9c0-3db4f4f70223', 'misto', 'por_etapa', '2020-10-27', 0, '235', true),
  ('CONT-2026-0025', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7579eaea-2bdb-4d1f-b537-ee7b6e506244', 'consultoria', 'fixo', '2020-11-01', 0, '388', true),
  ('CONT-2026-0026', 'f2568999-0ae6-47db-9293-a6f1672ed421', '92a73017-8177-4b8a-b014-c372a86bbc60', 'misto', 'fixo', '2021-01-05', 0, '245', true),
  ('CONT-2026-0027', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7579eaea-2bdb-4d1f-b537-ee7b6e506244', 'consultoria', 'por_etapa', '2021-02-25', 0, '250', true),
  ('CONT-2026-0028', 'f2568999-0ae6-47db-9293-a6f1672ed421', '57a48c11-689d-4880-b3ae-f7cb838fea6c', 'processo', 'por_etapa', '2021-03-01', 0, 'Karina Ochsenhofer x Sueli', true),
  ('CONT-2026-0029', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'c895edad-21b8-45e2-b664-690505d30460', 'misto', 'fixo', '2021-03-19', 0, '254', true),
  ('CONT-2026-0030', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8df593c3-2bca-49fe-9b80-dc3b25dee7d8', 'misto', 'fixo', '2021-04-15', 0, '258', true),
  ('CONT-2026-0031', 'f2568999-0ae6-47db-9293-a6f1672ed421', '0dda87ae-9928-4ad6-8f7f-efe441fed2d5', 'misto', 'por_etapa', '2021-06-07', 0, '4 fx - Uniqq', true),
  ('CONT-2026-0032', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4251acbd-f79e-4ebb-bf13-83dfb0c32d6c', 'processo', 'por_etapa', '2022-02-18', 0, 'Platlog - Bertola', true),
  ('CONT-2026-0033', 'f2568999-0ae6-47db-9293-a6f1672ed421', '9d08c52c-f627-4445-b684-e7eaaffb9906', 'misto', 'fixo', '2022-06-01', 0, '308', true),
  ('CONT-2026-0034', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8d02a071-d6dc-4dae-b4d9-efd350550f9a', 'misto', 'por_etapa', '2022-07-28', 0, '309 - Processual', true),
  ('CONT-2026-0035', 'f2568999-0ae6-47db-9293-a6f1672ed421', '988ef900-f618-4cf1-a0b4-435153d35728', 'misto', 'fixo', '2022-08-01', 0, '313', true),
  ('CONT-2026-0036', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4a2c33e7-1fef-43b1-a05e-69d19e201afb', 'consultoria', 'por_hora', '2022-08-08', 0, 'Mello - Time Sheet', true),
  ('CONT-2026-0037', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'fc45c380-e12c-435d-ab05-fc7ce1bf682d', 'misto', 'por_etapa', '2022-10-05', 0, '312', true),
  ('CONT-2026-0038', 'f2568999-0ae6-47db-9293-a6f1672ed421', '4548a493-cbfc-447d-976f-0f9d5efc0578', 'processo', 'por_etapa', '2023-01-09', 0, 'Vale Verde - Contencioso Trabalhista', true),
  ('CONT-2026-0039', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'eb7a1962-c846-4ec4-96d0-b428cbff2ba0', 'misto', 'por_etapa', '2023-02-13', 0, '325', true),
  ('CONT-2026-0040', 'f2568999-0ae6-47db-9293-a6f1672ed421', '004368d5-4063-4dd5-9507-700a848afee3', 'misto', 'fixo', '2023-02-21', 950, '329', true);

-- LOTE 3 (41 a 60)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0041', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'd6280f26-9255-46a7-987d-cb24bf06ba35', 'processo', 'por_etapa', '2023-03-07', 0, 'WGS & Filhos', true),
  ('CONT-2026-0042', 'f2568999-0ae6-47db-9293-a6f1672ed421', '76acbf7f-f2c2-45c0-b49d-208a6d05b3cb', 'misto', 'fixo', '2023-05-12', 0, '380', true),
  ('CONT-2026-0043', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'f0835414-26e4-497b-b980-7ca1e9a16076', 'misto', 'fixo', '2023-05-19', 0, '336', true),
  ('CONT-2026-0044', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'e4821c41-706c-41f8-9eb6-9da7b53a1c20', 'misto', 'fixo', '2023-06-15', 0, '339', true),
  ('CONT-2026-0045', 'f2568999-0ae6-47db-9293-a6f1672ed421', '41ec99b7-0751-4e9c-b761-af594b28ffd6', 'misto', 'fixo', '2023-07-19', 0, '376', true),
  ('CONT-2026-0046', 'f2568999-0ae6-47db-9293-a6f1672ed421', '41ec99b7-0751-4e9c-b761-af594b28ffd6', 'misto', 'fixo', '2023-07-19', 0, '377', true),
  ('CONT-2026-0047', 'f2568999-0ae6-47db-9293-a6f1672ed421', '41ec99b7-0751-4e9c-b761-af594b28ffd6', 'misto', 'fixo', '2023-07-23', 0, '375', true),
  ('CONT-2026-0048', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a57812e8-64b4-4f94-9ec4-e3a389c02f25', 'misto', 'fixo', '2023-08-01', 0, '344', true),
  ('CONT-2026-0049', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'fixo', '2023-08-01', 0, '385', true),
  ('CONT-2026-0050', 'f2568999-0ae6-47db-9293-a6f1672ed421', '69702a8c-35b0-4136-9c71-4ea17a4c4da5', 'processo', 'por_etapa', '2023-08-06', 0, 'Le Bife - Expande', true),
  ('CONT-2026-0051', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'consultoria', 'por_etapa', '2024-01-01', 0, 'Belcorp - Tributário', true),
  ('CONT-2026-0052', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'consultoria', 'fixo', '2024-01-01', 0, 'Belcorp Corporativo', true),
  ('CONT-2026-0053', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'misto', 'fixo', '2024-01-02', 0, '369', true),
  ('CONT-2026-0054', 'f2568999-0ae6-47db-9293-a6f1672ed421', '69b363b8-2fef-4b8e-b604-568833b7eaa7', 'misto', 'fixo', '2024-02-27', 0, '350', true),
  ('CONT-2026-0055', 'f2568999-0ae6-47db-9293-a6f1672ed421', '53e70cd9-f2da-44cf-8ffd-050b23f112cf', 'consultoria', 'por_hora', '2024-03-01', 0, '8 Inova - Time Sheet', true),
  ('CONT-2026-0056', 'f2568999-0ae6-47db-9293-a6f1672ed421', '53e70cd9-f2da-44cf-8ffd-050b23f112cf', 'processo', 'fixo', '2024-03-01', 0, 'Inova TS - Contencioso Trabalhista', true),
  ('CONT-2026-0057', 'f2568999-0ae6-47db-9293-a6f1672ed421', '077d8d52-8150-4aab-9e42-b169e2c9251b', 'misto', 'por_etapa', '2024-03-01', 0, '373', true),
  ('CONT-2026-0058', 'f2568999-0ae6-47db-9293-a6f1672ed421', '0575cd02-4134-4416-b325-f09cb622b132', 'misto', 'por_etapa', '2024-04-11', 0, 'Ana Carolina Pesciallo - Execução Débora', true),
  ('CONT-2026-0059', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b9a63bee-efe0-4765-9e00-cc975e81f69e', 'consultoria', 'por_hora', '2024-06-05', 0, '365 Dádiva - Time Sheet', true),
  ('CONT-2026-0060', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b9a63bee-efe0-4765-9e00-cc975e81f69e', 'processo', 'por_etapa', '2024-06-05', 0, 'Dádiva - Contencioso Cível', true);

-- LOTE 4 (61 a 80)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0061', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b9a63bee-efe0-4765-9e00-cc975e81f69e', 'consultoria', 'por_etapa', '2024-06-05', 0, 'Dádiva - Distribuidora - Tributário', true),
  ('CONT-2026-0062', 'f2568999-0ae6-47db-9293-a6f1672ed421', '646bf71a-178e-49b3-90df-c876ee0efab2', 'processo', 'por_etapa', '2024-06-05', 0, 'Dádiva - Indústria - Contencioso Cível', true),
  ('CONT-2026-0063', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'fixo', '2024-06-26', 0, '389', true),
  ('CONT-2026-0064', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'por_etapa', '2024-07-30', 0, '359', true),
  ('CONT-2026-0065', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'por_etapa', '2024-07-31', 0, '358', true),
  ('CONT-2026-0066', 'f2568999-0ae6-47db-9293-a6f1672ed421', '53e70cd9-f2da-44cf-8ffd-050b23f112cf', 'processo', 'por_etapa', '2024-08-01', 0, 'Inova TS - Contencioso Cível', true),
  ('CONT-2026-0067', 'f2568999-0ae6-47db-9293-a6f1672ed421', '99988d18-fc93-4994-86b3-7d603bcaffa3', 'consultoria', 'por_hora', '2024-08-01', 0, 'Le Bife Restaurante Time Sheet', true),
  ('CONT-2026-0068', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'consultoria', 'por_etapa', '2024-08-01', 0, '360', true),
  ('CONT-2026-0069', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'fixo', '2024-08-01', 0, '361', true),
  ('CONT-2026-0070', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'misto', 'fixo', '2024-08-01', 0, '362', true),
  ('CONT-2026-0071', 'f2568999-0ae6-47db-9293-a6f1672ed421', '646bf71a-178e-49b3-90df-c876ee0efab2', 'consultoria', 'por_etapa', '2024-08-16', 0, '366 - Dádiva - Indústria - Contencioso Tributário', true),
  ('CONT-2026-0072', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ca659243-a6b5-4287-8b7f-6d258848f882', 'consultoria', 'por_hora', '2024-08-16', 0, 'Le Bife Eventos - Time Sheet', true),
  ('CONT-2026-0073', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ca659243-a6b5-4287-8b7f-6d258848f882', 'misto', 'fixo', '2024-08-16', 0, '396', true),
  ('CONT-2026-0074', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'ec3f49f9-8365-453e-8392-19fd2ba2c4f2', 'misto', 'fixo', '2024-08-19', 0, '384', true),
  ('CONT-2026-0075', 'f2568999-0ae6-47db-9293-a6f1672ed421', '41ec99b7-0751-4e9c-b761-af594b28ffd6', 'misto', 'fixo', '2024-08-19', 0, '374', true),
  ('CONT-2026-0076', 'f2568999-0ae6-47db-9293-a6f1672ed421', '396d4cfa-d5bc-415a-a9ca-6102c0643f2f', 'consultoria', 'por_hora', '2024-08-19', 0, 'Barra do Caí - Time Sheet', true),
  ('CONT-2026-0077', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'f0941d36-7b75-4ebf-af11-17770cae10aa', 'misto', 'fixo', '2024-08-19', 0, '383', true),
  ('CONT-2026-0078', 'f2568999-0ae6-47db-9293-a6f1672ed421', '92a73017-8177-4b8a-b014-c372a86bbc60', 'misto', 'fixo', '2024-08-19', 0, '382', true),
  ('CONT-2026-0079', 'f2568999-0ae6-47db-9293-a6f1672ed421', '162b5bde-b7d0-4a53-b340-3203d611c8cb', 'misto', 'fixo', '2024-08-20', 0, '387', true),
  ('CONT-2026-0080', 'f2568999-0ae6-47db-9293-a6f1672ed421', '81773360-8d23-4720-8021-b8d19a1dc817', 'misto', 'por_etapa', '2024-08-20', 0, '392', true);

-- LOTE 5 (81 a 100)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0081', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b86d876d-6099-4476-9438-4b993f170b41', 'misto', 'por_etapa', '2024-08-20', 0, 'Mari Bizz', true),
  ('CONT-2026-0082', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b250d7f1-8dad-4fe4-acf8-f52fbe9ba7d3', 'misto', 'por_etapa', '2024-08-30', 0, '390', true),
  ('CONT-2026-0083', 'f2568999-0ae6-47db-9293-a6f1672ed421', '965eb33d-b49a-4ef7-a859-e101930746e4', 'misto', 'por_etapa', '2024-09-03', 0, '393', true),
  ('CONT-2026-0084', 'f2568999-0ae6-47db-9293-a6f1672ed421', '29baa92e-b3ce-4887-85b7-5b7a90ea9f62', 'consultoria', 'por_hora', '2024-09-03', 0, 'Paloma Sequeiros - Time Sheet', true),
  ('CONT-2026-0085', 'f2568999-0ae6-47db-9293-a6f1672ed421', '25fcc11e-cdee-466e-a89b-a00682824c71', 'misto', 'por_etapa', '2024-09-05', 0, '394', true),
  ('CONT-2026-0086', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b250d7f1-8dad-4fe4-acf8-f52fbe9ba7d3', 'misto', 'por_etapa', '2024-09-06', 0, '395', true),
  ('CONT-2026-0087', 'f2568999-0ae6-47db-9293-a6f1672ed421', '096ee6a5-78b8-4255-99f2-39a479f34328', 'consultoria', 'por_hora', '2024-10-01', 0, 'Eliane Luchetti - Time Sheet', true),
  ('CONT-2026-0088', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'processo', 'por_etapa', '2024-10-01', 0, '401', true),
  ('CONT-2026-0089', 'f2568999-0ae6-47db-9293-a6f1672ed421', '629fd27a-b9e4-4cba-9f27-f96309539e9f', 'processo', 'por_etapa', '2024-11-01', 0, 'Fernanda Silva Santos', true),
  ('CONT-2026-0090', 'f2568999-0ae6-47db-9293-a6f1672ed421', '34dd0c55-9407-4db2-a3f1-1a282cb7ceee', 'consultoria', 'por_etapa', '2025-01-13', 0, 'Delquímica - Projeto Sucessão Societária', true),
  ('CONT-2026-0091', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7f001fd6-ebc9-4fab-9c62-7697bae66d6c', 'misto', 'fixo', '2025-01-17', 1600, '403', true),
  ('CONT-2026-0092', 'f2568999-0ae6-47db-9293-a6f1672ed421', '89a55bb5-d4e3-43cb-ac71-b4a4826ce35c', 'processo', 'por_etapa', '2025-02-01', 0, 'Crislene Marchioto', true),
  ('CONT-2026-0093', 'f2568999-0ae6-47db-9293-a6f1672ed421', '096ee6a5-78b8-4255-99f2-39a479f34328', 'processo', 'por_etapa', '2025-02-01', 0, 'Eliane - Processo Judicial Condomínio', true),
  ('CONT-2026-0094', 'f2568999-0ae6-47db-9293-a6f1672ed421', '53e70cd9-f2da-44cf-8ffd-050b23f112cf', 'processo', 'por_etapa', '2025-02-01', 0, 'Inova - 2025 - Contencioso Trabalhista', true),
  ('CONT-2026-0095', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7485f1f8-38e4-4c7c-83d4-34eeba1b80ba', 'processo', 'por_etapa', '2025-02-01', 0, 'Zait - Contencioso Trabalhistas', true),
  ('CONT-2026-0096', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7e6ecf89-a539-49bc-9990-200750b78e9a', 'consultoria', 'por_hora', '2025-02-14', 0, 'Edvaldo Morata - Time Sheet', true),
  ('CONT-2026-0097', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'e685976b-2204-4e84-8ebc-cc4879ed746f', 'consultoria', 'fixo', '2025-02-19', 0, 'BT - Tributário', true),
  ('CONT-2026-0098', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'fb6fcdf2-117d-4a5e-9762-de919b3b0b80', 'processo', 'por_hora', '2025-02-25', 0, 'Carjim - Time Sheet', true),
  ('CONT-2026-0099', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b6978587-18c2-44ba-91ed-7881d6480c10', 'processo', 'por_etapa', '2025-03-10', 0, 'Fábio Alexandre Galdeano - RT - Ricardo Lucindo Cruz', true),
  ('CONT-2026-0100', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'consultoria', 'por_hora', '2025-03-17', 0, 'Tributário - Time Sheet', true);

-- LOTE 6 (101 a 120)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0101', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'a1809ddb-f5d8-4224-bed8-2b91a6e31fc1', 'consultoria', 'por_hora', '2025-03-17', 0, 'Time Sheet - Corporativo', true),
  ('CONT-2026-0102', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b41150ee-c24d-4791-a385-41a82632d3a5', 'consultoria', 'por_etapa', '2025-03-17', 0, 'Thales e Daniel - Negociação saída Verity', true),
  ('CONT-2026-0103', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7485f1f8-38e4-4c7c-83d4-34eeba1b80ba', 'consultoria', 'por_hora', '2025-03-20', 0, 'ZAIT - Time Sheet', true),
  ('CONT-2026-0104', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8f82bfd9-68a2-41d9-8f3a-5870545282c5', 'processo', 'por_etapa', '2025-03-31', 0, 'Henrique - Assuntos trabalhista - Doméstica', true),
  ('CONT-2026-0105', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'bb0499fd-7357-4835-bbbd-1d9a83d8ed4f', 'processo', 'por_hora', '2025-04-01', 0, 'Silvia Veitzman - Time Sheet', true),
  ('CONT-2026-0106', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'consultoria', 'por_etapa', '2025-04-01', 0, 'YOFC - MS Desembraço aduaneiro', true),
  ('CONT-2026-0107', 'f2568999-0ae6-47db-9293-a6f1672ed421', '29d3ad53-3892-4464-a079-0df59a579bb2', 'processo', 'por_etapa', '2025-04-03', 0, '´Marco Aurélio Raimundo - Êxito', true),
  ('CONT-2026-0108', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'dccc86e2-6a60-49f1-ace4-5a748db42ded', 'processo', 'por_etapa', '2025-05-01', 0, 'Sunglasses x Franco Boris Andrulis', true),
  ('CONT-2026-0109', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'fb7f5bfb-8460-41fa-a314-7764e2f80799', 'processo', 'por_etapa', '2025-05-08', 0, 'Brígida (Mocinha) - Pro-Bono', true),
  ('CONT-2026-0110', 'f2568999-0ae6-47db-9293-a6f1672ed421', 'b994fe74-8cb2-4864-96be-b796304a5de3', 'consultoria', 'por_etapa', '2025-05-27', 0, 'D''Rattan - Consultoria jurídica em geral', true),
  ('CONT-2026-0111', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'consultoria', 'por_etapa', '2025-06-20', 0, 'YOFC - Mandado de Segurança Compensação de Ofício nº 08114-00000737/2025', true),
  ('CONT-2026-0112', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'consultoria', 'por_etapa', '2025-06-25', 0, 'YOFC - Consultivo Tributário', true),
  ('CONT-2026-0113', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7579eaea-2bdb-4d1f-b537-ee7b6e506244', 'consultoria', 'por_etapa', '2025-07-01', 0, 'Prohabitat - M&A', true),
  ('CONT-2026-0114', 'f2568999-0ae6-47db-9293-a6f1672ed421', '90774dcd-f566-4d23-bbb9-d76368a5140a', 'processo', 'por_etapa', '2025-07-30', 0, 'IDPJ - Edvan', true),
  ('CONT-2026-0115', 'f2568999-0ae6-47db-9293-a6f1672ed421', '90774dcd-f566-4d23-bbb9-d76368a5140a', 'processo', 'por_etapa', '2025-07-30', 0, '423', true),
  ('CONT-2026-0116', 'f2568999-0ae6-47db-9293-a6f1672ed421', '66f1d7c1-e00d-4746-b5ed-0f97f218b6e4', 'processo', 'por_etapa', '2025-08-05', 0, 'Almeida - Reclamação Trabalhista', true),
  ('CONT-2026-0117', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8d02a071-d6dc-4dae-b4d9-efd350550f9a', 'consultoria', 'por_etapa', '2025-08-11', 650, 'Consultivo todas as áreas', true),
  ('CONT-2026-0118', 'f2568999-0ae6-47db-9293-a6f1672ed421', '7487fb99-eab7-4ebd-86f3-ee7d97839f79', 'processo', 'por_etapa', '2025-09-01', 0, 'RT Sebastião Joaquim de Souza', true),
  ('CONT-2026-0119', 'f2568999-0ae6-47db-9293-a6f1672ed421', '8f82bfd9-68a2-41d9-8f3a-5870545282c5', 'processo', 'por_etapa', '2025-09-15', 0, 'RT de Milene Galdino', true),
  ('CONT-2026-0120', 'f2568999-0ae6-47db-9293-a6f1672ed421', '311f40e5-d489-4b1f-bb54-08b3c01961b3', 'processo', 'por_etapa', '2025-10-13', 0, 'Reclamação Trabalhista - processo particular', true);

-- LOTE 7 (121 a 123)
INSERT INTO financeiro_contratos_honorarios
  (numero_contrato, escritorio_id, cliente_id, tipo_contrato, forma_cobranca, data_inicio, valor_total, descricao, ativo)
VALUES
  ('CONT-2026-0121', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'processo', 'por_etapa', '2025-11-01', 0, 'YOFC - Execução TEC WI', true),
  ('CONT-2026-0122', 'f2568999-0ae6-47db-9293-a6f1672ed421', '2f129759-ce2d-4f1d-ada9-33eabe310f04', 'processo', 'por_etapa', '2025-11-05', 0, 'YOFC - Embargos à Execução', true),
  ('CONT-2026-0123', 'f2568999-0ae6-47db-9293-a6f1672ed421', '6fd9a5b1-7185-47e6-a562-fad375a68e07', 'processo', 'por_etapa', '2025-12-09', 0, '431', true);

-- =====================================================
-- ATUALIZAR CONTADOR DE NUMERAÇÃO
-- =====================================================
UPDATE numeracao_modulos
SET ultimo_numero = 123
WHERE escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421'
  AND modulo = 'contratos';

-- Se não existir, criar
INSERT INTO numeracao_modulos (escritorio_id, modulo, prefixo, ultimo_numero, ano_atual)
SELECT 'f2568999-0ae6-47db-9293-a6f1672ed421', 'contratos', 'CONT', 123, 2026
WHERE NOT EXISTS (
  SELECT 1 FROM numeracao_modulos
  WHERE escritorio_id = 'f2568999-0ae6-47db-9293-a6f1672ed421' AND modulo = 'contratos'
);

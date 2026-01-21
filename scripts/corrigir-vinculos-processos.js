/**
 * Script para corrigir vínculos de processos nas tarefas da agenda
 * Identifica tarefas sem processo_id que deveriam ter e gera SQL de atualização
 */

const fs = require('fs');
const path = require('path');

// Mapeamento CNJ -> ID (atualizado do banco)
const processosCnj = {
  "0000028-31.2023.8.26.0076": "fd0d28f9-8fd1-4fba-b97f-03282c5f07d6",
  "0000333-44.2025.8.26.0076": "20610c2b-e736-4971-9e3a-f6aeab404f1e",
  "0000677-59.2024.8.26.0076": "67e12e1f-4f80-4f84-bbb7-69d182956a0e",
  "0000840-72.2024.8.17.3250": "d6711a93-9cac-46d1-ae32-4d2cf46cc718",
  "0000892-33.2023.8.03.0004": "82453c20-c3e4-499d-b867-1e957d459cc0",
  "0001652-85.2014.8.14.0005": "8969dfb7-8e5b-437b-8f4c-85b523600594",
  "0001898-31.2022.8.26.0114": "509e51eb-97ed-4eb2-9ebd-ea70fb6eaa6e",
  "0002601-45.2022.8.26.0248": "a85c7a0f-2fdc-4b75-95b7-d122e50bb50e",
  "0005150-60.2013.8.14.0027": "b6e54b1f-a57c-41a7-99ab-e9f4c0067b00",
  "0005263-82.2014.8.17.1130": "15bc9adb-f523-4c17-8964-e8b30d9557a0",
  "0005871-02.2023.8.26.0100": "acb14403-429f-492b-bb03-78be1b76907e",
  "0008416-24.2013.8.14.0005": "722acfde-a88e-43bd-8122-2cf80741156b",
  "0010015-80.2025.5.15.0140": "837f077a-143e-417b-8221-075153137f3e",
  "0010159-45.2025.5.15.0046": "06eb36e1-ee0e-456f-b301-046135d94587",
  "0010161-89.2025.8.26.0100": "c449c05e-459b-4a1b-9985-2954916bce8c",
  "0010263-14.2024.5.03.0173": "d8c000b0-f537-4d1f-b2c5-def06d0e93aa",
  "0010437-91.2025.5.15.0031": "98181293-5861-42cc-8377-d336c8cfa74f",
  "0010540-62.2024.5.15.0119": "668ea532-bf79-49f7-89d2-c7d7cfa4525f",
  "0010748-54.2025.5.03.0019": "1786c87a-6259-4e1f-b81f-f88c4e9588b2",
  "0010805-16.2022.5.03.0104": "bdc0546c-a92b-4bcf-a44e-bfde6bcce064",
  "0011038-03.2025.5.03.0041": "7889f849-da05-4ec5-9199-0890c2fdc8d1",
  "0011045-53.2024.5.15.0119": "7fe8010f-cca7-4f42-b2d7-e753fc5482aa",
  "0011074-06.2024.5.15.0119": "df5f2dc1-6d13-461e-a796-73f1b1407c1c",
  "0011365-69.2025.5.15.0119": "67082371-43ad-4117-860e-f613ec7a7a91",
  "0011957-95.2023.5.15.0083": "859bbf29-282d-4cac-a793-e7add18bea5d",
  "0013195-27.2025.8.26.0309": "cd94b0dc-9ccc-4342-a369-cd92fa72c63f",
  "0016876-22.2019.8.19.0208": "abe5c966-ebb8-4e2c-aae0-8cd21df105ce",
  "0017013-35.2025.8.26.0002": "b2a31020-72a6-4dc1-9316-5d0bd88f2fad",
  "0018395-29.2019.8.19.0209": "2859f380-c122-45d6-a4ce-768d6c01ba6f",
  "0020157-95.2024.5.04.0234": "c4f1c74b-16ef-46f5-81d3-9378e9de2383",
  "0021749-70.2016.8.19.0208": "66d8d297-3e67-446d-a935-f1091712cdd8",
  "0025214-13.2025.8.26.0100": "6838c74d-4af8-475a-b454-6700b1f4519b",
  "0028941-19.2021.8.26.0100": "1fcf781a-0d65-4df1-bc34-ffb130ef8477",
  "0029300-88.2003.5.14.0421": "b5a7c840-c836-49b9-a7e5-4bd05c86647f",
  "0033715-53.2025.8.26.0100": "c405fa7f-b86d-44f9-806e-a7fa763a2621",
  "0036236-39.2023.8.26.0100": "3b775a7a-b921-4fa9-acbd-d76423dc4b3c",
  "0037317-89.2024.8.26.0002": "43aa1636-5496-40de-8370-f9bb6fb7d88f",
  "0039858-69.2019.8.19.0001": "55311bfd-cedf-48f1-9614-e8484f83e798",
  "0040381-07.2024.8.26.0100": "15df0d0a-f924-476f-83a2-0ac6c41b978a",
  "0040806-34.2024.8.26.0100": "fac8b8f6-fa5b-443c-bce7-645cc16b592e",
  "0042091-28.2025.8.26.0100": "271e1e87-f4bf-4f3c-8aaa-d00eaed58048",
  "0046100-75.1984.5.02.0007": "d1bbd2c1-6db5-4595-b018-62d9fbc7efab",
  "0050568-74.2024.8.26.0100": "b33f2ced-3161-4620-939b-d3b864401c4d",
  "0054801-85.2015.8.26.0050": "e1a0116b-ddda-4c33-ad56-9486b2144f9b",
  "0055660-59.2012.8.26.0001": "2ccf17dc-a93a-4706-975e-5a5335ec8613",
  "0092223-32.2001.8.26.0100": "42d970ce-fd00-4371-b5f2-13a654d9a832",
  "0093668-08.2017.8.13.0223": "31b12cd3-eeca-4039-ac5e-265124c23183",
  "0100290-78.2025.5.01.0071": "0936d505-72a2-4e86-91e9-df855563a2c6",
  "0103500-49.1996.5.02.0032": "f1a300f6-99dd-438e-8212-d77dde977b48",
  "0112300-42.2005.5.02.0035": "8f298c9b-918e-4324-a1fc-059299f64aee",
  "0125200-79.1999.5.03.0022": "e3ed74c8-8113-4f23-b2d2-4c1447bd8f2f",
  "0151528-10.2022.8.19.0001": "36f634fc-85fb-4316-90fc-5efdb8605ff6",
  "0200664-61.2024.8.06.0164": "a0891153-e476-409c-a230-527988d8949a",
  "0200666-31.2024.8.06.0164": "6ccc3eda-3330-445e-a705-4b5d17f17583",
  "0255600-59.1995.5.02.0020": "5f821158-a318-4e87-941d-1d69eb5ad0f4",
  "0604619-37.2008.8.26.0100": "fc970a63-db75-498e-b9fe-3a973f3390e7",
  "0700964-49.2024.8.02.0043": "e051730f-2958-4af4-8137-8a3c07621363",
  "0707979-69.2022.8.02.0001": "e1924d17-caf6-4c71-8484-88fe1ba7fcd8",
  "0707986-61.2022.8.02.0001": "69ac779d-4f6e-42ce-86a0-5a2de63faa03",
  "0707991-83.2022.8.02.0001": "c1de566f-5205-4ec6-b4aa-f7ac23036c7b",
  "0709395-72.2022.8.02.0001": "7aea05ab-f36f-4920-bd66-b88665e06d29",
  "0714891-82.2022.8.02.0001": "520b3694-e394-490a-a316-9ca9f8dde6a1",
  "0722279-36.2022.8.02.0001": "ca7a9256-6749-451a-a8c3-6679e21dcf1b",
  "0723073-19.2022.8.07.0001": "f32e89cd-af4f-4688-b8a4-24d4bc492773",
  "0827991-36.2022.8.12.0001": "0c3f3e27-b400-4d92-b159-65696bd6dce6",
  "0834011-39.2023.8.15.2001": "88ebfa0a-b94f-4196-8d24-0ef72acc6842",
  "1000140-34.2023.5.02.0065": "8a694c1b-4b4f-43d4-b41e-bbcc66baca62",
  "1000329-46.2025.5.02.0031": "4bb03d66-69c9-437a-a87b-ad2331804b9f",
  "1000364-04.2024.5.02.0043": "23151ee4-e0a4-4218-b51e-3752e3dba5c7",
  "1000449-75.2017.5.02.0482": "28185509-9a84-430f-8f5a-6c323aaed9b6",
  "1000478-96.2023.5.02.0262": "b73184b0-b071-4762-a53c-ca9f762b72c1",
  "1000639-40.2024.8.26.0396": "beae1ae1-60c1-4a8c-8c34-50cfa604ae29",
  "1000717-88.2025.5.02.0211": "e68c1544-eb84-4b87-ba94-9135ee54cfde",
  "1000719-43.2025.5.02.0022": "d071f1e3-c732-44b0-b690-8d95714de063",
  "1000721-54.2023.8.26.0219": "7eb5d610-8961-47a6-a111-4a4757b46099",
  "1000770-12.2023.5.02.0382": "58f93c50-1a40-4948-9a0c-8ce5f16d535b",
  "1000860-90.2020.5.02.0716": "f3142219-18c2-42f2-8aad-ee263cf5947b",
  "1001121-23.2022.5.02.0025": "0aa6e890-fc23-4a1a-8419-b8814dae5f21",
  "1001243-22.2020.5.02.0020": "d4ebc7a1-a0fe-434c-9c41-66d8c7dce2b1",
  "1001395-19.2025.5.02.0045": "1d59b7bf-8221-42b7-ad0e-6e4045968ae7",
  "1001786-89.2025.5.02.0718": "c010f908-6052-4845-9aa3-b72f22fefdf3",
  "1001924-86.2025.5.02.0029": "cf3b68f8-3e8e-463a-af70-06a1bb805fdc",
  "1002304-28.2023.8.26.0396": "3aa92112-1316-44a2-ae74-4a7c7df8c55f",
  "1002321-88.2024.5.02.0609": "8623bdaa-f6cd-4147-ae86-e993800e3876",
  "1002332-71.2025.8.26.0704": "a2bd57c9-f712-4138-b8b4-d00b971b6254",
  "1003444-86.2023.8.26.0529": "6cca3cbf-0389-410c-b057-86c107ce6ebd",
  "1003445-71.2023.8.26.0529": "6a03bb7c-89ae-43f8-8244-23ccf015c709",
  "1003598-62.2024.8.26.0079": "120f77ec-b879-4954-9975-b836267a1c9b",
  "1004743-98.2019.8.26.0445": "e73143f5-90c1-4cdc-b141-a351d7eeed76",
  "1005763-34.2020.8.26.0011": "42356cd9-8d5f-43ab-9fb2-714682e00159",
  "1007113-71.2022.8.26.0016": "39da2bf7-85ca-4a65-b922-c3fb022cc3d1",
  "1008233-93.2019.8.26.0004": "aadea874-0cfb-436f-b74e-973d23c9b8d1",
  "1008604-91.2018.8.26.0004": "cef492cb-d5f0-4743-a2a0-fadee8efa8a4",
  "1009017-60.2025.8.26.0004": "2e8bd7fd-bc10-453d-8fb2-7bd545703ad6",
  "1009897-75.2018.8.26.0011": "da5b3969-4c5e-4998-b9cb-c55a6c250349",
  "1013218-58.2022.8.26.0309": "dedef150-d759-4e81-b7e4-8b8937e1c350",
  "1014682-83.2015.8.26.0529": "f310f9b7-6273-4fa7-81a9-8bc12604bfad",
  "1017085-33.2024.8.26.0004": "8973f753-66aa-4ad2-96c1-96d18d4fd265",
  "1019469-35.2025.8.26.0100": "c8a3c939-8128-4f98-a1f2-1db9674aac80",
  "1021369-21.2019.8.26.0114": "66310b06-390a-4964-9038-66adfc53dcf8",
  "1021571-47.2023.8.26.0602": "1dc93493-29d8-4aa7-9dec-1c91f6a11d87",
  "1022977-46.2022.8.26.0309": "6fdeb25c-7c1b-472b-be82-d7db40b5382f",
  "1027686-65.2023.8.26.0576": "30610052-f071-4d27-b1e8-0d2e075327c6",
  "1028512-93.2025.8.26.0100": "71698284-4f8f-47f2-978b-27b3b15c250c",
  "1030580-16.2025.8.26.0100": "877d6b3c-e3fb-4922-882b-7e56b8ead517",
  "1039789-43.2024.8.26.0100": "3e07f918-3a4f-4ce5-a8ed-d5eeecafac46",
  "1042218-51.2022.8.26.0100": "f025b74c-39c4-40ba-b678-aed2ab7357f4",
  "1050152-55.2025.8.26.0100": "5c01ae52-9f6b-40dc-b700-4831dd5ab42d",
  "1052709-40.2017.8.26.0053": "4f392ef7-1bfe-4aa9-b950-35767b5dc8ca",
  "1054644-64.2023.8.26.0002": "aaa4fdcd-b9dc-47ac-bbd7-2e73d736e9a7",
  "1059977-72.2022.8.26.0053": "2b3ba994-8430-437e-87f6-659fad51702b",
  "1060105-48.2022.8.26.0100": "bfb3c7c1-908a-49f7-8a97-79fa924768a0",
  "1062692-72.2024.8.26.0100": "221fb94a-d168-47d7-ac6a-a28a89cc8957",
  "1077155-05.2013.8.26.0100": "4a7ccf99-af7a-446d-89e9-b69c48575ce4",
  "1087537-76.2021.8.26.0100": "debc9ea1-1d2f-400a-b92d-c2d0fa0dd5dc",
  "1107634-29.2023.8.26.0100": "eb62ee35-075b-417c-bdb7-21eca7cbc618",
  "1128437-09.2018.8.26.0100": "910a8e47-1d7f-4eae-9cba-18a7429900fb",
  "1129434-55.2019.8.26.0100": "7a23f86e-460a-42d2-89c7-6323053a8c94",
  "1130420-43.2018.8.26.0100": "d7e61357-cd52-4a3d-8e14-fce3ba88cfa3",
  "1500123-59.2024.8.26.0655": "33fbb960-6bed-4ce8-a188-728e9152aabe",
  "1501039-30.2023.8.26.0655": "e085983e-bf95-4306-b9d9-6bd3e17109ae",
  "1501616-07.2019.8.26.0248": "830b5678-1d49-413a-8928-0bfd7e4c183c",
  "1502402-86.2022.8.26.0655": "532b53d1-b984-4255-a42d-9893c214ec0f",
  "1582972-81.2017.8.26.0090": "10363a67-d919-4b86-859e-6fcc888645ac",
  "1582973-66.2017.8.26.0090": "3b3a1ace-c7cc-44a8-a2cf-1658f2403a59",
  "1582974-51.2017.8.26.0090": "cd5fdf4e-ed4d-4165-bed6-b8eb407c1353",
  "1676268-36.2023.8.26.0224": "c557ca98-9b24-4d5b-88e8-395868bdaf5d",
  "2060184-14.2025.8.26.0000": "7cc6e57e-13cc-4e43-9fe6-0eb83a0669a5",
  "2237780-19.2024.8.26.0000": "4fe9e189-5db0-4930-8af1-684fd41c9a28",
  "2242951-20.2025.8.26.0000": "8cefe5e4-aa95-4c33-8436-0a032b09ebf0",
  "2329632-90.2025.8.26.0000": "da102190-b4ca-45b3-ac15-77630a23a939",
  "2360838-25.2025.8.26.0000": "0e5bd898-94dd-4f94-9797-fdc2f484355a",
  "2388924-06.2025.8.26.0000": "0fcd9c8b-4809-4fb1-8475-4b61378fa7bd",
  "4000021-77.2025.8.26.0115": "b9abca9d-05a9-413e-911b-b76531446dd9",
  "4001820-05.2025.8.26.0650": "51719014-815b-4248-b31f-fc7955f435e4",
  "5000473-29.2017.4.03.6128": "f52fd924-13bf-4d99-b170-037cc5d6f21e",
  "5000616-42.2022.4.03.6128": "404d632e-0b9e-456b-852c-04dd28eaf9b6",
  "5001436-90.2024.4.03.6128": "c149e054-bc47-4073-a4be-0baf42ddcffd",
  "5002087-25.2024.4.03.6128": "dfde37e9-d721-41d9-a2e0-a3d657420f0d",
  "5002108-93.2025.4.03.6183": "903d59f1-f682-4022-ba6d-15007f3a094a",
  "5002312-02.2024.4.03.6304": "3ba97753-97d7-4b28-995c-80fe7b428fa8",
  "5002718-03.2023.4.03.6128": "2ee15ff2-fda8-42f6-bb86-2ae78bfde186",
  "5003015-69.2025.8.08.0048": "a8d98666-bef2-415e-bb7a-4431aa7ec6c0",
  "5003690-67.2017.4.03.6100": "f62231d8-94f9-4dee-8160-86ee2bdaac33",
  "5003749-59.2025.4.03.6105": "14498633-f0f8-428c-8eb2-42e3743474ac",
  "5004571-13.2024.4.03.6128": "e56754cc-e55a-4e82-b63d-58888d2f0e50",
  "5004697-83.2022.4.03.6144": "2e5cdfa3-22af-49bd-9857-160109ab556a",
  "5005117-09.2025.4.03.6104": "65250a33-1095-461a-91d1-c5b6a7f031a0",
  "5005161-16.2020.4.03.6100": "52c40c31-c5df-4c36-8135-6c039d18d2a5",
  "5005740-33.2025.4.03.6182": "f6590ea8-aa58-446b-bee8-939924de1d6d",
  "5006680-84.2024.4.03.6100": "44eb7481-cfc4-4235-8e62-14dc184ba095",
  "5008365-08.2023.4.03.6183": "9938c9f0-ae81-4169-b0c0-acea4937a0e6",
  "5009669-74.2025.4.03.6182": "7d6b27aa-05c6-435e-8132-4d0fe6f31453",
  "5013247-13.2023.4.03.6183": "11132e9e-20b4-413e-9e6e-fcf013871525",
  "5015216-89.2021.4.03.6100": "6be49012-6013-4c76-84fd-8ce9cde18838",
  "5015488-78.2024.4.03.6100": "4330ed9c-dae5-4e0e-8297-ae7b38a90d6e",
  "5016071-30.2024.4.03.0000": "50b8bce4-5a8a-4e5e-b246-1fb361628ee9",
  "5018983-55.2024.8.24.0008": "13a1a0a5-1eb0-487d-9851-01e99bfc47f9",
  "5019389-15.2016.8.13.0024": "da24d2de-726b-407c-820b-58004a7f22f4",
  "5020540-60.2021.4.03.6100": "8afa33e2-b3bc-4c7e-9836-edf4957d4b64",
  "5020691-21.2024.4.03.6100": "456ceb49-c1ba-4d9c-86be-c0bd3de4bbbb",
  "5026301-04.2023.4.03.6100": "eebfbf88-1ff7-4ce8-a572-44d7500bcd37",
  "5048784-12.2024.8.08.0024": "c09fc4cf-6cca-49a7-bcdc-91b12da2d2fb",
  "5159399-29.2022.8.09.0051": "0191cbbd-faad-4270-840d-a0843f8b4926",
  "5230336-98.2021.8.09.0051": "296eaa1c-3ef8-468a-b52d-b06e052274cb",
  "5518608-89.2018.8.09.0051": "9a2cab00-74cc-4882-a5b7-c8ae91fa50cd",
  "5671988-07.2022.8.09.0112": "bdf90b7d-8a42-48bb-9ecf-5bc0486408e2",
  "8001826-55.2021.8.05.0039": "c5b0139d-6c75-4e6e-a55b-c8f77773b236"
};

// Parser de CSV com campos multiline
function parseCSV(content, delimiter = ';') {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (char === '\r') {
      // Skip
    } else {
      currentField += char;
    }
  }

  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Extrair CNJ do texto
function extractCNJ(text) {
  if (!text) return null;
  const match = text.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  return match ? match[1] : null;
}

// Sanitizar string para busca
function sanitizeForSearch(str) {
  if (!str) return '';
  return str
    .replace(/'/g, "''")
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim()
    .substring(0, 100); // Primeiros 100 chars para matching
}

// Ler CSV
const csvContent = fs.readFileSync(path.join(__dirname, 'migracao-agenda-utf8.csv'), 'utf8');
const rows = parseCSV(csvContent);

console.log('=== ANÁLISE DE VÍNCULOS DE PROCESSO ===\n');

const atualizacoes = [];
const semProcessoNoBanco = [];

// Processar linhas (a partir da linha 3, índice 2)
for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 13) continue;

  const ci = row[1]?.trim();
  if (!ci || isNaN(parseInt(ci))) continue;

  const numProcessoRaw = row[5]?.trim();
  const descricao = row[12]?.trim();
  const cnj = extractCNJ(numProcessoRaw);

  if (cnj) {
    const processoId = processosCnj[cnj];
    if (processoId) {
      // Tem CNJ e existe no banco - criar atualização
      atualizacoes.push({
        ci,
        cnj,
        processoId,
        descricao: sanitizeForSearch(descricao)
      });
    } else {
      // CNJ não existe no banco
      semProcessoNoBanco.push({ ci, cnj, descricao: descricao?.substring(0, 50) });
    }
  }
}

console.log(`Total de linhas com CNJ: ${atualizacoes.length + semProcessoNoBanco.length}`);
console.log(`CNJs encontrados no banco: ${atualizacoes.length}`);
console.log(`CNJs NÃO encontrados no banco: ${semProcessoNoBanco.length}`);

if (semProcessoNoBanco.length > 0) {
  console.log('\n=== CNJs NÃO CADASTRADOS ===');
  semProcessoNoBanco.forEach(item => {
    console.log(`CI ${item.ci}: ${item.cnj} - ${item.descricao}`);
  });
}

// Gerar SQL de atualização
let sql = `-- Correção de vínculos de processo nas tarefas
-- Gerado em: ${new Date().toISOString()}
-- Total de atualizações: ${atualizacoes.length}

`;

// Agrupar por processo_id para fazer UPDATE mais eficiente
// Mas como precisamos fazer match pelo título, vamos fazer um por um

atualizacoes.forEach((item, idx) => {
  sql += `-- CI ${item.ci} - CNJ: ${item.cnj}\n`;
  sql += `UPDATE agenda_tarefas SET processo_id = '${item.processoId}' `;
  sql += `WHERE processo_id IS NULL AND titulo ILIKE '%${item.descricao.substring(0, 50).replace(/'/g, "''")}%';\n\n`;
});

// Salvar SQL
fs.writeFileSync(path.join(__dirname, 'corrigir-vinculos-processos.sql'), sql);

console.log('\n=== ARQUIVO GERADO ===');
console.log('corrigir-vinculos-processos.sql');
console.log(`\nTotal de UPDATEs: ${atualizacoes.length}`);

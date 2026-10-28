# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web para enviar, listar e baixar documentos por usuário demonstrativo, com arquivos armazenados exclusivamente no filesystem local e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem e download dos documentos associados ao usuário informado.
- Gestão simples por usuário, identificado pelo header `X-User-Id`, sem autenticação real.
- Interface React para informar o usuário, selecionar arquivo, enviar, listar e baixar documentos.
- Validação de entrada, mensagens em português e tratamento de falhas de armazenamento.
- Preservação do endpoint de saúde existente.

### Fora do escopo

- Armazenamento externo, serviços de upload de terceiros ou nuvem.
- Banco de dados, persistência de metadados e recuperação automática após reinício.
- Cadastro, login, senhas, sessões, permissões administrativas e autenticação real.
- Versionamento, edição, exclusão, compartilhamento, busca e paginação de documentos.
- Visualização de arquivos no navegador, execução de conteúdo e análise antivírus.
- Deploy de produção, múltiplas instâncias e alta disponibilidade.

### Limite da entrega atual

Esta entrega consiste exclusivamente neste documento, `docs/specs/dms-spec.md`. Não envolve criar, alterar ou executar arquivos de backend e frontend, instalar dependências ou executar testes da aplicação. As etapas da seção 8 são um roteiro futuro, não uma autorização para implementá-las nesta entrega.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar exatamente um arquivo pelo campo multipart `file` e recebe os metadados com status `201` após a gravação e o registro bem-sucedidos. |
| RF-02 | O usuário pode listar somente documentos cujo `owner` corresponde ao `X-User-Id` informado. A resposta é um array, inclusive `[]` quando não houver documentos. |
| RF-03 | O usuário pode baixar um documento pelo identificador, desde que o dono corresponda ao usuário informado e o arquivo local exista. |
| RF-04 | Os três endpoints documentais exigem `X-User-Id` válido. O dono é derivado desse header, nunca de um campo do formulário. |
| RF-05 | Cada envio aceita qualquer extensão, com tamanho maior que zero e menor ou igual ao limite configurado, cujo padrão é 10 MiB. |
| RF-06 | O sistema rejeita arquivo ausente, vazio, múltiplos arquivos, campo de arquivo diferente de `file`, formulário inválido e tamanho excedido. |
| RF-07 | Cada documento recebe identificador e nome interno únicos, gerados pelo servidor. Arquivos com o mesmo nome original não sobrescrevem uns aos outros. |
| RF-08 | Os metadados são registrados somente depois de concluída a gravação do arquivo. Um upload malsucedido não deve produzir documento visível. |
| RF-09 | A listagem é ordenada por `uploadedAt` decrescente; em caso de empate, por `id` crescente em ordem lexicográfica. |
| RF-10 | O download entrega os mesmos bytes enviados, como anexo com o nome original normalizado, sem revelar nome interno ou caminho físico. |
| RF-11 | A interface permite informar o usuário e apresenta estados de carregamento, lista vazia, sucesso e erro em português, sem repetir o envio enquanto ele estiver em andamento. |
| RF-12 | Após upload bem-sucedido, a interface atualiza a listagem do usuário atual. Ao trocar de usuário, descarta a lista anterior e ignora respostas atrasadas associadas ao usuário anterior. |
| RF-13 | O backend retorna erros HTTP padronizados, incluindo os gerados pelo multer, sem expor stack traces ou caminhos locais. |
| RF-14 | Em falhas de upload ou de registro dos metadados, o sistema tenta remover arquivos parciais ou não registrados. Se a remoção falhar, registra a falha no servidor e não publica metadados. |
| RF-15 | `GET /health` continua disponível sem identificação de usuário e retorna `200` com `{"status":"ok"}`. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente em `backend/storage`, usando `multer.diskStorage`. Não utilizar `memoryStorage`, serviços externos ou banco para os arquivos. |
| RNF-02 | Os metadados ficam em memória em uma única instância do processo. O reinício perde os registros, mesmo que os arquivos permaneçam no disco. |
| RNF-03 | A configuração é obtida de variáveis de ambiente, com padrões documentados e validação na inicialização. |
| RNF-04 | O backend usa Node.js e Express em JavaScript CommonJS; o frontend usa React e Vite em JavaScript ESM, sem TypeScript nesta fase. |
| RNF-05 | O backend respeita `routes -> controllers -> services -> repositories`, sem dependências das camadas internas para as externas. |
| RNF-06 | O frontend usa componentes funcionais e Hooks, com organização em `components/`, `pages/` e `services/`, e comunicação via `fetch` pelo prefixo `/api`. |
| RNF-07 | A pasta local é resolvida independentemente do diretório de execução, criada se necessário e verificada na inicialização. A aplicação falha de forma clara se não puder preparar o armazenamento. |
| RNF-08 | Não publicar a pasta de arquivos como conteúdo estático. Caminhos são construídos somente a partir de nomes internos gerados pelo servidor, nunca de nomes ou caminhos arbitrários fornecidos pelo cliente. |
| RNF-09 | O servidor aplica o limite de tamanho durante o processamento do upload pelo multer. Validação no frontend é complementar, nunca suficiente. |
| RNF-10 | Downloads usam transferência de arquivo sem carregar seu conteúdo integral em memória no backend, com `Content-Disposition: attachment`, `Content-Type: application/octet-stream` e `X-Content-Type-Options: nosniff`. |
| RNF-11 | Nomes de símbolos são descritivos e em inglês; mensagens ao usuário e eventuais comentários são em português. Priorizar SOLID, DRY, KISS, YAGNI e dependências existentes. |
| RNF-12 | Os testes futuros do backend usam `node:test` e armazenamento temporário local isolado, sem afetar documentos reais. |
| RNF-13 | Falhas internas são registradas na saída do processo, sem registrar conteúdo dos documentos. Respostas ao cliente contêm apenas informações necessárias para entender a falha. |

### Configuração

| Variável | Padrão | Regra |
| --- | --- | --- |
| `PORT` | `3000` | Inteiro entre 1 e 65535 para a porta HTTP do backend. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Inteiro positivo seguro em bytes; o limite é inclusivo e corresponde a 10 MiB no padrão. |

Valores ausentes usam o padrão; valores presentes e inválidos impedem a inicialização. A localização `backend/storage` é fixa nesta fase, não um destino externo configurável. Se `PORT` for alterado, o destino do proxy de desenvolvimento deverá ser ajustado em uma implementação futura.

### Limitações assumidas

- `X-User-Id` é uma identificação demonstrativa manipulável pelo cliente. A filtragem por dono não constitui autenticação nem proteção adequada de produção.
- Não existe catálogo persistente: após reinício, a listagem começa vazia e arquivos antigos não podem ser baixados pela API sem seus metadados. Não há varredura para recuperação nem exclusão automática desses arquivos.
- Aceitar qualquer extensão não garante que o conteúdo seja seguro. O MIME e o nome enviados pelo cliente não comprovam o formato; o sistema não executa nem renderiza o arquivo.
- Falhas de processo podem deixar arquivos órfãos. A limpeza compensatória cobre falhas detectadas durante a requisição, sem prometer transação atômica entre disco e memória.
- O limite é por arquivo; não há quota total de disco nesta fase. Disco cheio resulta em erro de armazenamento, não em descarte de documentos existentes.

## 5. Modelo de dados (metadados do documento)

### Representação pública de `Document`

| Campo | Tipo | Descrição e validação |
| --- | --- | --- |
| `id` | string | UUID v4 único gerado no servidor com `crypto.randomUUID()`. Imutável. |
| `originalName` | string | Nome base do arquivo informado no upload, normalizado para apresentação e download, sem segmentos de diretório ou caracteres de controle. |
| `size` | number | Inteiro positivo com o tamanho efetivamente gravado em bytes, não superior ao limite configurado. |
| `uploadedAt` | string | Data/hora gerada no servidor após a gravação, em ISO 8601 UTC, por exemplo `2026-10-28T12:00:00.000Z`. |
| `owner` | string | Identificador obtido de `X-User-Id` após remoção de espaços nas extremidades, com 1 a 128 caracteres e padrão `^[A-Za-z0-9_-]+$`. A comparação diferencia maiúsculas de minúsculas. |

Todos os campos são obrigatórios. Não há entidade persistida de usuário nem relacionamentos adicionais nesta fase.

### Registro interno

O repositório mantém um `Map` indexado por `id`, contendo os campos públicos e `storedName`, uma string de nome local único gerado pelo servidor, sem caminhos ou nome original. O caminho absoluto é resolvido internamente sob `backend/storage` e não integra o contrato público.

O nome interno pode ser o próprio UUID do documento, sem extensão. Nomes originais iguais e conteúdos iguais são permitidos, sem deduplicação. O nome original deve ter separadores de diretório de ambos os sistemas tratados e caracteres de controle removidos; se não restar nome utilizável, o upload é rejeitado.

Invariantes:

- `owner`, `id`, `size` e `uploadedAt` não são escolhidos pelo formulário enviado pelo cliente.
- O cliente recebe somente os cinco campos públicos, nunca `storedName` ou caminho local.
- Registro em memória e arquivo físico são necessários para um download válido.
- Um documento de outro dono não é distinguível de um documento inexistente na resposta de download.

Exemplo público:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-28T12:00:00.000Z",
  "owner": "usuario-1"
}
```

## 6. Contratos de API

### Convenções gerais

- Os caminhos abaixo são os endpoints reais do backend. O frontend usa `/api/upload`, `/api/documents` e `/api/documents/:id/download`; o proxy Vite remove `/api` antes de encaminhar ao backend.
- `X-User-Id` é obrigatório nos três endpoints documentais. Headers duplicados ou valores que não atendam à validação do modelo são rejeitados com `400`.
- O usuário é validado antes do middleware de upload para evitar gravação de uma requisição sem identificação válida.
- Respostas de metadados e erros usam `Content-Type: application/json`. Downloads bem-sucedidos são binários, não JSON.
- Não há parâmetros de busca, ordenação ou paginação. Campos textuais adicionais no formulário de upload são ignorados e não alteram metadados; arquivos adicionais são rejeitados.

### POST /upload

**Entrada:** `Content-Type: multipart/form-data; boundary=...`, header `X-User-Id` e exatamente um arquivo no campo `file`.

O conteúdo deve possuir de 1 até `MAX_FILE_SIZE_BYTES` bytes, inclusive. Não há lista de extensões permitidas. O nome normalizado deve ser válido conforme a seção 5.

Exemplo de requisição HTTP, com conteúdo binário representado descritivamente:

```http
POST /upload HTTP/1.1
X-User-Id: usuario-1
Content-Type: multipart/form-data; boundary=dms-boundary

--dms-boundary
Content-Disposition: form-data; name="file"; filename="relatorio.pdf"
Content-Type: application/pdf

<bytes do arquivo>
--dms-boundary--
```

**Sucesso:** `201 Created`, corpo contendo o objeto `Document` público exemplificado na seção 5. Só responder após concluir a gravação e o registro em memória.

**Falhas:** `400` para entrada inválida, `413` para excesso de tamanho, `415` se o tipo da requisição não for multipart e `500` para falha interna. Em caso de rejeição, nenhum metadado é publicado e eventuais arquivos criados são removidos conforme RF-14.

No frontend, usar `FormData` e deixar o navegador definir `Content-Type` e boundary; não definir esse header manualmente.

### GET /documents

**Entrada:** header `X-User-Id`, sem corpo.

```http
GET /documents HTTP/1.1
X-User-Id: usuario-1
```

**Sucesso:** `200 OK`, array de objetos `Document` públicos do dono informado, ordenado conforme RF-09.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-28T12:00:00.000Z",
    "owner": "usuario-1"
  }
]
```

Sem documentos, retornar `200` e `[]`. A listagem consulta metadados, não verifica cada arquivo no disco. Um arquivo removido externamente pode aparecer na lista e falhar no download.

**Falhas:** `400` para usuário inválido e `500` para erro interno.

### GET /documents/:id/download

**Entrada:** header `X-User-Id` e `id` em formato UUID v4. Não aceitar segmentos de caminho como identificador.

```http
GET /documents/550e8400-e29b-41d4-a716-446655440000/download HTTP/1.1
X-User-Id: usuario-1
```

**Sucesso:** `200 OK`, corpo com os bytes do arquivo e headers:

```http
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="relatorio.pdf"
X-Content-Type-Options: nosniff
```

Para nomes com caracteres não ASCII, utilizar codificação apropriada em `filename*`, com fallback seguro em `filename`, por meio das APIs de resposta do Express. Nunca interpolar headers com texto não validado.

**Falhas:** `400` para usuário ou identificador inválido; `404` com o mesmo código e mensagem para documento inexistente, de outro dono ou arquivo físico ausente; `500` para outras falhas de leitura.

Não excluir metadados automaticamente em caso de arquivo ausente. Se uma falha ocorrer depois do início da resposta binária, encerrar a transferência e registrar a falha, sem tentar enviar JSON adicional.

O frontend deve baixar usando `fetch` com `X-User-Id`, verificar o status antes de ler o `Blob`, iniciar o download com o nome conhecido na listagem e revogar a URL temporária após o uso. Um link direto não envia o header exigido. Falha de rede ou transferência incompleta deve produzir feedback de erro.

### GET /health

Endpoint existente, sem `X-User-Id` e sem corpo de entrada. Retorna `200 OK`:

```json
{ "status": "ok" }
```

É uma verificação de disponibilidade HTTP, não uma garantia de durabilidade dos documentos ou de espaço livre em disco.

### Erros padronizados

Formato único para falhas ocorridas antes do envio dos headers:

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o limite permitido."
  }
}
```

| HTTP | `error.code` | Condição | `error.message` |
| --- | --- | --- | --- |
| 400 | `INVALID_USER` | Header ausente, duplicado, vazio ou inválido. | Informe um usuário válido. |
| 400 | `INVALID_MULTIPART` | Formulário multipart malformado ou boundary ausente. | O formulário de envio é inválido. |
| 400 | `FILE_REQUIRED` | Nenhum arquivo no campo `file`. | Selecione um arquivo para enviar. |
| 400 | `EMPTY_FILE` | Arquivo com zero bytes. | O arquivo não pode estar vazio. |
| 400 | `UNEXPECTED_FILE` | Múltiplos arquivos ou campo de arquivo inesperado. | Envie apenas um arquivo no campo file. |
| 400 | `INVALID_FILE_NAME` | Nome normalizado vazio ou inutilizável. | O nome do arquivo é inválido. |
| 400 | `INVALID_DOCUMENT_ID` | Identificador sem formato UUID v4. | O identificador do documento é inválido. |
| 413 | `FILE_TOO_LARGE` | Arquivo maior que o limite configurado. | O arquivo excede o limite permitido. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Upload sem tipo multipart/form-data. | Envie o arquivo como multipart/form-data. |
| 404 | `DOCUMENT_NOT_FOUND` | Documento inexistente, dono diferente ou arquivo ausente. | Documento não encontrado. |
| 500 | `INTERNAL_ERROR` | Falha inesperada de gravação, leitura ou registro. | Não foi possível concluir a operação. |

Para múltiplas violações, validar primeiro usuário, depois tipo da requisição e, em seguida, processar o multipart; retornar a primeira falha detectada pelo processamento. A ausência de autenticação real não gera `401`; documentos de outro dono não geram `403`, para não revelar sua existência.

## 7. Decisões arquiteturais

### Backend: Clean Architecture simples

Fluxo de dependência: `routes -> controllers -> services -> repositories`.

| Camada | Responsabilidade | Limite |
| --- | --- | --- |
| `routes/` | Registrar endpoints, ordenar validação HTTP e middleware de upload, delegar aos controllers. | Não implementar regras de negócio ou acesso direto ao catálogo. |
| `controllers/` | Validar formato da entrada HTTP, converter dados para chamadas de serviço e traduzir resultados/erros para respostas HTTP. | Não manter metadados ou decidir regras de propriedade. |
| `services/` | Registrar documentos, aplicar validações de negócio, filtrar por dono, ordenar listagem e autorizar funcionalmente downloads. | Não conhecer Express, multer, `req` ou `res`. |
| `repositories/` | Manter o catálogo em memória e realizar operações locais de localização, verificação e remoção de arquivos. | Não conhecer rotas, controllers ou mensagens HTTP. |

O `multer.diskStorage` é um adaptador de entrada HTTP, configurado junto ao middleware de upload, não no serviço. Ele grava na pasta local com nome interno seguro. O controller recebe o resultado da gravação e passa ao serviço apenas dados comuns necessários para registrar o documento.

Os serviços usam o repositório para operações sobre metadados e arquivos. O controller entrega o arquivo autorizado por meio das APIs de download do Express; o serviço não envia respostas HTTP. A configuração mínima de pasta e limite pode ser compartilhada pelos adaptadores sem criar novas camadas ou hierarquias de classes.

Tratar falhas do multer e dos handlers em um limite HTTP centralizado. A compensação de upload deve abranger também falhas de validação ocorridas após a gravação. Se houver erro ao registrar metadados, remover qualquer registro parcial e tentar excluir o arquivo; falhas de limpeza são registradas sem mascarar a falha original.

### Frontend: componentes React

- `pages/`: composição da tela de documentos.
- `components/`: identificação do usuário, formulário de upload, listagem e ação de download, reutilizados quando apropriado.
- `services/`: comunicação HTTP via `fetch`, headers, tratamento do contrato de erro e obtenção do arquivo binário.
- O estado da interface acompanha o usuário atual; respostas assíncronas antigas não podem misturar listas de donos diferentes.
- Inputs e ações devem possuir rótulos acessíveis, navegação por teclado e indicação de processamento ou falha. A lista mostra nome, tamanho, data e ação de download.

O proxy Vite existente encaminha `/api` para `http://localhost:3000`, removendo esse prefixo. Não é necessário adicionar CORS para esse fluxo de desenvolvimento de mesma origem.

### Armazenamento e simplicidade

O catálogo em memória e o filesystem local atendem à fase inicial sem banco, provedores externos, contêiner de injeção de dependência ou abstrações genéricas de armazenamento. Nome interno gerado pelo servidor evita colisão e uso do nome original como caminho. Testes podem fornecer uma pasta temporária ao adaptador local sem mudar o destino de armazenamento do produto.

## 8. Plano de execução

### Entrega atual: somente documentação

1. Preencher este documento a partir das oito seções do modelo, incorporando as decisões de usuário demonstrativo e limite de upload.
2. Revisar a coerência entre requisitos, modelo de dados, contratos HTTP, responsabilidades e critérios de aceite.
3. Confirmar que o único artefato criado nesta entrega é `docs/specs/dms-spec.md`, mantendo o modelo, código, testes e configurações inalterados.

O aceite desta entrega é documental. Nenhum servidor, teste de aplicação ou arquivo de backend/frontend deve ser executado para concluí-la.

### Roteiro futuro de implementação, não executado nesta entrega

As etapas abaixo descrevem dependências e entregáveis para trabalho posterior, condicionado a uma nova solicitação.

| Etapa | Atividade futura | Dependência | Critério de conclusão |
| --- | --- | --- | --- |
| 1 | Validar contratos e configuração, preparar armazenamento local e repositório de metadados em memória. | Aprovação da especificação. | Configuração inválida falha claramente; diretório é preparado; nomes internos são únicos e catálogo começa vazio. |
| 2 | Desenvolver serviços de registro, listagem, ordenação, consulta por dono e compensação de falhas. | Etapa 1. | Regras funcionam sem dependência de Express ou multer e não publicam uploads malsucedidos. |
| 3 | Integrar multer.diskStorage, validação HTTP, controllers, rotas e tratamento centralizado de erros, preservando `/health`. | Etapas 1 e 2. | Os contratos da seção 6 são atendidos, incluindo status, erros e download seguro como anexo. |
| 4 | Especificar e automatizar testes backend com node:test e diretório temporário. Os testes podem ser escritos junto às etapas 1 a 3. | Contratos definidos; validação completa após etapa 3. | Cenários da matriz abaixo passam sem escrever no armazenamento real. |
| 5 | Desenvolver serviço fetch e tela React com identificação do usuário, upload, listagem e download. | Contratos aprovados; pode ocorrer em paralelo ao backend. | Estados de interface e headers são tratados; troca de usuário não mistura dados; arquivos podem ser baixados com o nome correto. |
| 6 | Integrar frontend e backend via proxy e verificar o fluxo completo. | Etapas 3, 4 e 5. | Upload, atualização da lista e download preservam bytes e nome; falhas são exibidas em português. |

### Matriz de aceite para a implementação futura

| Cenário | Resultado esperado | Referências |
| --- | --- | --- |
| Upload válido e download subsequente. | `201` com cinco campos públicos, arquivo local e download `200` com os mesmos bytes. | RF-01, RF-03, RF-08, RF-10; RNF-01. |
| Arquivo exatamente no limite e acima dele. | Limite inclusivo aceito; excesso retorna `413 FILE_TOO_LARGE`, sem registro ou arquivo residual quando a limpeza for possível. | RF-05, RF-14; RNF-09. |
| Arquivo ausente ou vazio. | `400 FILE_REQUIRED` ou `400 EMPTY_FILE`, sem documento publicado. | RF-06, RF-08. |
| Arquivo extra, campo incorreto ou nome inutilizável. | `400` com código correspondente; remover arquivos já criados quando possível. | RF-06, RF-07, RF-14. |
| Tipo de requisição incorreto ou multipart inválido. | `415 UNSUPPORTED_MEDIA_TYPE` ou `400 INVALID_MULTIPART`. | RF-06, RF-13. |
| Header ausente, inválido ou duplicado. | `400 INVALID_USER` antes da gravação; `/health` não exige header. | RF-04, RF-15. |
| Usuários A e B enviam arquivos com o mesmo nome. | IDs e nomes internos distintos; cada lista contém apenas seus registros. Informar deliberadamente o header de outro usuário continua possível nesta demonstração. | RF-02, RF-07; RNF-02. |
| Lista vazia, datas diferentes e datas empatadas. | `[]` quando vazia; ordem decrescente de data e desempate crescente por ID. | RF-02, RF-09. |
| ID inválido, inexistente ou documento de outro dono. | `400` para formato inválido; demais retornam o mesmo `404 DOCUMENT_NOT_FOUND`. | RF-03, RF-13. |
| Arquivo removido externamente após upload. | Lista conserva metadados; download retorna `404 DOCUMENT_NOT_FOUND`. | RF-02, RF-03. |
| Disco cheio, erro de leitura ou falha no registro. | `500 INTERNAL_ERROR` antes dos headers, sem expor caminhos; falha de registro não publica documento e aciona limpeza. | RF-08, RF-13, RF-14; RNF-13. |
| Falha no meio de transferência já iniciada. | Transferência encerrada, falha registrada e nenhum JSON anexado ao binário. | RF-10, RF-13; RNF-10. |
| Reinício do processo. | Catálogo vazio; arquivos antigos permanecem no disco, sem recuperação ou download automático pela API. | RNF-02. |
| Nome com acentos ou aparência de caminho. | Nome de apresentação normalizado; caminho interno permanece seguro; anexo tem nome corretamente codificado. | RF-07, RF-10; RNF-08. |
| Interface durante envio, erro e troca de usuário. | Sem envio duplicado, feedback em português e descarte de respostas antigas, mantendo apenas os documentos do usuário atual. | RF-11, RF-12. |
| Endpoint de saúde existente. | `GET /health` retorna `200` e `{"status":"ok"}` sem identificação. | RF-15. |
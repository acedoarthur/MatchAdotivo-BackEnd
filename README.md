# MatchAdotivo

Sistema único de adoção que evolui cumulativamente com os laboratórios solicitados. O projeto reúne as rotas Express, o processamento de adoções com Promises, a persistência com TypeScript, Prisma ORM 8 e PostgreSQL a validação de entrada com Zod e a documentação OpenAPI/Swagger gerada dos mesmos schemas. As seis entidades são Instituição, Animal, Vacina, Animal_Vacina, Adotante e Match.

A orientação permanente está em [AGENTS.md](AGENTS.md). Novos laboratórios devem ser integrados a esta aplicação somente quando solicitados.

## Instalação e execução

Requisitos: Node.js 22.18+ na linha 22, 24.11+ na linha 24, ou 26+; npm; PostgreSQL 16+ ou Docker com Compose.

Todos os comandos são executados **na raiz do repositório**:

```bash
npm ci
# Em uma nova cópia do projeto, crie o ambiente local:
cp .env.example .env
npm run docker-up
npm run contract:emit
npm run db:migrate
npm start
```

Se o `.env` já existe, mantenha sua configuração. Na integração das pastas antigas, o ambiente existente foi transferido para a raiz sem alterar as credenciais ou portas. O exemplo usa API em <http://localhost:3001>, PostgreSQL na porta `5433` e banco `match_adotivo`.

`npm run dev` inicia com reinicialização automática. `PORT` altera a porta da API; `POSTGRES_PORT` altera a porta publicada pelo Compose, e `DATABASE_URL` deve acompanhar essa alteração. Uma instalação de PostgreSQL existente também pode ser usada por meio de `DATABASE_URL`, sem Docker.

O identificador histórico do Compose foi mantido para reutilizar os containers e o volume de dados existentes. `npm run docker-down` para os containers sem remover o volume. Mover a configuração para a raiz não recria nem apaga o banco.

Os dados são persistentes. Um banco novo começa vazio; use [requisicoes.http](requisicoes.http) para cadastrar os registros. O arquivo contém requisições nomeadas que reutilizam os IDs retornados na extensão REST Client do VS Code.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm start` | Iniciar a API |
| `npm run dev` | Iniciar a API com watch |
| `npm run adocao -- --adotante 1 --animal 1` | Processar uma adoção no mesmo banco da API |
| `npm run adocao:erro -- --adotante 1 --animal 1` | Demonstrar uma falha na análise da solicitação |
| `npm run typecheck` | Verificar os tipos TypeScript |
| `npm test` | Executar todos os testes unitários e de integração |
| `npm run test:unit` | Verificar o encadeamento das Promises e os schemas de validação, sem banco |
| `npm run test:integration` | Verificar a API e o fluxo de adoção com PostgreSQL |
| `npm run contract:emit` | Gerar contrato JSON e tipos |
| `npm run db:init` | Inicializar um banco diretamente no contrato atual |
| `npm run db:migrate` | Aplicar as migrações versionadas |
| `npm run db:verify` | Conferir o banco em relação ao contrato |
| `npm run migration:status` | Consultar a situação das migrações |
| `npm run docker-up` | Iniciar o banco de desenvolvimento |
| `npm run docker:test:up` | Iniciar um banco separado para testes |
| `npm run docker-down` | Parar os containers preservando o volume |

## Rotas da API

| Método | Caminho | Finalidade |
| --- | --- | --- |
| GET | `/` | Boas-vindas |
| GET | `/docs` | Interface do Swagger para consultar e testar as rotas |
| GET | `/docs.json` | Documento OpenAPI 3.0 em JSON (importável no Postman/Insomnia) |
| GET | `/sobre` | Descrição do sistema e das entidades |
| GET | `/saudacao/:nome` | Saudação personalizada |
| GET | `/calculo/soma/:num1/:num2` | Somar dois números válidos |
| GET | `/animais/tipo/:tipo` | Filtrar animais por tipo, sem diferenciar maiúsculas e minúsculas |
| GET | `/animais/:id/vacinas` | Consultar aplicações e detalhes das vacinas |
| PATCH | `/matches/:id/status` | Alterar o status de uma solicitação |

As seis entidades possuem CRUD completo:

| Entidade | Prefixo | Identificador |
| --- | --- | --- |
| Instituição | `/instituicoes` | `id_instituicao` |
| Animal | `/animais` | `id_animal` |
| Vacina | `/vacinas` | `id_vacina` |
| Animal_Vacina | `/animais-vacinas` | `id_animal_vacina` |
| Adotante | `/adotantes` | `id_adotante` |
| Match | `/matches` | `id_match` |

Em cada prefixo, `GET /` lista, `GET /:id` consulta, `POST /` cadastra, `PUT /:id` atualiza os campos enviados e `DELETE /:id` exclui. No match, a atualização altera apenas o status; os vínculos e a data identificam o pedido original.

Listagens retornam arrays, seguindo a API persistente já implementada. Consultas, cadastros e atualizações retornam o registro. Envie `Content-Type: application/json` nos cadastros e alterações. IDs são gerados pelo banco; campos opcionais omitidos ou `null` ficam como `null`.

| Código | Situação |
| --- | --- |
| 200 | Consulta ou atualização bem-sucedida |
| 201 | Cadastro; `Location` aponta para o registro |
| 204 | Exclusão, sem corpo |
| 400 | Entrada, JSON, parâmetro, data ou atualização inválida (ver formato abaixo) |
| 404 | Rota ou registro inexistente |
| 409 | Duplicidade, adoção indisponível ou exclusão impedida por vínculos |
| 413 | Corpo maior que 100 KB |
| 500 | Erro inesperado |

## Validação e tratamento de erros

Cada módulo tem um schema Zod em `<modulo>.schema.ts` (`createXSchema` e `updateXSchema`) e os DTOs em `<modulo>.types.ts`, inferidos do schema com `z.infer`. O middleware `src/shared/validate.ts` valida o corpo (`POST`, `PUT` e `PATCH /matches/:id/status`) e o parâmetro `:id` da URL (`validate(idParamsSchema, 'params')`, em todas as rotas com `:id`) e os substitui pelos dados já convertidos, com `Object.defineProperty` por causa do `req.query` somente leitura do Express 5; um `:id` inválido (`abc`, `0`, `1.5`, acima de 2147483647...) responde 400 com `campo: "id"`; os controllers recebem o DTO pronto e não repetem validações. Os blocos de construção compartilhados (texto com limite `VarChar`, CPF/CNPJ, listas fixas, datas, ids) ficam em `src/shared/schemas.ts`, com as mensagens do Zod em português.

- **Cadastro** (`POST`): campos desconhecidos, como ids gerados pelo banco, são descartados.
- **Atualização** (`PUT`): todos os campos são opcionais, mas ao menos um deve ser enviado e campos fora da lista do módulo são rejeitados. No adotante, a coerência entre `possui_animais` e `quantidade_animais` é revalidada combinando o que foi enviado com o que já está gravado.
- **Erro de validação** (400), com o campo e a mensagem de cada problema:

```json
{
  "error": "Dados inválidos",
  "details": [
    { "campo": "nome", "mensagem": "nome deve ter no mínimo 3 caracteres." },
    { "campo": "data_nascimento", "mensagem": "O adotante deve ter pelo menos 18 anos" }
  ]
}
```

- **Demais erros** usam `{ "error": "Descrição" }`: id inválido, JSON malformado, registro inexistente (404), duplicidade e vínculos (409). Todos passam pelo tratador central de `src/shared/erros.ts`.

O campo `message` dos antigos arrays em memória foi substituído pelo formato de listagem em arrays adotado na API com Prisma; não existe uma segunda API em memória.

## Documentação com Swagger (OpenAPI)

Com a API em execução, abra <http://localhost:3001/docs> (ou a porta definida em `PORT`). A interface lista todas as rotas por tag, com o corpo de exemplo preenchido em *Try it out* e as respostas possíveis (200, 201, 204, 400, 404, 409, 500) no formato real devolvido pela API. O mesmo documento está em `/docs.json`.

A documentação é gerada com `@asteasolutions/zod-to-openapi` a partir dos schemas Zod que validam as requisições, então regras e exemplos vêm da mesma fonte:

- `*.schema.ts` de cada módulo: `.openapi()` com exemplos e descrições, `Create…Input`/`Update…Input` e o schema de resposta (`Instituicao`, `Animal`, `Vacina`, `AnimalVacina`, `Adotante`, `Match`), que só documenta o que a API devolve (por exemplo, `data_nascimento` do adotante sai como `1990-10-10T00:00:00Z` e pode ser `null`).
- `*.openapi.ts` de cada módulo: `registerXPaths()` descreve as rotas do módulo. O CRUD usa `registrarCrud` (`src/shared/openapi.helpers.ts`); rotas extras (`/animais/tipo/{tipo}`, `/animais/{id}/vacinas`, `PATCH /matches/{id}/status`) são registradas no próprio módulo.
- `src/shared/openapi.ts` reúne os módulos e gera o documento; `src/shared/error.schema.ts` descreve os dois formatos de erro (`ErrorResponse` e `ValidationErrorResponse`).
- O endereço em `servers` usa a `PORT` em uso, para o *Try it out* chamar a URL correta.

**Ao criar ou alterar uma rota, atualize também o `*.openapi.ts` do módulo.** Os testes de integração conferem que as rotas esperadas estão no documento e que as respostas reais da API passam pelos schemas de resposta documentados.

## Processamento de adoção com Promises

O comando de adoção usa adotante e animal **já cadastrados** e os mesmos serviços transacionais da API. Um match criado pelo console fica disponível em `GET /matches`; uma aprovação pela API também impede novos pedidos pelo console.

O fluxo mantém as três etapas e as esperas do exercício solicitado:

1. Após 2 segundos, recebe a solicitação e cria o match `PENDENTE`.
2. Após mais 3 segundos, analisa os dados do adotante, consulta a instituição e o histórico de vacinação e altera o status para `EM ANDAMENTO`.
3. Após mais 4 segundos, conclui a adoção e altera o status para `APROVADO`.

As Promises são retornadas em cada `.then()`. O `.catch()` registra erros, interrompe as etapas seguintes e preserva o último status gravado. A opção `--erro` demonstra uma falha na análise, deixando o pedido pendente e encerrando o comando com código 1. Uma execução bem-sucedida leva aproximadamente nove segundos e termina com código 0.

A análise é didática e não exige vacinas específicas, pois essa regra não consta no domínio. Cada aplicação registrada aparece separadamente no histórico, inclusive doses repetidas.

## Regras do domínio e dados

- Animal exige instituição existente. As relações têm FKs obrigatórias.
- CPF e CNPJ são recebidos como strings, com ou sem pontuação, normalizados e únicos. O tamanho numérico é verificado sem cálculo dos dígitos verificadores; os exemplos são fictícios.
- Match exige exatamente um adotante e um animal existentes. O banco gera `data_pedido` e o status inicial `PENDENTE`.
- Somente um match pode estar `APROVADO` para cada animal. A API e o console compartilham transações com bloqueio da linha do animal; um índice único parcial também protege a aprovação no PostgreSQL.
- Enquanto houver aprovação, novas solicitações para o animal são bloqueadas. Ao retirar ou excluir a aprovação, ele volta a aceitar pedidos.
- Cada aplicação de vacina tem seu próprio ID e data; o par animal/vacina não é único.
- A quantidade de animais do adotante é inteira e não negativa: zero com `possui_animais=false`, positiva com `true`. A validação é compartilhada e o banco também possui `CHECK`.
- Adotante tem `data_nascimento` (`AAAA-MM-DD`) e deve ter ao menos 18 anos; a idade é calculada em UTC, pois a data é lida como meia-noite UTC. A coluna é opcional no banco, porque os adotantes cadastrados antes dela não possuem a data (`null`), mas é obrigatória em novos cadastros; esses registros podem recebê-la com `PUT`.
- Animal tem `apelido` opcional (até 100 caracteres), usado também para identificar animais cujo nome é conhecido.
- Residências: `CASA`, `APARTAMENTO`, `CHÁCARA`, `OUTRO`. Status: `PENDENTE`, `EM ANDAMENTO`, `APROVADO`, `CANCELADO`.
- As relações usam `onDelete: Restrict`. Exclua primeiro matches e aplicações para depois remover os registros referenciados.
- Datas de nascimento do animal e de aplicação são `DATE`, representadas como `AAAA-MM-DD`, sem conversão de fuso. `data_nascimento` do adotante e `data_pedido` são `DateTime`: no Prisma 8 são lidos e gravados como `Temporal.Instant` (por isso o polyfill em `src/prisma/db.ts`) e retornados em ISO UTC, por exemplo `1990-10-10T00:00:00Z`. Textos respeitam os limites do modelo; `foto` armazena somente URL ou caminho, sem upload.

## Prisma e migrações

Foram preservadas as versões solicitadas: `@prisma/orm-postgres@8.0.0-rc.13` e `prisma@8.0.0-rc.19`. O contrato usa `VarChar(n)`, `DateString` e expressões SQL em strings, conforme a sintaxe dessa RC. O polyfill Temporal fornece o suporte a `DateTime` no Node.js 22.

Altere `src/prisma/contract.prisma`, sem editar manualmente `contract.json` ou `contract.d.ts`:

```bash
npm run contract:emit
npm run migration:plan -- --name descricao_da_alteracao
# Revise o migration.ts gerado em migrations/app/.
npm run db:migrate
npm run migration:status
```

O histórico foi preservado integralmente: baseline das seis entidades, adição de `Instituicao.foto` e a migração `add_data_nascimento_adotante_e_apelido_animal` (colunas `adotantes.data_nascimento` e `animais.apelido`, ambas opcionais, portanto seguras para tabelas com dados). Depois de atualizar o código, aplique-a com `npm run db:migrate`. As importações relativas dos snapshots continuam válidas. `db:migrate` pode aplicar o histórico desde um banco vazio; `db:init` prepara um banco novo diretamente na versão atual.

## Testes

Os testes unitários verificam os tempos de 2, 3 e 4 segundos com timers simulados, a ordem e a interrupção das etapas, sem PostgreSQL. Os testes de validação (`test/validacao.test.ts`, sem banco) cobrem os schemas Zod: mensagens, conversões, idade mínima e atualização parcial. Os testes de integração também conferem `/docs` e `/docs.json` e a validação do `:id`. Eles exercitam CRUD, rotas básicas, persistência, validações, FKs, aprovação concorrente e o fluxo de Promises no banco real.

Para executar toda a suíte com o banco de testes do Compose:

```bash
npm run docker:test:up
DATABASE_URL=postgresql://postgres:match_local@localhost:5434/match_adotivo_test npm run db:migrate
npm test
```

`TEST_DATABASE_URL` deve apontar para esse banco. Os testes limpam as seis tabelas antes de cada cenário; a variável é obrigatória e o nome do banco precisa terminar em `_test`. Não use um banco com dados que deseja preservar.

## Organização

```text
MatchAdotivo/
  AGENTS.md
  package.json
  package-lock.json
  prisma.config.ts
  tsconfig.json
  docker-compose.yml
  .env.example
  requisicoes.http
  migrations/
  scripts/tsx.mjs
  src/
    server.ts
    app.ts
    cli/adocao.ts
    prisma/
    shared/            schemas Zod, validate, erros, CRUD genérico e geração do OpenAPI
    modules/
      instituicao/
      animal/
      vacina/
      animal-vacina/
      adotante/
      match/
  test/
    api.test.ts
    adocao.test.ts
    validacao.test.ts
```

As ferramentas são iniciadas por `node`. `.npmrc` desabilita links simbólicos e scripts de instalação para permitir a instalação em FAT32. O launcher prepara uma cópia temporária do esbuild quando o volume não permite executar o binário e a remove ao encerrar. Start e testes usam o loader do tsx; somente o modo watch usa seu CLI.

## Evolução já solicitada

| Conteúdo | Local no sistema |
| --- | --- |
| Laboratório I: rotas, parâmetros, JSON e Router | `src/app.ts`, `src/shared/basicas.routes.ts` e módulos de entidades |
| Laboratório II: Promises sequenciais e erros | `src/modules/match/adocao.fluxo.ts`, `adocao.service.ts` e `src/cli/adocao.ts` |
| Laboratório III: TypeScript, Prisma, PostgreSQL e CRUD | Configuração na raiz, `src/prisma/`, módulos e `migrations/` |
| Laboratório IV: Zod, DTOs, erros padronizados e migração | `src/shared/schemas.ts`, `validate.ts`, `erros.ts`, `*.schema.ts` e `*.types.ts` dos módulos, `migrations/` |
| Laboratório V: Swagger/OpenAPI, validação do `:id` e erros globais | `src/shared/openapi*.ts`, `error.schema.ts`, `*.openapi.ts` dos módulos, `/docs` em `src/app.ts` |

Não há aplicações ou pacotes por laboratório. Somente os laboratórios explicitamente solicitados são implementados.

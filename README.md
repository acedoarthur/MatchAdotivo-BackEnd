# MatchAdotivo

Sistema único de adoção que evolui cumulativamente com os laboratórios solicitados. O projeto reúne as rotas Express, o processamento de adoções com Promises, a persistência com TypeScript, Prisma ORM 8 e PostgreSQL, a validação de entrada com Zod, a documentação OpenAPI/Swagger gerada dos mesmos schemas e a autenticação com JWT. As seis entidades do domínio são Instituição, Animal, Vacina, Animal_Vacina, Adotante e Match; o Usuário existe apenas para autenticar quem acessa a API.

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
| POST | `/usuarios` | Cadastrar usuário (pública) |
| POST | `/usuarios/login` | Login: devolve o token JWT (pública) |
| POST | `/usuarios/logout` | Invalidar o token (protegida) |
| GET | `/usuarios` | Listar usuários (protegida) |
| GET | `/docs` | Interface do Swagger para consultar e testar as rotas |
| GET | `/docs.json` | Documento OpenAPI 3.0 em JSON (importável no Postman/Insomnia) |
| GET | `/sobre` | Descrição do sistema e das entidades |
| GET | `/saudacao/:nome` | Saudação personalizada |
| GET | `/calculo/soma/:num1/:num2` | Somar dois números válidos |
| GET | `/matches/hoje` | Pedidos feitos hoje (horário de Brasília) |
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
| 401 | Token ausente, inválido, expirado ou invalidado pelo logout; credenciais inválidas no login |
| 404 | Rota ou registro inexistente |
| 409 | Duplicidade, adoção indisponível ou exclusão impedida por vínculos |
| 413 | Corpo maior que 100 KB |
| 500 | Erro inesperado |

## Validação e tratamento de erros

Cada módulo tem um schema Zod em `<modulo>.schema.ts` (`createXSchema` e `updateXSchema`) e os DTOs em `<modulo>.types.ts`, inferidos do schema com `z.infer`. O middleware `src/middlewares/validate.ts` valida o corpo (`POST`, `PUT` e `PATCH /matches/:id/status`) e o parâmetro `:id` da URL (`validate(idParamsSchema, 'params')`, em todas as rotas com `:id`) e os substitui pelos dados já convertidos, com `Object.defineProperty` por causa do `req.query` somente leitura do Express 5; um `:id` inválido (`abc`, `0`, `1.5`, acima de 2147483647...) responde 400 com `campo: "id"`; os controllers recebem o DTO pronto e não repetem validações. Os blocos de construção compartilhados (texto com limite `VarChar`, CPF/CNPJ, listas fixas, datas, ids) ficam em `src/shared/schemas.ts`, com as mensagens do Zod em português.

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

- **Demais erros** usam `{ "error": "Descrição" }`: id inválido, JSON malformado, registro inexistente (404), duplicidade e vínculos (409). Todos passam pelo tratador central de `src/middlewares/errorHandler.ts`.

O campo `message` dos antigos arrays em memória foi substituído pelo formato de listagem em arrays adotado na API com Prisma; não existe uma segunda API em memória.

## Camada de repositories

O acesso ao banco fica isolado em um `<modulo>.repo.ts` por entidade (`instituicaoRepository`, `animalRepository`, `vacinaRepository`, `animalVacinaRepository`, `adotanteRepository`, `matchRepository`). O acesso ao banco só acontece nos repositories: nenhum outro arquivo usa `db.orm` nem conhece códigos SQL.

- Cada repository é uma função que recebe o `db` (injetado, como no restante da API, para que os testes usem o banco `_test`) e, opcionalmente, uma transação: `matchRepository(db, tx)`. Assim os mesmos métodos servem às rotas e aos fluxos transacionais de match e adoção (`emTransacao` em `src/shared/repository.ts`).
- Métodos padrão: `findAll`, `findById` (retorna `null` se não existir), `create`, `update` e `delete` (retornam `null` se o registro não existe). Buscas de regra de negócio têm nome próprio: `animalRepository.findByTipo`, `animalVacinaRepository.findByAnimalComVacina`, `matchRepository.findAprovadoByAnimal`, `animalRepository.bloquear` (linha do animal bloqueada na transação), `adotanteRepository.findByCpf` e `matchRepository.findPedidosHoje`.
- As violações de restrição do PostgreSQL são traduzidas nos repositories para erros da aplicação (`RegistroDuplicadoError`, `ReferenciaInvalidaError`, `DadosInvalidosError`), que o tratador de erros converte nas mesmas respostas 409 e 400 de antes. As regras de negócio (RN03/RN04) permanecem em `match.service.ts`.
- `findPedidosHoje` calcula "hoje" no fuso `America/Sao_Paulo` e converte para `Temporal.Instant`, porque o banco guarda `data_pedido` em UTC.
- `test/arquitetura.test.ts` impede que código fora dos repositories acesse o Prisma.

A API continua com as mesmas rotas, validações, respostas HTTP e documentação; a refatoração muda a organização, não o comportamento.

## Camada de services

O fluxo completo é `rota → validate → controller → service → repository → Prisma → banco`.

- **Controller** (`<modulo>.controller.ts`): lê `req` (já validado), chama o service e monta a resposta HTTP. Não importa repositories nem aplica regras e não tem `try/catch`: os erros seguem para o tratador de erros (Express 5).
- **Service** (`<modulo>.service.ts`, uma função `xService(db)` por entidade): concentra as regras de negócio, não conhece o HTTP e lança erros da aplicação. `adocao.service.ts` (fluxo com Promises) e o comando `adocao` reutilizam os mesmos services.
- **Repository**: só acesso ao banco, como descrito acima.
- **Erros da aplicação** (`src/shared/errors.ts`): `AppError` (carrega o `statusCode`), `NotFoundError` (404), `ConflictError` (409) e `BadRequestError` (400). O tratador de erros transforma qualquer `AppError` em `{ "error": "..." }` com o status certo; os erros que os repositories traduzem do banco também são `AppError`.

Regras nos services:

| Service | Regras |
| --- | --- |
| Instituição | Precisa existir (404). CNPJ não pode se repetir: `CNPJ já cadastrado` no POST e `CNPJ já utilizado por outra instituição` no PUT; manter o próprio CNPJ é permitido (409). |
| Adotante | Precisa existir (404). CPF não pode se repetir (`CPF já cadastrado` / `CPF já utilizado por outro adotante`; manter o próprio é permitido). A coerência entre `possui_animais` e `quantidade_animais` (RN06) vale para os dados combinados na atualização parcial. |
| Animal | RN01: a instituição informada precisa existir (404). Histórico de vacinação (RN05) só de animal existente. |
| Animal_Vacina | O animal e a vacina informados precisam existir (404); doses repetidas são permitidas. |
| Vacina | Precisa existir (404). |
| Match | RN03/RN04 em transação com o animal bloqueado: adotante e animal existentes, um único `APROVADO` por animal (409). |

Exclusões de registros com vínculos continuam sendo barradas pelo banco (`onDelete: Restrict`, 409). Cadastros simultâneos com o mesmo CNPJ/CPF passam pela verificação do service ao mesmo tempo; o índice único do banco barra os demais e o repository traduz o erro em 409, então o resultado é um 201 e os outros 409, nunca 500.

Rota nova, que usa a busca de pedidos de hoje (horário de Brasília) do repository: `GET /matches/hoje`, registrada antes de `/:id` para não ser lida como id.

Respostas e códigos HTTP não mudaram, com uma exceção deliberada de texto: as mensagens de CNPJ/CPF duplicado ficaram específicas (antes: `CPF/CNPJ já cadastrado ou animal com outra adoção aprovada.`); a mensagem genérica continua apenas como rede de segurança do banco em corridas.

## Autenticação com JWT

As rotas do sistema (`/instituicoes`, `/animais`, `/vacinas`, `/animais-vacinas`, `/adotantes`, `/matches` e suas subrotas) exigem login. Públicas: as rotas básicas (`/`, `/sobre`, saudação e soma), `/docs`, `POST /usuarios` e `POST /usuarios/login`.

1. `POST /usuarios` cadastra um usuário (`nome`, `email`, `senha`). A senha tem 8 a 72 bytes, é gravada com **bcrypt** (custo 10) e nunca é devolvida; o e-mail é guardado em minúsculas e é único (409).
2. `POST /usuarios/login` devolve `{ "token": "..." }`, um JWT (HS256) com o id do usuário, válido por **1 hora**. E-mail inexistente e senha errada respondem igualmente `401 Credenciais inválidas`.
3. Envie o token em toda requisição protegida: `Authorization: Bearer <token>`. No Swagger, use o botão **Authorize** e cole somente o token.
4. `POST /usuarios/logout` (protegida) invalida o token. `GET /usuarios` (protegida) lista os usuários, sem as senhas.

Sempre `401`, com `{ "error": "..." }`: `Token não informado` (cabeçalho ausente ou fora do formato `Bearer <token>`), `Token inválido ou expirado` (assinatura inválida, token alterado ou expirado) e `Token inválido` (token já invalidado pelo logout).

- **Segredo:** defina `JWT_SECRET` no `.env` (o servidor não inicia sem ele). O `.env.example` traz apenas um placeholder; gere um valor para cada ambiente com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. O `.env` não é versionado.
- **Blacklist em memória:** os tokens invalidados pelo logout ficam na memória do servidor e são perdidos a cada reinício (inclusive com `npm run dev`): um token que fez logout volta a valer até expirar. Persistir a lista (tabela ou Redis) e papéis `user`/`admin` com 403 são os desafios opcionais do laboratório e **não** foram implementados.
- Cada token recebe um `jti` único, para que um novo login logo após o logout não gere um token idêntico ao invalidado.
- **Migração `add_usuario`:** cria apenas a tabela `usuarios` (`id_usuario`, `nome`, `email` único, `senha`, `created_at`), sem alterar dados existentes. Aplique com `npm run db:migrate` (e, para o banco de testes, com `DATABASE_URL` apontando para ele, como na seção de testes).
- Arquivos: `src/config/jwt.ts` (assinatura, verificação e blacklist), `src/middlewares/autenticar.ts` (middleware), `src/modules/usuario/` (schema, repository, service, controller, rotas e OpenAPI). O `401` vem de `UnauthorizedError` em `src/shared/errors.ts`.

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

Os testes unitários verificam os tempos de 2, 3 e 4 segundos com timers simulados, a ordem e a interrupção das etapas, sem PostgreSQL. Os testes de validação (`test/validacao.test.ts`, sem banco) cobrem os schemas Zod: mensagens, conversões, idade mínima e atualização parcial. Os testes de integração fazem login a cada cenário e também conferem a autenticação, `/docs` e `/docs.json` e a validação do `:id`. Eles exercitam CRUD, rotas básicas, persistência, validações, FKs, aprovação concorrente e o fluxo de Promises no banco real.

Para executar toda a suíte com o banco de testes do Compose:

```bash
npm run docker:test:up
DATABASE_URL=postgresql://postgres:match_local@localhost:5434/match_adotivo_test npm run db:migrate
npm test
```

`TEST_DATABASE_URL` deve apontar para esse banco, e `JWT_SECRET` precisa estar no `.env`. Os testes limpam as sete tabelas antes de cada cenário; a variável é obrigatória e o nome do banco precisa terminar em `_test`. Não use um banco com dados que deseja preservar.

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
    arquitetura.test.ts
```

As ferramentas são iniciadas por `node`. `.npmrc` desabilita links simbólicos e scripts de instalação para permitir a instalação em FAT32. O launcher prepara uma cópia temporária do esbuild quando o volume não permite executar o binário e a remove ao encerrar. Start e testes usam o loader do tsx; somente o modo watch usa seu CLI.

## Evolução já solicitada

| Conteúdo | Local no sistema |
| --- | --- |
| Laboratório I: rotas, parâmetros, JSON e Router | `src/app.ts`, `src/shared/basicas.routes.ts` e módulos de entidades |
| Laboratório II: Promises sequenciais e erros | `src/modules/match/adocao.fluxo.ts`, `adocao.service.ts` e `src/cli/adocao.ts` |
| Laboratório III: TypeScript, Prisma, PostgreSQL e CRUD | Configuração na raiz, `src/prisma/`, módulos e `migrations/` |
| Laboratório IV: Zod, DTOs, erros padronizados e migração | `src/shared/schemas.ts`, `validate.ts`, `erros.ts`, `*.schema.ts` e `*.types.ts` dos módulos, `migrations/` |
| Laboratório VIII: Autenticação com JWT e bcrypt | `src/config/jwt.ts`, `src/middlewares/autenticar.ts`, `src/modules/usuario/`, migração `add_usuario` |
| Laboratório VII: Services e erros da aplicação | `<modulo>.service.ts` em cada módulo, `src/shared/errors.ts` e `GET /matches/hoje` |
| Laboratório VI: Repository | `<modulo>.repo.ts` em cada módulo e `src/shared/repository.ts` |
| Laboratório V: Swagger/OpenAPI, validação do `:id` e erros globais | `src/shared/openapi*.ts`, `error.schema.ts`, `*.openapi.ts` dos módulos, `/docs` em `src/app.ts` |

Não há aplicações ou pacotes por laboratório. Somente os laboratórios explicitamente solicitados são implementados.

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import type { Database } from './prisma/db';
import instituicaoRoutes from './modules/instituicao/instituicao.routes';
import animalRoutes from './modules/animal/animal.routes';
import vacinaRoutes from './modules/vacina/vacina.routes';
import animalVacinaRoutes from './modules/animal-vacina/animal-vacina.routes';
import adotanteRoutes from './modules/adotante/adotante.routes';
import matchRoutes from './modules/match/match.routes';
import usuarioRoutes from './modules/usuario/usuario.routes';
import { autenticar } from './middlewares/autenticar';
import { tratarErros } from './middlewares/errorHandler';
import { rotasBasicas } from './shared/basicas.routes';
import { gerarDocumentoOpenApi } from './shared/openapi';

export function criarApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(rotasBasicas);
  // Documentação gerada dos schemas Zod: interface do Swagger e o documento OpenAPI em JSON.
  const documentacao = gerarDocumentoOpenApi(`http://localhost:${process.env.PORT ?? 3001}`);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(documentacao));
  app.get('/docs.json', (req, res) => { res.json(documentacao); });
  // Cadastro e login são públicos; listagem de usuários e logout exigem o token.
  app.use('/usuarios', usuarioRoutes(db));
  // Todas as rotas das entidades do sistema exigem login: o autenticar roda antes de cada router.
  app.use('/instituicoes', autenticar, instituicaoRoutes(db));
  app.use('/animais', autenticar, animalRoutes(db));
  app.use('/vacinas', autenticar, vacinaRoutes(db));
  app.use('/animais-vacinas', autenticar, animalVacinaRoutes(db));
  app.use('/adotantes', autenticar, adotanteRoutes(db));
  app.use('/matches', autenticar, matchRoutes(db));
  app.use((req, res) => { res.status(404).json({ error: 'Rota não encontrada.' }); });
  app.use(tratarErros);
  return app;
}

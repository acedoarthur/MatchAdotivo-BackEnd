import express from 'express';
import swaggerUi from 'swagger-ui-express';
import type { Database } from './prisma/db';
import instituicaoRoutes from './modules/instituicao/instituicao.routes';
import animalRoutes from './modules/animal/animal.routes';
import vacinaRoutes from './modules/vacina/vacina.routes';
import animalVacinaRoutes from './modules/animal-vacina/animal-vacina.routes';
import adotanteRoutes from './modules/adotante/adotante.routes';
import matchRoutes from './modules/match/match.routes';
import { tratarErros } from './shared/erros';
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
  app.use('/instituicoes', instituicaoRoutes(db));
  app.use('/animais', animalRoutes(db));
  app.use('/vacinas', vacinaRoutes(db));
  app.use('/animais-vacinas', animalVacinaRoutes(db));
  app.use('/adotantes', adotanteRoutes(db));
  app.use('/matches', matchRoutes(db));
  app.use((req, res) => { res.status(404).json({ error: 'Rota não encontrada.' }); });
  app.use(tratarErros);
  return app;
}

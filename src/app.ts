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
import { exigirPerfil, identificar } from './middlewares/autorizar';
import { PERFIS } from './modules/usuario/usuario.types';
import { tratarErros } from './middlewares/errorHandler';
import { rotasBasicas } from './shared/basicas.routes';
import { gerarDocumentoOpenApi } from './shared/openapi';
import { rotasUpload, servirUploads } from './shared/upload.routes';

export function criarApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(rotasBasicas);
  // Documentação gerada dos schemas Zod: interface do Swagger e o documento OpenAPI em JSON.
  const documentacao = gerarDocumentoOpenApi(`http://localhost:${process.env.PORT ?? 3001}`);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(documentacao));
  app.get('/docs.json', (req, res) => { res.json(documentacao); });
  // Fotos enviadas: arquivos públicos (o <img> não envia token); nomes são UUIDs aleatórios.
  app.use('/uploads', servirUploads());
  // Cadastro e login são públicos; as demais rotas de usuário exigem o token.
  app.use('/usuarios', usuarioRoutes(db));
  // Rotas do sistema: token válido (401), conta lida do banco e algum perfil (403 para contas sem perfil).
  // Cada router ainda restringe os perfis por rota, e os services conferem a propriedade dos registros.
  const sistema = [autenticar, identificar(db), exigirPerfil(...PERFIS)];
  app.use('/fotos', ...sistema, rotasUpload);
  app.use('/instituicoes', ...sistema, instituicaoRoutes(db));
  app.use('/animais', ...sistema, animalRoutes(db));
  app.use('/vacinas', ...sistema, vacinaRoutes(db));
  app.use('/animais-vacinas', ...sistema, animalVacinaRoutes(db));
  app.use('/adotantes', ...sistema, adotanteRoutes(db));
  app.use('/matches', ...sistema, matchRoutes(db));
  app.use((req, res) => { res.status(404).json({ error: 'Rota não encontrada.' }); });
  app.use(tratarErros);
  return app;
}

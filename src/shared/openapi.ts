import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registerBasicasPaths } from './basicas.openapi';
import { registerInstituicaoPaths } from '../modules/instituicao/instituicao.openapi';
import { registerAnimalPaths } from '../modules/animal/animal.openapi';
import { registerVacinaPaths } from '../modules/vacina/vacina.openapi';
import { registerAnimalVacinaPaths } from '../modules/animal-vacina/animal-vacina.openapi';
import { registerAdotantePaths } from '../modules/adotante/adotante.openapi';
import { registerMatchPaths } from '../modules/match/match.openapi';

/** Gera o documento OpenAPI; `servidor` deve ser o endereço em que as rotas respondem. */
export function gerarDocumentoOpenApi(servidor: string) {
  const registry = new OpenAPIRegistry();
  // Cada módulo registra as suas rotas.
  registerBasicasPaths(registry);
  registerInstituicaoPaths(registry);
  registerAnimalPaths(registry);
  registerVacinaPaths(registry);
  registerAnimalVacinaPaths(registry);
  registerAdotantePaths(registry);
  registerMatchPaths(registry);
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API Match de Adoção',
      version: '1.0.0',
      description: 'API para cadastrar instituições, animais, vacinas, adotantes e solicitações de adoção (matches).',
    },
    servers: [{ url: servidor, description: 'Servidor local de desenvolvimento' }],
  });
}

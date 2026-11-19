import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { permissoesAdotante } from './adotante.routes';
import { adotanteResponseSchema, createAdotanteSchema, updateAdotanteSchema } from './adotante.schema';

export function registerAdotantePaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Adotantes', caminho: '/adotantes', nome: 'adotante',
    createSchema: createAdotanteSchema, updateSchema: updateAdotanteSchema, responseSchema: adotanteResponseSchema,
    escrita: { 409: 'CPF já cadastrado ou utilizado por outro adotante' },
    conflitoExclusao: 'O adotante possui matches ou conta de usuário vinculados',
    perfis: permissoesAdotante,
    regras: {
      getAll: 'O adotante recebe somente o próprio cadastro; a instituição, os adotantes que pediram seus animais; o administrador, todos',
      getById: 'Mesma regra da listagem (403 fora dela)',
      create: 'Cadastro avulso, sem conta de acesso. Adotantes se cadastram em POST /usuarios',
      update: 'O adotante altera somente o próprio cadastro (403)',
    },
  });
}

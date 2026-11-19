import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { permissoesInstituicao } from './instituicao.routes';
import { createInstituicaoSchema, instituicaoResponseSchema, updateInstituicaoSchema } from './instituicao.schema';

export function registerInstituicaoPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Instituições', caminho: '/instituicoes', nome: 'instituição',
    createSchema: createInstituicaoSchema, updateSchema: updateInstituicaoSchema, responseSchema: instituicaoResponseSchema,
    escrita: { 409: 'CNPJ já cadastrado ou utilizado por outra instituição' },
    conflitoExclusao: 'A instituição possui animais ou conta de usuário vinculados',
    perfis: permissoesInstituicao,
    regras: {
      create: 'Cadastro avulso, sem conta de acesso. Instituições se cadastram em POST /usuarios',
      update: 'A instituição altera somente o próprio cadastro (403)',
    },
  });
}

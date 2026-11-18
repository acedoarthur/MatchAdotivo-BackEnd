import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { createInstituicaoSchema, instituicaoResponseSchema, updateInstituicaoSchema } from './instituicao.schema';

export function registerInstituicaoPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Instituições', caminho: '/instituicoes', nome: 'instituição',
    createSchema: createInstituicaoSchema, updateSchema: updateInstituicaoSchema, responseSchema: instituicaoResponseSchema,
    escrita: { 409: 'CNPJ já cadastrado ou utilizado por outra instituição' },
    conflitoExclusao: 'A instituição possui animais vinculados',
  });
}

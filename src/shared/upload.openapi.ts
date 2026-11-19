import { z } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { erro, erro500, json, protegida } from './openapi.helpers';

export function registerUploadPaths(registry: OpenAPIRegistry) {
  protegida(registry, {
    method: 'post', path: '/fotos', tags: ['Fotos'], summary: 'Enviar foto',
    description: 'O corpo é o arquivo da imagem (Content-Type image/jpeg, image/png, image/gif ou image/webp; até 5 MB). O tipo é conferido pelo conteúdo. Devolve o caminho público (GET /uploads/<arquivo>) para gravar no campo foto de um animal ou instituição.',
    request: { body: { required: true, content: { 'image/*': { schema: z.string().openapi({ format: 'binary' }) } } } },
    responses: {
      201: { description: 'Foto gravada', content: json(z.object({ foto: z.string().openapi({ example: '/uploads/3f2b1c9e-5a7d-4e1b-9c3a-0d8f6a1b2c4e.jpg' }) })) },
      400: erro('Corpo vazio ou ausente'),
      413: erro('Imagem maior que 5 MB'),
      415: erro('Formato não suportado'),
      500: erro500,
    },
  }, ['INSTITUICAO', 'ADMIN']);
}

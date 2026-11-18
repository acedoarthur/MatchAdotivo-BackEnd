import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { erro, erro400Corpo, erro413, erro500, json, protegida } from '../../shared/openapi.helpers';
import {
  createUsuarioSchema, loginSchema, logoutResponseSchema, tokenResponseSchema, usuarioResponseSchema,
} from './usuario.schema';

export function registerUsuarioPaths(registry: OpenAPIRegistry) {
  const tags = ['Usuários'];
  registry.registerPath({
    method: 'post', path: '/usuarios', tags, summary: 'Cadastrar um usuário',
    description: 'Rota pública. A senha é gravada criptografada com bcrypt e nunca é devolvida.',
    request: { body: { required: true, content: json(createUsuarioSchema) } },
    responses: {
      201: { description: 'Usuário cadastrado (sem a senha)', content: json(usuarioResponseSchema) },
      400: erro400Corpo,
      409: erro('E-mail já cadastrado'),
      413: erro413,
      500: erro500,
    },
  });
  registry.registerPath({
    method: 'post', path: '/usuarios/login', tags, summary: 'Fazer login',
    description: 'Rota pública. Devolve o token JWT, válido por 1 hora. Use-o no botão Authorize.',
    request: { body: { required: true, content: json(loginSchema) } },
    responses: {
      200: { description: 'Login realizado', content: json(tokenResponseSchema) },
      400: erro400Corpo,
      401: erro('Credenciais inválidas (e-mail inexistente ou senha errada)'),
      413: erro413,
      500: erro500,
    },
  });
  protegida(registry, {
    method: 'post', path: '/usuarios/logout', tags, summary: 'Fazer logout',
    description: 'Invalida o token enviado no cabeçalho Authorization.',
    responses: { 200: { description: 'Logout realizado', content: json(logoutResponseSchema) }, 500: erro500 },
  });
  protegida(registry, {
    method: 'get', path: '/usuarios', tags, summary: 'Listar usuários',
    responses: { 200: { description: 'Lista de usuários (sem as senhas)', content: json(z.array(usuarioResponseSchema)) }, 500: erro500 },
  });
}

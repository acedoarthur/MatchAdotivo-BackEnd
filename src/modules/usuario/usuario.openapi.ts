import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { erro, erro400Corpo, erro413, erro500, json, protegida } from '../../shared/openapi.helpers';
import {
  createUsuarioSchema, loginSchema, logoutResponseSchema, perfilSchema, tokenResponseSchema, usuarioResponseSchema,
} from './usuario.schema';

export function registerUsuarioPaths(registry: OpenAPIRegistry) {
  const tags = ['Usuários'];
  registry.registerPath({
    method: 'post', path: '/usuarios', tags, summary: 'Criar conta de adotante ou instituição',
    description: 'Rota pública. Cria a conta e o cadastro do perfil na mesma transação (os campos de adotante e instituição são os mesmos de /adotantes e /instituicoes). '
      + 'O perfil ADMIN não pode ser criado aqui. A senha é gravada com bcrypt e nunca é devolvida.',
    request: { body: { required: true, content: json(createUsuarioSchema) } },
    responses: {
      201: { description: 'Conta criada (sem a senha), já vinculada ao cadastro', content: json(usuarioResponseSchema) },
      400: erro400Corpo,
      409: erro('E-mail, CPF ou CNPJ já cadastrado'),
      413: erro413,
      500: erro500,
    },
  });
  registry.registerPath({
    method: 'post', path: '/usuarios/login', tags, summary: 'Fazer login',
    description: 'Rota pública. O perfil escolhido precisa ser o perfil da conta (contas antigas sem perfil entram como ADOTANTE ou INSTITUICAO para concluí-lo). '
      + 'A escolha não concede permissões: elas vêm do perfil gravado. Devolve o token JWT, válido por 1 hora. Use-o no botão Authorize.',
    request: { body: { required: true, content: json(loginSchema) } },
    responses: {
      200: { description: 'Login realizado', content: json(tokenResponseSchema) },
      400: erro400Corpo,
      401: erro('Credenciais inválidas (e-mail inexistente ou senha errada)'),
      403: erro('O perfil escolhido não corresponde a esta conta'),
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
    method: 'get', path: '/usuarios/me', tags, summary: 'Conta autenticada',
    description: 'Dados da conta do token, com o perfil e o cadastro vinculado. Vale também para contas sem perfil.',
    responses: { 200: { description: 'Conta (sem a senha)', content: json(usuarioResponseSchema) }, 500: erro500 },
  });
  protegida(registry, {
    method: 'post', path: '/usuarios/perfil', tags, summary: 'Concluir o perfil de uma conta antiga',
    description: 'Para contas criadas antes dos perfis (perfil null): cria um cadastro novo de adotante ou instituição e o vincula à conta. '
      + 'Não é possível assumir cadastros existentes nem escolher ADMIN.',
    request: { body: { required: true, content: json(perfilSchema) } },
    responses: {
      200: { description: 'Conta com o perfil concluído', content: json(usuarioResponseSchema) },
      400: erro400Corpo,
      409: erro('A conta já possui perfil, ou CPF/CNPJ já cadastrado'),
      413: erro413,
      500: erro500,
    },
  });
  protegida(registry, {
    method: 'get', path: '/usuarios', tags, summary: 'Listar usuários',
    responses: { 200: { description: 'Lista de usuários (sem as senhas)', content: json(z.array(usuarioResponseSchema)) }, 500: erro500 },
  }, ['ADMIN']);
}

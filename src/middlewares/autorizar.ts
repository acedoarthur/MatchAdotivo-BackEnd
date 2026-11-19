import type { RequestHandler, Response } from 'express';
import type { Database } from '../prisma/db';
import { ForbiddenError } from '../shared/errors';
import { usuarioService } from '../modules/usuario/usuario.service';
import type { Conta, Perfil } from '../modules/usuario/usuario.types';

/*
Depois do autenticar: carrega do banco a conta do token (perfil e vínculo) em res.locals.conta.
O perfil nunca vem do corpo, da URL ou do token; os services usam essa identidade.
*/
export const identificar = (db: Database): RequestHandler => {
  const usuarios = usuarioService(db);
  return async (req, res, next) => {
    res.locals.conta = await usuarios.conta(res.locals.usuarioId);
    next();
  };
};

export const contaDe = (res: Response): Conta => res.locals.conta;

/** Libera a rota apenas para os perfis informados (403). Contas sem perfil nunca passam. */
export const exigirPerfil = (...perfis: Perfil[]): RequestHandler => (req, res, next) => {
  const { perfil } = contaDe(res);
  if (!perfil) throw new ForbiddenError('Conta sem perfil: conclua o cadastro como adotante ou instituição em POST /usuarios/perfil.');
  if (!perfis.includes(perfil)) throw new ForbiddenError('Acesso não permitido para este perfil.');
  next();
};

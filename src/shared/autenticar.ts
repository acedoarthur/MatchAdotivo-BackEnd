import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../config/jwt';
import { UnauthorizedError } from './errors';

/*
Exige o cabeçalho Authorization: Bearer <token>. Se o token for válido, guarda o id do
usuário e o próprio token em res.locals para as próximas funções da rota.
Sempre responde 401 (não sei quem você é); um 403 só existiria com papéis de usuário.
*/
export const autenticar = (req: Request, res: Response, next: NextFunction) => {
  const [tipo, token, ...resto] = req.headers.authorization?.split(' ') ?? [];
  if (tipo !== 'Bearer' || !token || resto.length > 0) throw new UnauthorizedError('Token não informado');
  const payload = verifyToken(token);
  res.locals.usuarioId = payload.id;
  res.locals.token = token;
  next();
};

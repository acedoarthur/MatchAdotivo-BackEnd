import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../shared/errors';

const SECRET = process.env.JWT_SECRET;

// Sem segredo não há como assinar tokens: melhor parar já na inicialização.
if (!SECRET) {
  throw new Error('Defina a variável JWT_SECRET no arquivo .env (veja .env.example).');
}

// Dados guardados dentro do token
export interface TokenPayload {
  id: number;
}

/*
Lista de tokens invalidados pelo logout.
ATENÇÃO: fica na memória do servidor e é apagada a cada reinício; um token que já fez
logout volta a valer até expirar (1 hora). A persistência (tabela ou Redis) é o desafio
opcional do laboratório e não faz parte desta implementação.
*/
const blacklist = new Set<string>();

// O jti torna cada token único: sem ele, um login logo após o logout (no mesmo segundo) geraria
// um token idêntico ao que está na blacklist e o novo login já nasceria invalidado.
export const generateToken = (id: number) => jwt.sign({ id }, SECRET, { expiresIn: '1h', jwtid: randomUUID() });

export const verifyToken = (token: string): TokenPayload => {
  if (blacklist.has(token)) throw new UnauthorizedError('Token inválido');
  try {
    // Somente HS256, o algoritmo usado na assinatura.
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !Number.isInteger(payload.id)) throw new Error('payload inesperado');
    return { id: payload.id as number };
  } catch {
    // Assinatura inválida, token alterado ou expirado
    throw new UnauthorizedError('Token inválido ou expirado');
  }
};

export const blacklistToken = (token: string) => {
  blacklist.add(token);
};

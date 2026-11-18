import type { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { createUsuarioSchema, loginSchema } from './usuario.schema';

export type CreateUsuarioDTO = z.infer<typeof createUsuarioSchema>;
// O que o repository grava: a senha já criptografada (hash bcrypt de 60 caracteres).
export type NovoUsuario = Omit<CreateUsuarioDTO, 'senha'> & { senha: Varchar<100> };
export type LoginDTO = z.infer<typeof loginSchema>;

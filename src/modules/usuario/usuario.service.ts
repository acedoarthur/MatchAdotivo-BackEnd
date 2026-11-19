import bcrypt from 'bcrypt';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { Database, Transaction } from '../../prisma/db';
import { blacklistToken, generateToken } from '../../config/jwt';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../shared/errors';
import { emTransacao } from '../../shared/repository';
import { encontrado } from '../../shared/validacao';
import { adotanteService } from '../adotante/adotante.service';
import { instituicaoService } from '../instituicao/instituicao.service';
import { usuarioRepository } from './usuario.repo';
import type { Conta, CreateUsuarioDTO, LoginDTO, PerfilDTO, Vinculo } from './usuario.types';

// Custo do bcrypt: quanto maior, mais lento (e mais difícil de quebrar)
const SALT_ROUNDS = 10;
// Hash de uma senha qualquer: o login compara contra ele quando o e-mail não existe, para que
// e-mail inexistente e senha errada demorem o mesmo tempo e a API não revele quais e-mails existem.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-pertence-a-ninguem', SALT_ROUNDS);

interface UsuarioGravado { id_usuario: number; perfil: string | null; id_adotante: number | null; id_instituicao: number | null }

/** Converte o registro do banco na identidade usada pelos services (o CHECK do banco garante a coerência). */
export function paraConta({ id_usuario, perfil, id_adotante, id_instituicao }: UsuarioGravado): Conta {
  if (perfil === 'ADOTANTE' && id_adotante !== null) return { id_usuario, perfil, id_adotante, id_instituicao: null };
  if (perfil === 'INSTITUICAO' && id_instituicao !== null) return { id_usuario, perfil, id_adotante: null, id_instituicao };
  return { id_usuario, perfil: perfil === 'ADMIN' ? 'ADMIN' : null, id_adotante: null, id_instituicao: null };
}

export function usuarioService(db: Database) {
  const repo = usuarioRepository(db);

  // Cria o cadastro do perfil escolhido na mesma transação da conta, com as regras de cada módulo (CPF/CNPJ únicos).
  async function criarCadastro(tx: Transaction, dados: PerfilDTO): Promise<Vinculo> {
    const perfil = dados.perfil as Varchar<20>;
    if (dados.perfil === 'ADOTANTE') return { perfil, id_adotante: (await adotanteService(db, tx).create(dados.adotante)).id_adotante };
    return { perfil, id_instituicao: (await instituicaoService(db, tx).create(dados.instituicao)).id_instituicao };
  }

  // Define o perfil de uma conta que ainda não tem nenhum, com a linha bloqueada na transação.
  function definirPerfil(id_usuario: number, vinculo: (tx: Transaction) => Promise<Vinculo>) {
    return emTransacao(db, async (tx) => {
      const usuarios = usuarioRepository(db, tx);
      const atual = await usuarios.bloquear(id_usuario);
      if (!atual) throw new NotFoundError('Usuário não encontrado.');
      if (atual.perfil !== null) throw new ConflictError(`A conta já possui o perfil ${atual.perfil}.`);
      return encontrado(await usuarios.definirPerfil(id_usuario, await vinculo(tx)));
    });
  }

  return {
    getAll: () => repo.findAll(),

    // Cadastro público: o schema só aceita ADOTANTE ou INSTITUICAO; ADMIN nunca nasce aqui.
    create: async ({ nome, email, senha, ...perfil }: CreateUsuarioDTO) => {
      if (await repo.existsByEmail(email)) throw new ConflictError('E-mail já cadastrado');
      // A senha é criptografada antes de chegar ao banco; a original nunca é guardada.
      const hash = await bcrypt.hash(senha, SALT_ROUNDS) as Varchar<100>;
      return emTransacao(db, async (tx) => usuarioRepository(db, tx).create({ nome, email, senha: hash, ...await criarCadastro(tx, perfil) }));
    },

    // O perfil escolhido na tela é conferido com o gravado; ele não concede permissões.
    login: async ({ email, senha, perfil }: LoginDTO) => {
      const usuario = await repo.findByEmailComSenha(email);
      const confere = await bcrypt.compare(senha, usuario?.senha ?? HASH_FALSO);
      // Mesma mensagem para e-mail inexistente e senha errada.
      if (!usuario || !confere) throw new UnauthorizedError('Credenciais inválidas');
      // Conta antiga sem perfil: entra para concluí-lo como adotante ou instituição, nunca como administrador.
      const permitido = usuario.perfil === null ? perfil !== 'ADMIN' : usuario.perfil === perfil;
      if (!permitido) throw new ForbiddenError('O perfil escolhido não corresponde a esta conta.');
      return { token: generateToken(usuario.id_usuario), perfil: paraConta(usuario).perfil };
    },

    logout: (token: string) => { blacklistToken(token); },

    // Identidade da requisição: o perfil é sempre lido do banco, nunca do token ou do corpo.
    conta: async (id_usuario: number) => {
      const usuario = await repo.findById(id_usuario);
      if (!usuario) throw new UnauthorizedError('Token inválido');
      return paraConta(usuario);
    },

    findById: async (id_usuario: number) => {
      const usuario = await repo.findById(id_usuario);
      if (!usuario) throw new UnauthorizedError('Token inválido');
      return usuario;
    },

    // Contas antigas escolhem o perfil uma única vez, criando um cadastro novo (não assumem cadastros existentes).
    // Duas conclusões simultâneas: a segunda espera o bloqueio, encontra o perfil e é desfeita (409).
    completarPerfil: (conta: Conta, dados: PerfilDTO) => definirPerfil(conta.id_usuario, (tx) => criarCadastro(tx, dados)),

    // Uso exclusivo do comando de servidor (npm run usuario:admin). Não altera a senha.
    tornarAdmin: async (email: Varchar<255>) => {
      const usuario = await repo.findByEmail(email);
      if (!usuario) throw new NotFoundError('Usuário não encontrado.');
      if (usuario.perfil === 'ADMIN') return usuario;
      // O administrador não tem cadastro de adotante ou instituição: só contas sem perfil são promovidas.
      return definirPerfil(usuario.id_usuario, async () => ({ perfil: 'ADMIN' as Varchar<20> }));
    },
  };
}

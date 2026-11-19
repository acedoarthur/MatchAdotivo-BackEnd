import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteRepository(db: Database, tx?: Transaction) {
  const Adotantes = executor(db, tx).Adotante;
  return {
    findAll: () => Adotantes.orderBy((a) => a.id_adotante.asc()).all(),
    findById: (id_adotante: number) => Adotantes.where({ id_adotante }).first(),
    // Adotantes que fizeram pedidos para animais da instituição.
    findSolicitantes: (id_instituicao: number) => Adotantes
      .where((a) => a.matches.some((m) => m.animal.some((animal) => animal.id_instituicao.eq(id_instituicao))))
      .orderBy((a) => a.id_adotante.asc()).all(),
    isSolicitante: async (id_adotante: number, id_instituicao: number) => (await Adotantes.select('id_adotante')
      .where({ id_adotante })
      .where((a) => a.matches.some((m) => m.animal.some((animal) => animal.id_instituicao.eq(id_instituicao))))
      .first()) !== null,
    // RN02: o CPF é único, então a busca retorna no máximo um adotante (ou null). Informe somente os 11 dígitos.
    findByCpf: (cpf: CreateAdotanteDTO['cpf']) => Adotantes.where({ cpf }).first(),
    create: (data: CreateAdotanteDTO) => escrever(() => Adotantes.create(data)),
    update: (id_adotante: number, data: UpdateAdotanteDTO) => escrever(() => Adotantes.where({ id_adotante }).update(data)),
    delete: (id_adotante: number) => escrever(() => Adotantes.where({ id_adotante }).delete()),
  };
}

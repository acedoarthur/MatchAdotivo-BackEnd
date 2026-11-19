import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateAnimalVacinaDTO, UpdateAnimalVacinaDTO } from './animal-vacina.types';

export function animalVacinaRepository(db: Database, tx?: Transaction) {
  const Aplicacoes = executor(db, tx).AnimalVacina;
  return {
    // Sem instituição: todas as aplicações; com ela, só as dos seus animais.
    findAll: (id_instituicao?: number) => (id_instituicao === undefined
      ? Aplicacoes
      : Aplicacoes.where((v) => v.animal.some((a) => a.id_instituicao.eq(id_instituicao)))
    ).orderBy((v) => v.id_animal_vacina.asc()).all(),
    findById: (id_animal_vacina: number) => Aplicacoes.where({ id_animal_vacina }).first(),
    // RN05: cada dose é um registro próprio; o histórico traz os dados da vacina.
    findByAnimalComVacina: (id_animal: number) => Aplicacoes.where({ id_animal }).include('vacina').all(),
    create: (data: CreateAnimalVacinaDTO) => escrever(() => Aplicacoes.create(data)),
    update: (id_animal_vacina: number, data: UpdateAnimalVacinaDTO) => escrever(() => Aplicacoes.where({ id_animal_vacina }).update(data)),
    delete: (id_animal_vacina: number) => escrever(() => Aplicacoes.where({ id_animal_vacina }).delete()),
  };
}

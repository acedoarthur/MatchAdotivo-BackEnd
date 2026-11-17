#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3cce462da2c0573e90df8aca5903a5c53868053795b6cc907db5e45c524b855e/contract';
import endContract from '../../snapshots/3cce462da2c0573e90df8aca5903a5c53868053795b6cc907db5e45c524b855e/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'adotantes',
        columns: [
          col('cpf', 'character varying(11)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 11 } },
          }),
          col('endereco', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id_adotante', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(200)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
          }),
          col('possui_animais', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('quantidade_animais', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tipo_residencia', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('tipos_animais', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id_adotante']),
          checkExpression(
            'adotante_quantidade_coerente_5e097913',
            'quantidade_animais >= 0 AND ((possui_animais = false AND quantidade_animais = 0) OR (possui_animais = true AND quantidade_animais > 0))',
          ),
          checkExpression(
            'adotante_residencia_valida_a906faef',
            "tipo_residencia IN ('CASA', 'APARTAMENTO', 'CHÁCARA', 'OUTRO')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'animais',
        columns: [
          col('data_nascimento', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('detalhes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('foto', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('id_animal', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_instituicao', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('raca', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('tipo', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
        ],
        constraints: [primaryKey(['id_animal'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'animais_vacinas',
        columns: [
          col('data_aplicacao', 'date', {
            notNull: true,
            codecRef: { codecId: 'pg/date-string@1' },
          }),
          col('id_animal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_animal_vacina', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_vacina', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id_animal_vacina'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'instituicoes',
        columns: [
          col('cnpj', 'character varying(14)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 14 } },
          }),
          col('endereco', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id_instituicao', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('razao_social', 'character varying(200)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
          }),
        ],
        constraints: [primaryKey(['id_instituicao'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'matches',
        columns: [
          col('data_pedido', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id_adotante', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_animal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_match', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'character varying(20)', {
            notNull: true,
            default: lit('PENDENTE'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
        ],
        constraints: [
          primaryKey(['id_match']),
          checkExpression(
            'match_status_valido_e7687d0e',
            "status IN ('PENDENTE', 'EM ANDAMENTO', 'APROVADO', 'CANCELADO')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'vacinas',
        columns: [
          col('id_vacina', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
        ],
        constraints: [primaryKey(['id_vacina'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'adotantes',
        constraint: 'adotantes_cpf_key',
        columns: ['cpf'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'instituicoes',
        constraint: 'instituicoes_cnpj_key',
        columns: ['cnpj'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'animais',
        index: 'animais_id_instituicao_idx_c78bbdf2',
        columns: ['id_instituicao'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'animais_vacinas',
        index: 'animais_vacinas_id_animal_idx_6941e98e',
        columns: ['id_animal'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'animais_vacinas',
        index: 'animais_vacinas_id_vacina_idx_1214447b',
        columns: ['id_vacina'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'matches',
        index: 'match_aprovado_unico_544a0e2c',
        columns: ['id_animal'],
        extras: { where: "status = 'APROVADO'", unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'matches',
        index: 'matches_id_adotante_idx_cd3390a2',
        columns: ['id_adotante'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'animais',
        foreignKey: {
          name: 'animais_id_instituicao_fkey',
          columns: ['id_instituicao'],
          references: { schema: 'public', table: 'instituicoes', columns: ['id_instituicao'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'animais_vacinas',
        foreignKey: {
          name: 'animais_vacinas_id_animal_fkey',
          columns: ['id_animal'],
          references: { schema: 'public', table: 'animais', columns: ['id_animal'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'animais_vacinas',
        foreignKey: {
          name: 'animais_vacinas_id_vacina_fkey',
          columns: ['id_vacina'],
          references: { schema: 'public', table: 'vacinas', columns: ['id_vacina'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'matches',
        foreignKey: {
          name: 'matches_id_adotante_fkey',
          columns: ['id_adotante'],
          references: { schema: 'public', table: 'adotantes', columns: ['id_adotante'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'matches',
        foreignKey: {
          name: 'matches_id_animal_fkey',
          columns: ['id_animal'],
          references: { schema: 'public', table: 'animais', columns: ['id_animal'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

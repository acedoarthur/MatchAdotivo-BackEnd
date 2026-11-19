#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0f08593dfd967a13f9fe4fd90ed8c8533294b76b20256bb2d92d1ad7c7be03eb/contract';
import startContract from '../../snapshots/0f08593dfd967a13f9fe4fd90ed8c8533294b76b20256bb2d92d1ad7c7be03eb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/59b33a22d609d4d74ff5c3aea6a3e612a3f8d769f4b4f9761795ec2e9e449958/contract';
import endContract from '../../snapshots/59b33a22d609d4d74ff5c3aea6a3e612a3f8d769f4b4f9761795ec2e9e449958/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'usuarios',
        column: col('id_adotante', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usuarios',
        column: col('id_instituicao', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usuarios',
        column: col('perfil', 'character varying(20)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuario_perfil_coerente_2d044a9d',
        expression:
          "(perfil IS NULL AND id_adotante IS NULL AND id_instituicao IS NULL) OR (perfil = 'ADOTANTE' AND id_adotante IS NOT NULL AND id_instituicao IS NULL) OR (perfil = 'INSTITUICAO' AND id_instituicao IS NOT NULL AND id_adotante IS NULL) OR (perfil = 'ADMIN' AND id_adotante IS NULL AND id_instituicao IS NULL)",
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuarios_id_adotante_key',
        columns: ['id_adotante'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuarios_id_instituicao_key',
        columns: ['id_instituicao'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usuarios',
        foreignKey: {
          name: 'usuarios_id_adotante_fkey',
          columns: ['id_adotante'],
          references: { schema: 'public', table: 'adotantes', columns: ['id_adotante'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usuarios',
        foreignKey: {
          name: 'usuarios_id_instituicao_fkey',
          columns: ['id_instituicao'],
          references: { schema: 'public', table: 'instituicoes', columns: ['id_instituicao'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

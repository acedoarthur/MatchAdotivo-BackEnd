#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0f08593dfd967a13f9fe4fd90ed8c8533294b76b20256bb2d92d1ad7c7be03eb/contract';
import endContract from '../../snapshots/0f08593dfd967a13f9fe4fd90ed8c8533294b76b20256bb2d92d1ad7c7be03eb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4fc5cd4bd43e7f8dd4f3b3a24a7e023109eb40f3e9591856c1be8f48a450843e/contract';
import startContract from '../../snapshots/4fc5cd4bd43e7f8dd4f3b3a24a7e023109eb40f3e9591856c1be8f48a450843e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'usuarios',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id_usuario', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'character varying(200)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
          }),
          col('senha', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id_usuario'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuarios_email_key',
        columns: ['email'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

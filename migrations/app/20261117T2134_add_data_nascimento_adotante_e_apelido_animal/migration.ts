#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4fc5cd4bd43e7f8dd4f3b3a24a7e023109eb40f3e9591856c1be8f48a450843e/contract';
import endContract from '../../snapshots/4fc5cd4bd43e7f8dd4f3b3a24a7e023109eb40f3e9591856c1be8f48a450843e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8b968a55562824399973051ebc1f97f06d7ba7926ddd48385b85523d17326847/contract';
import startContract from '../../snapshots/8b968a55562824399973051ebc1f97f06d7ba7926ddd48385b85523d17326847/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'adotantes',
        column: col('data_nascimento', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'animais',
        column: col('apelido', 'character varying(100)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

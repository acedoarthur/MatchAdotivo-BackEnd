#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3cce462da2c0573e90df8aca5903a5c53868053795b6cc907db5e45c524b855e/contract';
import startContract from '../../snapshots/3cce462da2c0573e90df8aca5903a5c53868053795b6cc907db5e45c524b855e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8b968a55562824399973051ebc1f97f06d7ba7926ddd48385b85523d17326847/contract';
import endContract from '../../snapshots/8b968a55562824399973051ebc1f97f06d7ba7926ddd48385b85523d17326847/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'instituicoes',
        column: col('foto', 'character varying(500)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

import { Column, Entity } from 'typeorm';
import uuidV4 from 'uuid/v4';

import { ModelTemplate } from '../../src/templates/model.template';


export const FAKE_MODEL_UUID = uuidV4();

@Entity()
export class FakeModel extends ModelTemplate {
  @Column('text')
  public code: string;

  @Column('text')
  public fakeString: string;
}

@Entity()
export class FakeModelWithIndex extends FakeModel {
  @Column('int')
  public index: number;
}


// a prior attempt was made to make a fake TypeORM repository
//   using `sqlite3` + { type: 'sqlite', database: ':memory:' }
//   however, our needs for it were very Postgres-specific,
//   and sqlite's SQL DSL is not useful to us there
// for any features which need a backing database for proper testing,
//   please put your Test Suites in '@withjoy/server-core:test/server-core'
/*
export const FAKE_CONNECTION_NAME = 'fake.model';

export async function createFakeConnection(): Promise<Connection> {
  return createConnection({
    // produces a "working" Repository with devDependencies: { "sqlite3": "^4.2.0" }
    //   but there were quirks, and it ain't no Postgres
    type: 'sqlite',
    database: ':memory:',

    name: FAKE_CONNECTION_NAME,
    entities: [ FakeModel, FakeModelWithIndex ],
  });
}
*/

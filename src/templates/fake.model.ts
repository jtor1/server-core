import { Column, Entity } from 'typeorm';
import { ModelTemplate } from './model.template';

@Entity()
export class FakeModel extends ModelTemplate {
  @Column('text')
  public code: string;

  @Column('text')
  public fakeData: string;
}

@Entity()
export class FakeModelWithIndex extends FakeModel {
  @Column('int')
  public index: number;
}

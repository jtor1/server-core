import { Column, Entity } from 'typeorm';
import { ModelTemplate } from './model.template';

@Entity()
export class FakeModel extends ModelTemplate {
  @Column('text')
  public fakeData: string;
}

@Entity()
export class FakeModelWithIndex extends ModelTemplate {
  @Column('text')
  public fakeData: string;

  @Column('int')
  public index: number;
}

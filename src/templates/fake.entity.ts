import { Column, Entity } from 'typeorm';
import { ModelTemplate } from './model.template';

@Entity()
export class FakeEntity extends ModelTemplate {
  @Column('text')
  public fakeData: string;
}

@Entity()
export class FakeEntityWithIndex extends ModelTemplate {
  @Column('text')
  public fakeData: string;

  @Column('int')
  public index: number;
}

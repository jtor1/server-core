import { Column, Entity } from 'typeorm';
import { Template } from './entity.template';

@Entity()
export class FakeEntity extends Template {
  @Column('text')
  public fakeData: string;
}

@Entity()
export class FakeEntityWithIndex extends Template {
  @Column('text')
  public fakeData: string;

  @Column('int')
  public index: number;
}

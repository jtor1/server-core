import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, VersionColumn, Column, Generated, Index } from 'typeorm';

// useful for when you want to clone a Model,
//   while excluding all the internal Model aspects that are not appropriate to clone
export const MODEL_TEMPLATE_COMMON_PROPERTIES = [ 'key', 'id', 'createAt', 'updateAt', 'version', 'deleted' ];

// useful for Exclude<T, U> syntax
export type ModelTemplateCommonPropertyType = keyof ModelTemplate;

export abstract class ModelTemplate  {

  @PrimaryGeneratedColumn('increment')
  public key: number;

  @Index({ unique: true })
  @Column('uuid')
  @Generated('uuid')
  public id: string;

  @CreateDateColumn()
  public createAt: Date;

  @UpdateDateColumn()
  public updateAt: Date;

  @VersionColumn({ default: 1 })
  public version: number;

  @Column('bool', { default: false})
  public deleted: boolean;
}

export interface ModelTemplateClass<ModelTemplate> {
  new(...args: any[]): ModelTemplate;
};

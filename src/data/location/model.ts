import { Entity, Column, Index } from 'typeorm';

import { LocationInterface } from '../../graphql/core.types';
import { ModelTemplate } from '../../templates/model.template';

export abstract class LocationModelTemplate extends ModelTemplate implements LocationInterface {

  @Column('text', { nullable: true })
  public address1?: string;

  @Column('text', { nullable: true })
  public address2?: string;

  @Column('text', { nullable: true })
  public city?: string;

  @Column('text', { nullable: true })
  public state?: string;

  @Column('text', { nullable: true })
  public country?: string;

  @Column('text', { nullable: true })
  public postalCode?: string;

  @Column('float', { nullable: true })
  public latitude?: number;

  @Column('float', { nullable: true })
  public longitude?: number;

  @Column('text', { nullable: true })
  public name?: string;

  // https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
  @Index({unique: false})
  @Column('text', { nullable: true })
  public placeId: string;

  @Column('timestamp', {nullable: true})
  public fetchedAt?: Date;

}

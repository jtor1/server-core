import { Context } from '../server/apollo.context';
import { Template } from './entity.template';

export class ModelTemplate<T> {
  public data: T;
  private _context: Context;

  constructor(context: Context, data: T) {
    this._context = context;
    this.data = data;
  }

  get context() {
    return this._context;
  }
}

export class EntityModelTemplate<T extends Template> extends ModelTemplate<T> {

  get key() {
    return this.data.key;
  }

  get id() {
    return this.data.id;
  }

  get createdAt() {
    return this.data.createAt;
  }

  get updatedAt() {
    return this.data.updateAt;
  }
}
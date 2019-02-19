import { IContext } from '../server/apollo.context';
import { Template } from './entity.template';

export class ModelTemplate<T, C extends IContext> {
  public data: T;
  private _context: C;

  constructor(context: C, data: T) {
    this._context = context;
    this.data = data;
  }

  get context() {
    return this._context;
  }
}

export class EntityModelTemplate<T extends Template, C extends IContext> extends ModelTemplate<T, C> {

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
import { IContext } from '../server/apollo.context';
import { ModelTemplate } from './model.template';

export class ViewTemplate<T, C extends IContext> {
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

export class ModelViewTemplate<T extends ModelTemplate, C extends IContext> extends ViewTemplate<T, C> {

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

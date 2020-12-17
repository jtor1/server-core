import { IContext } from '../server/apollo.context';
import { ModelTemplate } from './model.template';
import {
  CoreTypeDate,
  resolveCoreTypeDate,
} from '../graphql/core.types';


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
  // convenience method; do *NOT* expose via GraphQL
  //   we should only expose our public-facing UUIDs
  get key() {
    return this.data.key;
  }

  get id() {
    return this.data.id;
  }

  get createdAt(): CoreTypeDate | null {
    // timezone-agonistic
    return resolveCoreTypeDate(this.data.createAt, undefined);
  }

  get updatedAt(): CoreTypeDate | null {
    // timezone-agonistic
    return resolveCoreTypeDate(this.data.updateAt, undefined);
  }
}

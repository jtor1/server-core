import { Template } from './entity.template';

export class ModelTemplate<T> {
  public data: T;

  constructor(data: T) {
    this.data = data;
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
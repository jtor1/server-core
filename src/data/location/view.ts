import { isEmpty } from 'lodash';
import { ViewTemplate, ModelViewTemplate } from '../../templates/view.template';
import { LocationModelTemplate } from './model';
import { Context } from '../../server/apollo.context';
import { LocationInterface } from '../../graphql/core.types';

export const NO_LOCATION = Object.freeze({}) as LocationModelTemplate;

export class LocationView extends ModelViewTemplate<LocationModelTemplate, Context> implements LocationInterface { //Model View Template?

  constructor(context: Context, location: LocationModelTemplate) {
    super(context, location || NO_LOCATION);
  }

  get address1() {
    return this.data.address1;
  }

  get address2() {
    return this.data.address2;
  }

  get city() {
    return this.data.city;
  }

  get state() {
    return this.data.state;
  }

  get country() {
    return this.data.country;
  }

  get postalCode() {
    return this.data.postalCode;
  }

  get latitude() {
    return this.data.latitude;
  }

  get longitude() {
    return this.data.longitude;
  }

  get placeId() {
    return this.data.placeId;
  }

  get name() {
    return this.data.name;
  }

}

export class DecoratedLocationView extends LocationView implements LocationInterface{
  decorator: LocationInterface;

  constructor(context: Context, data: LocationModelTemplate, decorator: LocationInterface) {
    super(context, data)
    this.decorator = decorator;
  }

  get address1() {
    if (this.decorator.address1 !== undefined) {
      return this.decorator.address1;
    }
    return this.data.address1;
  }

  get address2() {
    if (this.decorator.address2 !== undefined) {
      return this.decorator.address2;
    }
    return this.data.address2;
  }

  get city() {
    if (this.decorator.city !== undefined) {
      return this.decorator.city;
    }
    return this.data.city;
  }

  get state() {
    if (this.decorator.state !== undefined) {
      return this.decorator.state;
    }
    return this.data.state;
  }

  get country() {
    if (this.decorator.country !== undefined) {
      return this.decorator.country;
    }
    return this.data.country;
  }

  get postalCode() {
    if (this.decorator.postalCode !== undefined) {
      return this.decorator.postalCode;
    }
    return this.data.postalCode;
  }

  get latitude() {
    if (this.decorator.latitude !== undefined) {
      return this.decorator.latitude;
    }
    return this.data.latitude;
  }

  get longitude() {
    if (this.decorator.longitude !== undefined) {
      return this.decorator.longitude;
    }
    return this.data.longitude;
  }

  get placeId() {
    if (this.decorator.placeId !== undefined) {
      return this.decorator.placeId;
    }
    return this.data.placeId;
  }

  get name() {
    if (this.decorator.name !== undefined) {
      return this.decorator.name;
    }
    return this.data.name;
  }

  public isEmpty = () => {
    return isEmpty(this.decorator) && (this.data === NO_LOCATION)
  }


}

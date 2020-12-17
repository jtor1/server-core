import { ViewTemplate } from '../../templates/view.template';
import { Location } from './model';
import { Context } from '../../server/apollo.context';
import { LocationInterface } from '../core.types';

export class LocationView extends ViewTemplate<Location, Context> { //Model View Template?

  constructor(context: Context, location: Location) {
    super(context, location);
  }

  get id() {
    return this.data.id;
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

}

export class DecoratedLocationView extends LocationView {
  decorator: LocationInterface;

  constructor(context: Context, data: Location, decorator: LocationInterface) {
    super(context, data)
    this.decorator = decorator;
  }

  get address1() {
    if (this.decorator.address1) {
      return this.decorator.address1;
    }
    return this.data.address1;
  }

  get address2() {
    if (this.decorator.address2) {
      return this.decorator.address2;
    }
    return this.data.address2;
  }

  get city() {
    if (this.decorator.city) {
      return this.decorator.city;
    }
    return this.data.city;
  }

  get state() {
    if (this.decorator.state) {
      return this.decorator.state;
    }
    return this.data.state;
  }

  get country() {
    if (this.decorator.country) {
      return this.decorator.country;
    }
    return this.data.country;
  }

  get postalCode() {
    if (this.decorator.postalCode) {
      return this.decorator.postalCode;
    }
    return this.data.postalCode;
  }

  get latitude() {
    if (this.decorator.latitude) {
      return this.decorator.latitude;
    }
    return this.data.latitude;
  }

  get longitude() {
    if (this.decorator.longitude) {
      return this.decorator.longitude;
    }
    return this.data.longitude;
  }

  get placeId() {
    if (this.decorator.placeId) {
      return this.decorator.placeId;
    }
    return this.data.placeId;
  }


}

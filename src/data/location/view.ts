import { isEmpty } from 'lodash';
import { ModelViewTemplate } from '../../templates/view.template';
import { LocationModelTemplate } from './model';
import { Context } from '../../server/apollo.context';
import { LocationInterface } from '../../graphql/core.types';


function _isValueProvided<T>(value: T | null | undefined): boolean {
  return ! ((value === null) || (value === undefined));
}
function _decoratedOrDataValue<T>(decoratedValue: T | null | undefined, dataValue: T): T {
  return (_isValueProvided(decoratedValue) ? decoratedValue! : dataValue);
}


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
  decorator: LocationInterface | undefined | null;

  constructor(context: Context, data: LocationModelTemplate | null | undefined, decorator?: LocationInterface) {
    super(context, data || NO_LOCATION)
    this.decorator = decorator;
  }

  get address1(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.address1, this.data.address1);
  }

  get address2(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.address2, this.data.address2);
  }

  get city(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.city, this.data.city);
  }

  get state(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.state, this.data.state);
  }

  get country(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.country, this.data.country);
  }

  get postalCode(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.postalCode, this.data.postalCode);
  }

  get latitude(): number | undefined {
    return _decoratedOrDataValue(this.decorator?.latitude, this.data.latitude);
  }

  get longitude(): number | undefined {
    return _decoratedOrDataValue(this.decorator?.longitude, this.data.longitude);
  }

  get placeId(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.placeId, this.data.placeId);
  }

  get name(): string | undefined {
    return _decoratedOrDataValue(this.decorator?.name, this.data.name);
  }


  public hasDecoration() {
    if (! this.decorator) {
      return false;
    }
    return Object.values(this.decorator).some(_isValueProvided);
  }

  public isEmpty () {
    return (! this.hasDecoration()) && isEmpty(this.data)
  }

  public decorate(decorator: LocationInterface): this {
    this.decorator = decorator;
    return this;
  }

}

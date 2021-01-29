import { createClient, ClientResponse, PlaceDetailsResponse, AddressComponent, GoogleMapsClient } from '@google/maps';
import { LocationModelTemplate } from './model';
export interface GooglePlacesConfig {
  placeApiKey: string
}

export class GooglePlacesClient {
  private client: GoogleMapsClient;

  constructor(config: GooglePlacesConfig) {
    this.client = createClient({
      key: config.placeApiKey
    });
  }

  public fetchPlaceInfo(placeId: string): Promise<ClientResponse<PlaceDetailsResponse>> {
    return new Promise((resolve, reject) => {
      this.client.place(
        {
          placeid: placeId
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    })
  }

  public async fetchLocationData(placeId: string): Promise<LocationModelTemplate> {
    const location = {} as LocationModelTemplate;
    const placeInfo = (await this.fetchPlaceInfo(placeId)).json;
    const geocoordinates = placeInfo?.result?.geometry?.location;
    location.latitude = geocoordinates?.lat;
    location.longitude = geocoordinates?.lng;
    location.name = placeInfo.result.name;
    location.placeId = placeId;
    return this._createAddress(location, placeInfo.result.address_components);
  }

  private _createAddress(location: LocationModelTemplate, addressComponents: Array<AddressComponent<unknown>>): LocationModelTemplate {
    location.address1 = undefined;
    location.address2 = undefined;
    location.city = undefined;
    location.state = undefined;
    location.country = undefined;
    location.postalCode = undefined;
    addressComponents.map(addressComponent => {
      if (addressComponent.types?.includes('street_number')) {
        location.address1 = addressComponent.long_name;
      } else if (addressComponent.types?.includes('route')) {
        location.address1 = location.address1 + ' ' + addressComponent.long_name;
      } else if (addressComponent.types?.includes('locality')) {
        location.city = addressComponent.long_name;
      } else if (addressComponent.types?.includes('administrative_area_level_1')) {
        location.state = addressComponent.long_name;
      } else if (addressComponent.types?.includes('country')) {
        location.country = addressComponent.long_name;
      } else if (addressComponent.types?.includes('postal_code')) {
        location.postalCode = addressComponent.long_name;
      }
    });
    return location;
  }

}

export function googlePlacesClient(config: GooglePlacesConfig): GooglePlacesClient {
  return new GooglePlacesClient(config);
}


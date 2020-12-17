import {GooglePlacesConfig, GooglePlacesClient,  googlePlacesClient} from './googlePlacesClient';
import {PLACE_ID} from '../../../test/helpers/const';

describe('utils/location', () => {
  const config: GooglePlacesConfig = {
    placeApiKey: "AIzaSyDdgAMee8djOY-pPE0xErsRRmGTmzNZOkU"
  }
  let client: GooglePlacesClient = googlePlacesClient(config);

  describe('fetchPlaceInfo', () => {
    it ('fetches a location payload based on placeId', async () => {
      const result = await client.fetchPlaceInfo(PLACE_ID);
      expect(result).toBeDefined();
    });

    it.todo ('errors if the placeId is not associated with a location');

  });

  describe('fetchLocation', () => {
    it ('returns a location based on placeId', async () => {
      const location = await client.fetchLocation(PLACE_ID)
      expect(location).toMatchObject({
        latitude: 34.23544330000001,
        longitude: -77.94935509999999,
        placeId: 'ChIJgUbEo8cfqokR5lP9_Wh_DaM',
        address1: '13 Market Street',
        address2: undefined,
        city: 'Wilmington',
        state: 'North Carolina',
        country: 'United States',
        postalCode: '28401'
      })
    });

    it.todo ('errors if placeId does not exists')
  })
})

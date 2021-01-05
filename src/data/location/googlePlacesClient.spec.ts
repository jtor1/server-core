import {GooglePlacesConfig, GooglePlacesClient,  googlePlacesClient} from './googlePlacesClient';
import {PLACE_ID} from '../../../test/helpers/const';
import nock from 'nock';

const GOOGLE_URL = "https://maps.googleapis.com:443"
const GOOGLE_API_KEY = "AIzaSyDdgAMee8djOY-pPE0xErsRRmGTmzNZOkU"

describe('data/location', () => {
  const config: GooglePlacesConfig = {
    placeApiKey: GOOGLE_API_KEY
  }
  let client: GooglePlacesClient = googlePlacesClient(config);

  beforeEach(() => {
    //nock.recorder.rec();
    nock.disableNetConnect();
  })

  afterEach(() => {
    nock.restore();
     //nock.isDone();
     //nock.cleanAll();
     nock.enableNetConnect();
  })

  describe('fetchPlaceInfo', () => {
    it ('fetches a location payload based on placeId', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeId: PLACE_ID,
        key: GOOGLE_API_KEY
      })
      .reply(
        200, {
          result: "FAKE_RESPONSE"
        }
      )

      await expect(
        client.fetchPlaceInfo(PLACE_ID)
      ).resolves.toBeDefined();
    });

    it.todo ('errors if the placeId is not associated with a location');

  });

  describe('fetchLocation', () => {
    it.only ('returns a location based on placeId', async () => {

      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: PLACE_ID,
        key: GOOGLE_API_KEY
      })
      .reply( 200, {
          result: {
            address_components: [
              {
                long_name:"13",
                short_name:"13",
                types:["street_number"]
              },
              {
                long_name:"Market Street",
                short_name:"Market St",
                types:["route"],
              },
              {
                long_name:"Wilmington",
                short_name:"Wilmington",
                types:["locality","political"]
              },
              {
                long_name:"North Carolina",
                short_name:"NC",
                types:["administrative_area_level_1","political"]
              },
              {
                long_name:"MESSAGE",
                short_name:"US",
                types:["country","political"]
              },
              {
                long_name:"28401",
                short_name:"28401",
                types:["postal_code"]
              }
            ],
            geometry: {
              location: {
                lat: 34.23544330000001,
                lng: -77.94935509999999
              }
            },
          }
        })
        .log(console.log);

      const location = await client.fetchLocation(PLACE_ID)
      console.log(location);

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

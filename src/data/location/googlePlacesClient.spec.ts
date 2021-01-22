import {GooglePlacesConfig, GooglePlacesClient,  googlePlacesClient} from './googlePlacesClient';
import {PLACE_ID} from '../../../test/helpers/const';
import nock from 'nock';
import { LocationModelTemplate } from './model';

const GOOGLE_URL = "https://maps.googleapis.com:443"
const GOOGLE_API_KEY = "AIzaSyDdgAMee8djOY-pPE0xErsRRmGTmzNZOkU"


describe('data/location', () => {
  const config: GooglePlacesConfig = {
    placeApiKey: GOOGLE_API_KEY
  }
  let client: GooglePlacesClient = googlePlacesClient(config);


  describe ('fetchPlaceInfo', () => {
    beforeEach(() => {
      nock.disableNetConnect();
    })

    afterEach(() => {
       nock.isDone();
       nock.cleanAll();
       nock.enableNetConnect();
    })

    it ('fetches a location payload based on placeId', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: PLACE_ID,
        key: GOOGLE_API_KEY
      })
      .reply(
        200, {
          result: "FAKE_RESPONSE"
        },
        {'Content-Type': 'application/json; charset=UTF-8'}
      )

      await expect(
        client.fetchPlaceInfo(PLACE_ID)
      ).resolves.toMatchObject({
        json: {
          result: "FAKE_RESPONSE"
        }
      });
    });

    it ('rejects if the placeId is not associated with a location', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: 'INVALID_PLACE_ID',
        key: GOOGLE_API_KEY
      })
      .reply(
        200, {
          status: "INVALID_REQUEST"
        },
        {'Content-Type': 'application/json; charset=UTF-8'}
      )

      await expect(
        client.fetchPlaceInfo('INVALID_PLACE_ID')
      ).rejects.toMatchObject({
        json: {
          status: "INVALID_REQUEST"
        }
      });
    });

    it ('returns a location where most of the data is missing', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: PLACE_ID,
        key: GOOGLE_API_KEY,
      })
      .reply( 200, {
        result: {
          address_components: [],
        }
      }, {'Content-Type': 'application/json; charset=UTF-8'})

      await expect(
        client.fetchPlaceInfo(PLACE_ID)
      ).resolves.toBeDefined();
    });

  });

  describe ('fetchLocation', () => {

    beforeEach(() => {
      nock.disableNetConnect();
    })

    afterEach(() => {
       nock.isDone();
       nock.cleanAll();
       nock.enableNetConnect();
    })

    it ('returns a location based on placeId', async () => {

      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: PLACE_ID,
        key: GOOGLE_API_KEY,
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
                long_name:"United States",
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
                lat: 34,
                lng: -77,
              }
            },
          }
        }, {'Content-Type': 'application/json; charset=UTF-8'})

      const location = await client.fetchLocation(PLACE_ID)

      expect(location).toMatchObject({
        latitude: 34,
        longitude: -77,
        placeId: 'ChIJgUbEo8cfqokR5lP9_Wh_DaM',
        address1: '13 Market Street',
        address2: undefined,
        city: 'Wilmington',
        state: 'North Carolina',
        country: 'United States',
        postalCode: '28401'
      })
    });

    it ('rejects if placeId does not exists', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: 'INVALID_PLACE_ID',
        key: GOOGLE_API_KEY
      })
      .reply(
        200, {
          status: "INVALID_REQUEST"
        },
        {'Content-Type': 'application/json; charset=UTF-8'}
      );



      await expect(
        client.fetchLocation('INVALID_PLACE_ID')
      ).rejects.toBeDefined();

    });

    it ('returns a location where most of the data is missing', async () => {
      nock(GOOGLE_URL, {
        encodedQueryParams: true
      })
      .get('/maps/api/place/details/json')
      .query({
        placeid: PLACE_ID,
        key: GOOGLE_API_KEY,
      })
      .reply( 200, {
        result: {
          address_components: [],
        }
      }, {'Content-Type': 'application/json; charset=UTF-8'})

    const location = await client.fetchLocation(PLACE_ID);
    expect(location).toMatchObject({
      latitude: undefined,
      longitude: undefined,
      placeId: PLACE_ID,
      address1: undefined,
      address2: undefined,
      city: undefined,
      state: undefined,
      country: undefined,
      postalCode: undefined,
    });
   });

   it ('rejects on a non HTTP 2XX response status', async () => {
    nock(GOOGLE_URL, {
      encodedQueryParams: true
    })
    .get('/maps/api/place/details/json')
    .query({
      placeid: PLACE_ID,
      key: GOOGLE_API_KEY,
    })
    .reply( 401, {
      result: {
        status: "INVALID"
      }
    }, {'Content-Type': 'application/json; charset=UTF-8'})

    await expect(
      client.fetchLocation(PLACE_ID)
    ).rejects.toBeDefined();
   });

   it ('rejects on an HTTP Error', async () => {
    nock(GOOGLE_URL, {
      encodedQueryParams: true
    })
    .get('/maps/api/place/details/json')
    .query({
      placeid: PLACE_ID,
      key: GOOGLE_API_KEY,
    })
    .replyWithError('Error');

    client.fetchLocation(PLACE_ID)
    .catch((error) => {
      expect(error).toBe('Error')
    })




   })
  })
})

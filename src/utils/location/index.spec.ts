import { now } from 'lodash';
import { PLACE_ID } from '../../../test/helpers/const';

import { FETCH_RETENTION_INTERVAL, shouldLocationBeFetched, reproducibleLocationId } from './index'
import { Location } from '../../data/location/model';

describe('#LocationUtilsIndex', () => {

  describe('#shouldLocationBeFetched', () => {
    it('false-y location', () => {
      expect(shouldLocationBeFetched(null)).toBe(true);
      expect(shouldLocationBeFetched(undefined)).toBe(true);
    });

    it('location exists', () => {
      const location = Object.assign(new Location(), {
        placeId: PLACE_ID,
      });
      expect(shouldLocationBeFetched(location)).toBe(true);

      location.fetchedAt = new Date(now())
      expect(shouldLocationBeFetched(location)).toBe(false);

    });

    it('location entry is a week old', () => {
      const location = Object.assign(new Location(), {
        placeId: PLACE_ID,
        fetchedAt: new Date(now() - (FETCH_RETENTION_INTERVAL + 1))
      });

      expect(shouldLocationBeFetched(location)).toBe(true);
    });
  });

  describe('#createReproducibleId', () => {
    it('creates a reproducible ID from a placeId', () => {
      const modelA = Object.assign(new Location(), {
        placeId: PLACE_ID,
      });
      const modelB = Object.assign(new Location(), {
        placeId: PLACE_ID,
      });
      expect(reproducibleLocationId(modelA.placeId)).toBe(reproducibleLocationId(modelB.placeId));

      // different seed data
      const modelC = Object.assign(new Location(), {
        placeId: "GhIJQWDl0CIeQUARxks3icF8U8A",
      });
      expect(reproducibleLocationId(modelA.placeId)).not.toBe(reproducibleLocationId(modelC.placeId));
    });

    it('has minimum requirements', () => {
      expect(() => {
        return reproducibleLocationId("");
      }).toThrow(/insufficient data/);

      expect(() => {
        return reproducibleLocationId(Object.assign(new Location(), {
          placeId: PLACE_ID,
        }).placeId)
      }).not.toThrow();

    });
  });
})

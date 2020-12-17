import {
  federatedUserById,
  federatedEventById,
  federatedPhotoById,
  federatedVideoById,
} from './federated.types';

const MODEL_ID = 'MODEL_ID';


describe('graphql/federated.types', () => {
  describe('federatedUserById', () => {
    it('returns a Federated Photo reference', () => {
      expect(federatedUserById(MODEL_ID)).toEqual({
        __typename: 'User',
        id: MODEL_ID,
      });
    });

    it('requires an id', () => {
      expect(federatedUserById(null)).toBeNull();
      expect(federatedUserById(undefined)).toBeNull();
    });
  });

  describe('federatedEventById', () => {
    it('returns a Federated Photo reference', () => {
      expect(federatedEventById(MODEL_ID)).toEqual({
        __typename: 'Event',
        id: MODEL_ID,
      });
    });

    it('requires an id', () => {
      expect(federatedEventById(null)).toBeNull();
      expect(federatedEventById(undefined)).toBeNull();
    });
  });

  describe('federatedPhotoById', () => {
    it('returns a Federated Photo reference', () => {
      expect(federatedPhotoById(MODEL_ID)).toEqual({
        __typename: 'Photo',
        id: MODEL_ID,
      });
    });

    it('requires an id', () => {
      expect(federatedPhotoById(null)).toBeNull();
      expect(federatedPhotoById(undefined)).toBeNull();
    });
  });

  describe('federatedUserById', () => {
    it('returns a Federated Photo reference', () => {
      expect(federatedUserById(MODEL_ID)).toEqual({
        __typename: 'User',
        id: MODEL_ID,
      });
    });

    it('requires an id', () => {
      expect(federatedUserById(null)).toBeNull();
      expect(federatedUserById(undefined)).toBeNull();
    });
  });

  describe('federatedVideoById', () => {
    it('returns a Federated Photo reference', () => {
      expect(federatedVideoById(MODEL_ID)).toEqual({
        __typename: 'Video',
        id: MODEL_ID,
      });
    });

    it('requires an id', () => {
      expect(federatedVideoById(null)).toBeNull();
      expect(federatedVideoById(undefined)).toBeNull();
    });
  });
});

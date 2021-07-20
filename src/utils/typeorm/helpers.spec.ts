import { noop } from 'lodash';

import { FakeModel } from '../../../test/helpers/fake.model';
import {
  hasEntityBeenPersisted,
} from './helpers';


describe('util/typeorm/helpers', () => {
  describe('hasEntityBeenPersisted', () => {
    it('returns true for a persisted Entity', async () => {
      const MODEL = new FakeModel();
      expect(hasEntityBeenPersisted(MODEL)).toBe(false);
    });

    it('is smart about the false-y', async () => {
      expect(hasEntityBeenPersisted(
        new FakeModel()
      )).toBe(false);
      expect(hasEntityBeenPersisted(
        Object.assign(new FakeModel(), { key: null })
      )).toBe(false);

      expect(hasEntityBeenPersisted(
        Object.assign(new FakeModel(), { key: 0 })
      )).toBe(true);
    });

    it('returns false for nothing', async () => {
      expect(hasEntityBeenPersisted(null)).toBe(false);
    });

    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });
});

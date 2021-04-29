import supertest, { SuperTest, Test } from 'supertest';

import {
  Server,
} from '../../src/server/server';


describe('Server', () => {
  let client: SuperTest<Test>;


  describe('GET /healthy', () => {
    it('has a standard handler', async () => {
      const server = new Server({
        useDefaultMiddleware: false, // KISS
      });
      client = supertest(server.app);

      await client.get('/healthy')
      .expect(200, 'OK');
    });

    it('accepts a custom handler', async () => {
      const server = new Server({
        useDefaultMiddleware: false, // KISS
        healthyHandler: (_, res) => {
          res.sendStatus(418);
        },
      });
      client = supertest(server.app);

      await client.get('/healthy')
      .expect(418, `I'm a teapot`);
    });
  });


  describe('GET /alive', () => {
    it('has a standard handler', async () => {
      const server = new Server({
        useDefaultMiddleware: false, // KISS
      });
      client = supertest(server.app);

      await client.get('/alive')
      .expect(200, 'OK');
    });

    it('accepts a custom handler', async () => {
      const server = new Server({
        useDefaultMiddleware: false, // KISS
        aliveHandler: (_, res) => {
          res.sendStatus(418);
        },
      });
      client = supertest(server.app);

      await client.get('/alive')
      .expect(418, `I'm a teapot`);
    });
  });
});

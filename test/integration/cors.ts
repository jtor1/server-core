import supertest, { SuperTest, Test } from 'supertest';
import express, { RequestHandler } from 'express';

import {
  corsMiddleware,
} from '../../src/middleware/cors';


const _204: RequestHandler = (req, res) => {
  res.status(204).send();
}


describe('corsMiddleware', () => {
  let client: SuperTest<Test>;


  describe('for GET', () => {
    beforeEach(async () => {
      const app = express();
      app.get('/', corsMiddleware, _204);
      // app.options('/', middleware, _204);

      client = supertest(app);
    });

    it('assumes wildcard access (sigh)', async () => {
      await client.get('/')
      .expect(204)
      .expect((res) => {
        expect(res.headers['origin']).toBeUndefined();

        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
        });
      });
    });

    it('grants wildcard access to a blank Origin (sigh)', async () => {
      await client.get('/')
      .set('origin', '')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
        });
      });
    });

    it('echoes the Origin (sigh)', async () => {
      await client.get('/')
      .set('origin', 'DERP.com')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'DERP.com',
        });
      });
    });

    it('does the things that `cors` does', async () => {
      await client.get('/')
      .set('origin', 'DERP.com')
      .set('access-control-request-headers', 'Content-Type, X-DERP')
      .set('access-control-allow-credentials', 'include')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'DERP.com',
        });
      });
    });
  });


  describe('for OPTIONS', () => {
    beforeEach(async () => {
      const app = express();
      app.options('/', corsMiddleware, _204);

      client = supertest(app);
    });

    it('assumes wildcard access (sigh)', async () => {
      await client.options('/')
      .expect(204)
      .expect((res) => {
        expect(res.headers['origin']).toBeUndefined();

        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-origin': '*',
          'access-control-max-age': '86400',
        });
      });
    });

    it('grants wildcard access to a blank Origin (sigh)', async () => {
      await client.options('/')
      .set('origin', '')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-origin': '*',
          'access-control-max-age': '86400',
        });
      });
    });

    it('echoes the Origin (sigh)', async () => {
      await client.options('/')
      .set('origin', 'DERP.com')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-origin': 'DERP.com',
          'access-control-max-age': '86400',
        });
      });
    });

    it('does the things that `cors` does', async () => {
      await client.options('/')
      .set('origin', 'DERP.com')
      .set('access-control-request-headers', 'Content-Type, X-DERP')
      .set('access-control-allow-credentials', 'include')
      .expect(204)
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'Content-Type, X-DERP',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-origin': 'DERP.com',
          'access-control-max-age': '86400',
        });
      });
    });
  });
});

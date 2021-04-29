import supertest, { SuperTest, Test } from 'supertest';
import express, { RequestHandler } from 'express';

import {
  corsMiddleware,
} from '../../src/middleware/cors';


describe('corsMiddleware', () => {
  let client: SuperTest<Test>;


  describe('for GET', () => {
    beforeEach(async () => {
      const app = express();
      app.get('/', corsMiddleware, (req, res) => {
        res.status(200).send('RESPONSE');
      });

      client = supertest(app);
    });

    it('assumes wildcard access (sigh)', async () => {
      await client.get('/')
      .expect(200, 'RESPONSE')
      .expect((res) => {
        expect(res.headers['origin']).toBeUndefined();

        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
        });
        expect(res.headers['cache-control']).toBeUndefined();
      });
    });

    it('grants wildcard access to a blank Origin (sigh)', async () => {
      await client.get('/')
      .set('origin', '')
      .expect(200, 'RESPONSE')
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
        });
        expect(res.headers['cache-control']).toBeUndefined();
      });
    });

    it('echoes the Origin (sigh)', async () => {
      await client.get('/')
      .set('origin', 'DERP.com')
      .expect(200, 'RESPONSE')
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'DERP.com',
        });
        expect(res.headers['cache-control']).toBeUndefined();
      });
    });

    it('does the things that `cors` does', async () => {
      await client.get('/')
      .set('origin', 'DERP.com')
      .set('access-control-request-headers', 'Content-Type, X-DERP')
      .set('access-control-allow-credentials', 'include')
      .expect(200, 'RESPONSE')
      .expect((res) => {
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'DERP.com',
        });
        expect(res.headers['cache-control']).toBeUndefined();
      });
    });
  });


  describe('for OPTIONS', () => {
    const _RESPOND: RequestHandler =

    beforeEach(async () => {
      const app = express();
      app.options('/', corsMiddleware, () => {
        // `cors` should never allow us to get this far
        throw new Error('UNREACHED');
      });

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
          'cache-control': 's-maxage=86400',
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
          'cache-control': 's-maxage=86400',
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
          'cache-control': 's-maxage=86400',
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
console.log(JSON.stringify(res.headers))
        expect(res.headers).toMatchObject({
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'Content-Type, X-DERP',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-origin': 'DERP.com',
          'access-control-max-age': '86400',
          'cache-control': 's-maxage=86400',
        });
      });
    });
  });
});

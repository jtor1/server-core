import 'jest';
import * as TypeMoq from 'typemoq';
import nock from 'nock';
import { createRequest } from 'node-mocks-http';
import { gql } from 'apollo-server';
import { Cache } from 'cache-manager';
import jwt from 'jsonwebtoken';
import {
  TELEMETRY_HEADER_HOSTNAME,
  TELEMETRY_HEADER_PERSON_ID,
  TELEMETRY_HEADER_REQUEST_ID,
  Telemetry,
} from '@withjoy/telemetry';

import { NO_USER, NO_TOKEN } from '../authentication/token.check';
import {
  Context,
  createContext,

  logContextRequest,
} from './apollo.context';

const IDENTITY_URL = 'http://IDENTITY_URL';
const JWT_PAYLOAD = {
  payload: 'IGNORED', // ... for now
};
const TOKEN = jwt.sign(JWT_PAYLOAD, '__secret__', { // IRL, it's a parseable token
  audience: '__secret__', // does not get exposed
  expiresIn: 1, // second
  subject: 'AUTH0_ID',
});
const CACHE_KEY = `server-core/identity/${ TOKEN }`;
const USER_ID = 'USER_ID';
const LOCALE = 'LOCALE';
const ME_FRAGMENT = Object.freeze({
  id: 'ME_ID',
});
const CACHE = (<unknown>Object.freeze({}) as Cache);

const OTHER_TOKEN = 'OTHER_TOKEN';
const OTHER_CACHE_KEY = `server-core/identity/${ OTHER_TOKEN }`;


describe('server/apollo.context', () => {
  let context: Context;

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.isDone();
    nock.cleanAll();
    nock.enableNetConnect();
  });


  describe('Context', () => {
    describe('given constructor args', () => {
      it('populates an instance', () => {
        const req = createRequest();

        context = new Context({
          req,
          token: TOKEN,
          userId: USER_ID,
          identityUrl: IDENTITY_URL,
          identityCache: CACHE,
          identityCacheTtl: 23,
          locale: LOCALE,
        });

        expect(context.req).toBe(req);
        expect(context.token).toBe(TOKEN);
        expect(context.userId).toBe(USER_ID);
        expect(context.locale).toBe(LOCALE);

        expect(context.identityUrl).toBe(IDENTITY_URL);
        expect(context.identityCache).toBe(CACHE);
        expect(context.identityCacheTtl).toBe(23);
        expect(context.identityCacheEnabled).toBe(true);

        expect(context.telemetry).toBeDefined();
        expect(context.currentUser).toBeUndefined();
      });

      it('inherits missing args from the request', () => {
        context = new Context({
          req: createRequest({
            token: 'REQ_TOKEN',
            userId: 'REQ_USER_ID',
          }),
          // no `token`
          // no `userId`
          // no `identityCache`
          // no `identityCacheTtl`
          identityUrl: IDENTITY_URL,
          locale: LOCALE,
        });

        expect(context.token).toBe('REQ_TOKEN');
        expect(context.userId).toBe('REQ_USER_ID');
      });

      it('derives a token from the request headers', () => {
        context = new Context({
          req: createRequest({
            headers: {
              authorization: 'Bearer AUTH_TOKEN',
            },
          }),
          // no `token`
          // no `userId`
          identityUrl: IDENTITY_URL,
          locale: LOCALE,
        });

        expect(context.token).toBe('AUTH_TOKEN');
        expect(context.userId).toBe(NO_USER);
      });

      it('can be asked to operate without a Cache', () => {
        context = new Context({
          identityCache: null,
        });

        expect(context.identityCache).toBeNull();
        expect(context.identityCacheTtl).toBe(300);
        expect(context.identityCacheEnabled).toBe(false);
      });

      it('assumes a Telemetry context when the request does not provide headers', () => {
        context = new Context({});

        expect(context.telemetry.context()).toEqual({
          hostname: expect.any(String),
          requestId: expect.any(String),
          req: {
            token: NO_TOKEN,
            userId: NO_USER,
            jwt: null,
          },
        });
      });

      it('derives a Telemetry context from the request headers', () => {
        context = new Context({
          req: createRequest({
            headers: {
              [ TELEMETRY_HEADER_HOSTNAME ]: 'HOSTNAME',
              [ TELEMETRY_HEADER_PERSON_ID ]: 'PERSON_ID',
              [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
            },
          }),
          token: TOKEN,
          userId: USER_ID,
          identityUrl: IDENTITY_URL,
          locale: LOCALE,
        });

        const telemetryContext = context.telemetry.context();
        expect(telemetryContext).toEqual({
          hostname: expect.any(String),
          personId: 'PERSON_ID',
          requestId: 'REQUEST_ID',
          req: {
            token: TOKEN,
            userId: USER_ID,

            // it('decodes a well-formed JWT token payload')
            jwt: {
              exp: expect.any(Number),
              iat: expect.any(Number),
              sub: 'AUTH0_ID',

              // and nothing from JWT_PAYLOAD ... for now
            },
          },
        });

        expect(telemetryContext.hostname).not.toBe('HOSTNAME'); // Server-generated vs. derived
      });
    });

    describe('without any constructor args', () => {
      beforeEach(() => {
        context = new Context();
      });

      it('populates an instance', () => {
        expect(context.req).toBeUndefined();
        expect(context.token).toBe(NO_TOKEN);
        expect(context.userId).toBe(NO_USER);
        expect(context.locale).toBe('en_US');

        expect(context.identityUrl).toBeUndefined();
        expect(context.identityCache).not.toBeNull();
        expect( Reflect.get(context.identityCache!, 'store').name ).toBe('memory');
        expect(context.identityCacheTtl).toBe(300);
        expect(context.identityCacheEnabled).toBe(true);

        expect(context.telemetry).toBeDefined();
        expect(context.currentUser).toBeUndefined();
      });

      it('assumes a Telemetry context', () => {
        expect(context.telemetry.context()).toEqual({
          hostname: expect.any(String),
          requestId: expect.any(String),
          req: {
            token: NO_TOKEN,
            userId: NO_USER,
            jwt: null,
          },
        });
      });
    });

    it('can be used as its own constructor args', () => {
      const USER = { user: 'CURRENT' };
      const req = createRequest({
        headers: {
          [ TELEMETRY_HEADER_HOSTNAME ]: 'HOSTNAME',
          [ TELEMETRY_HEADER_PERSON_ID ]: 'PERSON_ID',
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
        },
      });
      const args = new Context({
        req,
        token: TOKEN,
        userId: USER_ID,
        identityUrl: IDENTITY_URL,
        identityCache: CACHE,
        identityCacheTtl: 23,
        locale: LOCALE,
      });

      // not directly mutable
      Reflect.set(args, '_currentUser', USER);
      expect(args.currentUser).toBe(USER);

      context = new Context(args);

      expect(context.req).toBe(req);
      expect(context.token).toBe(TOKEN);
      expect(context.userId).toBe(USER_ID);
      expect(context.locale).toBe(LOCALE);

      expect(context.identityUrl).toBe(IDENTITY_URL);
      expect(context.identityCache).toBe(CACHE);
      expect(context.identityCacheTtl).toBe(23);
      expect(context.identityCacheEnabled).toBe(true);

      // it derives the same Telemetry context into a new instance
      const { telemetry } = context;
      expect(telemetry).not.toBe(args.telemetry);
      expect(telemetry.context()).toEqual(args.telemetry.context());

      // it('does not copy over everything')
      expect(context.currentUser).toBeUndefined();
    });
  });


  describe('createContext', () => {
    const existingContext = new Context();

    it('returns the Context passed to it', () => {
      expect( createContext(existingContext) ).toBe(existingContext);
    });

    it('constructs a fresh default Context', () => {
      context = createContext(existingContext);

      expect(context).toBeInstanceOf(Context);

      expect(context.req).toBeUndefined();
      expect(context.token).toBe(NO_TOKEN);
      expect(context.userId).toBe(NO_USER);
      expect(context.locale).toBe('en_US');

      expect(context.identityUrl).toBeUndefined();
      expect(context.identityCache).not.toBeNull();
      expect( Reflect.get(context.identityCache!, 'store').name ).toBe('memory');
      expect(context.identityCacheTtl).toBe(300);
      expect(context.identityCacheEnabled).toBe(true);

      expect(context.telemetry).toBeDefined();
      expect(context.currentUser).toBeUndefined();
    });
  });


  describe('#me', () => {
    beforeEach(async () => {
      context = new Context({
        req: createRequest(),
        token: TOKEN,
        identityUrl: IDENTITY_URL,
      });

      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
      expect(context.identityCacheEnabled).toBe(true);

      // nothing is cached
      expect( await context.identityCache!.get(CACHE_KEY) ).toBe(undefined);
    });

    afterEach(async () => {
      // restore the singleton
      const identityCache = context.identityCache!;

      if (identityCache) {
        await Promise.all([
          identityCache.del(CACHE_KEY),
          identityCache.del(OTHER_CACHE_KEY),
        ]);
      }
    });


    it('identifies the User via cache', async () => {
      await context.identityCache!.set(CACHE_KEY, ME_FRAGMENT, { ttl: 31 });

      await context.me();

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual(ME_FRAGMENT);
    });

    it('specifies the User cache TTL', async () => {
      const identityCacheMock = TypeMoq.Mock.ofType<Cache>();
      context = new Context({
        ...context,

        token: TOKEN,
        identityCache: identityCacheMock.object,
        identityCacheTtl: 23,
      });

      identityCacheMock.setup((mocked) => mocked.wrap(
        CACHE_KEY,
        TypeMoq.It.isAny(),
        TypeMoq.It.isObjectWith({ ttl: 23 })
      ))
      .verifiable(TypeMoq.Times.exactly(1));

      await context.me();

      identityCacheMock.verifyAll();
    });

    it('identifies the User via the `identity_service`', async () => {
      // @see fetchIdentityUser
      nock(IDENTITY_URL)
      .post('/')
      .reply(200, {
        data: {
          me: ME_FRAGMENT,
        },
      });

      await context.me();

      // it('caches the fetched result')
      expect( await context.identityCache!.get(CACHE_KEY) ).toEqual(ME_FRAGMENT);

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual(ME_FRAGMENT);
    });

    it('bypasses the cache', async () => {
      context = new Context({
        req: createRequest(),
        token: TOKEN,
        identityUrl: IDENTITY_URL,
        identityCache: null,
      });

      // @see fetchIdentityUser
      nock(IDENTITY_URL)
      .post('/')
      .reply(200, {
        data: {
          me: ME_FRAGMENT,
        },
      });

      await context.me();

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual(ME_FRAGMENT);
    });

    it('does nothing when there is no data', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(200, {});

      await context.me();

      // it('will not cache nothing')
      expect( await context.identityCache!.get(CACHE_KEY) ).toBeUndefined();

      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
    });

    it('does nothing upon Error', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(401);

      await context.me();

      // it('will not cache nothing')
      expect( await context.identityCache!.get(CACHE_KEY) ).toBeUndefined();

      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
    });

    it('allows for overrides', async () => {
      nock(IDENTITY_URL)
      .post('/')
      .reply(200, {
        data: {
          me: ME_FRAGMENT,
        },
      });

      await context.me({
        token: OTHER_TOKEN,
        headers: { 'x-joy-custom': 'CUSTOM_HEADER' },
      });

      expect( await context.identityCache!.get(CACHE_KEY) ).toBeUndefined();
      expect( await context.identityCache!.get(OTHER_CACHE_KEY) ).toEqual(ME_FRAGMENT);

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual(ME_FRAGMENT);
    });
  });


  describe('#fetchIdentityUser', () => {
    beforeEach(() => {
      context = new Context({
        req: createRequest({
          headers: {
            [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
          },
        }),
        token: TOKEN,
        identityUrl: IDENTITY_URL,
      });
    });

    afterEach(() => {
      // it('does not mutate Context state)
      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
    });


    it('identifies the User by token', async () => {
      nock(IDENTITY_URL, {
        reqheaders: {
          // it('authorizes with the Context token')
          authorization: TOKEN,

          // it('passes along Telemetry headers')
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
        },
      })
      .post('/', (body: any) => {
        expect( gql`${ body.query }` ).toMatchObject({
          definitions: [
            {
              kind: 'FragmentDefinition',
              name: {
                value: 'UserFragment',
              },
            },
            {
              operation: 'query',
              name: {
                value: "GetMe"
              },
              selectionSet: {
                selections: [
                  {
                    name: {
                      // the { query }
                      value: 'me',
                    },
                    arguments: [],
                    selectionSet: {
                      selections: [
                        {
                          name: {
                            value: 'UserFragment',
                          },
                        }
                      ]
                    }
                  },
                ],
              },
              variableDefinitions: [],
            },
          ],
        });

        return true; // yep, that's what we're looking for
      })
      .reply(200, {
        data: {
          me: ME_FRAGMENT,
        },
      });

      const meFragment = await context.fetchIdentityUser();
      // expect(meFragment).toEqual(ME_FRAGMENT);
    });

    it('does nothing when there is no data', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(200, {});

      const meFragment = await context.fetchIdentityUser();
      expect(meFragment).toBeUndefined();
    });

    it('does nothing upon Error', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(401);

      const meFragment = await context.fetchIdentityUser();
      expect(meFragment).toBeUndefined();
    });

    it('allows for overrides', async () => {
      nock(IDENTITY_URL, {
        reqheaders: {
          authorization: OTHER_TOKEN,
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
          'x-joy-custom': 'CUSTOM_HEADER',
        },
      })
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(200, {
        data: {
          me: ME_FRAGMENT,
        },
      });

      const meFragment = await context.fetchIdentityUser({
        token: OTHER_TOKEN,
        headers: { 'x-joy-custom': 'CUSTOM_HEADER' },
      });
      expect(meFragment).toEqual(ME_FRAGMENT);
    });
  });


  describe('logContextRequest', () => {
    let telemetryMock: TypeMoq.IMock<Telemetry>;

    beforeEach(() => {
      telemetryMock = TypeMoq.Mock.ofType(Telemetry);
    });
    afterEach(() => {
      telemetryMock.verifyAll();
    });

    it('logs a GraphQL request', () => {
      const query = `
        fragment Ignored on SomeType {
          id
        }
        query DEFINITION_1 {
          selection_1A(param: "value") {
            property
          }
          selection_1B
        }
        mutation DEFINITION_2 {
          selection_2A(param: "value") {
            property
          }
        }
      `;

      context = new Context({
        req: createRequest({
          method: 'POST',
          url: 'http://HOSTNAME/PATH',
          body: { query },
        }),
        token: TOKEN,
        userId: USER_ID,
      });
      Reflect.set(context, 'telemetry', telemetryMock.object);

      telemetryMock.setup((mocked) => mocked.info('logContextRequest', {
        source: 'apollo',
        action: 'request',
        req: { // deep-merged into Telemetry context
          method: 'POST',
          path: '/PATH',
        },
        graphql: {
          operations: [
            {
              definitionName: 'DEFINITION_1',
              operation: 'query',
              selectionName: 'selection_1A',
            },
            {
              definitionName: 'DEFINITION_1',
              operation: 'query',
              selectionName: 'selection_1B',
            },
            {
              definitionName: 'DEFINITION_2',
              operation: 'mutation',
              selectionName: 'selection_2A',
            },
          ],
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      logContextRequest(context);
    });

    it('logs a REST-y GET request', () => {
      context = new Context({
        req: createRequest({
          method: 'GET',
          url: 'http://HOSTNAME/PATH',
          query: { param: true },
        }),
        token: TOKEN,
        userId: USER_ID,
      });
      Reflect.set(context, 'telemetry', telemetryMock.object);

      telemetryMock.setup((mocked) => mocked.info('logContextRequest', {
        source: 'apollo',
        action: 'request',
        req: {
          method: 'GET',
          path: '/PATH',
        },
        graphql: {
          operations: [],
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      logContextRequest(context);
    });

    it('logs a REST-y POST request', () => {
      context = new Context({
        req: createRequest({
          method: 'POST',
          url: 'http://HOSTNAME/PATH',
          body: { param: true },
        }),
        token: TOKEN,
        userId: USER_ID,
      });
      Reflect.set(context, 'telemetry', telemetryMock.object);

      telemetryMock.setup((mocked) => mocked.info('logContextRequest', {
        source: 'apollo',
        action: 'request',
        req: {
          method: 'POST',
          path: '/PATH',
        },
        graphql: {
          operations: [],
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      logContextRequest(context);
    });

    it('does not log without a request', () => {
      context = new Context({
        token: TOKEN,
        userId: USER_ID,
      });
      Reflect.set(context, 'telemetry', telemetryMock.object);

      telemetryMock.setup((mocked) => mocked.info('logContextRequest', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.never());

      logContextRequest(context);
    });
  });
});

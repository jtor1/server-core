import 'jest';
import * as TypeMoq from 'typemoq';
import nock from 'nock';
import { createRequest } from 'node-mocks-http';
import { DocumentNode } from 'graphql';
import { gql } from 'apollo-server';
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
const TOKEN = 'TOKEN';
const USER_ID = 'USER_ID';
const LOCALE = 'LOCALE';
const HEADERS = Object.freeze({
  'x-joy-header': 'X-JOY-HEADER',
});


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
          locale: LOCALE,
        });

        expect(context.req).toBe(req);
        expect(context.token).toBe(TOKEN);
        expect(context.userId).toBe(USER_ID);
        expect(context.identityUrl).toBe(IDENTITY_URL);
        expect(context.locale).toBe(LOCALE);

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

      it('assumes a Telemetry context when the request does not provide headers', () => {
        expect(context.telemetry.context()).toEqual({
          hostname: expect.any(String),
          requestId: expect.any(String),
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
        expect(context.telemetry.context()).toEqual({
          hostname: expect.any(String),
          personId: 'PERSON_ID',
          requestId: 'REQUEST_ID',
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
        expect(context.identityUrl).toBeUndefined();
        expect(context.locale).toBe('en_US');

        expect(context.telemetry).toBeDefined();
        expect(context.currentUser).toBeUndefined();
      });

      it('assumes a Telemetry context', () => {
        expect(context.telemetry.context()).toEqual({
          hostname: expect.any(String),
          requestId: expect.any(String),
        });
      });
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
      expect(context.identityUrl).toBeUndefined();
      expect(context.locale).toBe('en_US');

      expect(context.telemetry).toBeDefined();
      expect(context.currentUser).toBeUndefined();
    });
  });


  describe('#me', () => {
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
          me: {
            id: 'ME_ID',
          },
        },
      });

      await context.me();

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual({
        id: 'ME_ID',
      });
    });

    it('does nothing when there is no data', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(200, {});

      await context.me();

      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
    });

    it('does nothing upon Error', async () => {
      nock(IDENTITY_URL)
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(401);

      await context.me();

      expect(context.userId).toBe(NO_USER);
      expect(context.currentUser).toBeUndefined();
    });

    it('allows for overrides', async () => {
      nock(IDENTITY_URL, {
        reqheaders: {
          authorization: 'CUSTOM_TOKEN',
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
          'x-joy-custom': 'CUSTOM_HEADER',
        },
      })
      .post('/', (body: any) => body.query.match(/GetMe/))
      .reply(200, {
        data: {
          me: {
            id: 'ME_ID',
          },
        },
      });

      await context.me({
        token: 'CUSTOM_TOKEN',
        headers: { 'x-joy-custom': 'CUSTOM_HEADER' },
      });

      expect(context.userId).toBe('ME_ID');
      expect(context.currentUser).toEqual({
        id: 'ME_ID',
      });
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
        source: 'express',
        action: 'request',
        req: {
          method: 'POST',
          path: '/PATH',
          token: TOKEN,
          userId: USER_ID,
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
        source: 'express',
        action: 'request',
        req: {
          method: 'GET',
          path: '/PATH',
          token: TOKEN,
          userId: USER_ID,
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
        source: 'express',
        action: 'request',
        req: {
          method: 'POST',
          path: '/PATH',
          token: TOKEN,
          userId: USER_ID,
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

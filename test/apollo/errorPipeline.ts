import * as TypeMoq from 'typemoq';
import { gql } from 'apollo-server-core';
import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { Telemetry } from '@withjoy/telemetry';

import { testSetupApollo } from '../helpers/apollo';

// not an "enrichedError"
const BOOM = Object.assign(new Error('BOOM'), {
  stack: 'STACK', // for reproducibility
});


describe('the GraphQL Color TypeDefs', () => {
  let client: { query: Function };


  it('logs an Error', async () => {
    // @see similar technique in 'src/server/apollo.errorPipeline.spec.ts'
    const telemetryMock = TypeMoq.Mock.ofType(Telemetry);
    const telemetryError = Telemetry.prototype.error;
    Telemetry.prototype.error = telemetryMock.object.error.bind(telemetryMock.object);

    telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', {
      source: 'apollo',
      action: 'error',
      error: {
        message: 'BOOM',
        name: 'GraphQLError',
        code: undefined, // ¯\_(ツ)_/¯
        stack: 'STACK',
      },
    }))
    .verifiable(TypeMoq.Times.exactly(1));

    const setup = await testSetupApollo({
      typeDefs: [
        gql`
          type Query {
            BOOM: Boolean!
          }
        `,
      ],
      resolvers: {
        Query: {
          BOOM: (): boolean => {
            throw BOOM;
          },
        },
      },
    });
    client = setup.client;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          BOOM
        }
      `
    });

    expect(res).toMatchObject({
      data: null,
      errors: [
        {
          message: 'BOOM',
        },
      ],
    });

    // @see similar technique in 'src/server/apollo.errorPipeline.spec.ts'
    //   although we don't need to use Reflect here
    telemetryMock.verifyAll();
    Telemetry.prototype.error = telemetryError;
  });


  it('invokes ErrorRequestHandler middleware', async () => {
    let called = false;
    function handler(err: Error, req: Request, res: Response, next: NextFunction) {
      expect(err.message).toBe('BOOM');
      expect(req).toBeTruthy();
      expect(res).toBeTruthy();

      res.status(200).send('OK');
      called = true;
      next(err);
    }

    const setup = await testSetupApollo({
      typeDefs: [
        gql`
          type Query {
            BOOM: Boolean!
          }
        `,
      ],
      resolvers: {
        Query: {
          BOOM: (): boolean => {
            throw BOOM;
          },
        },
      },
      options: {
        errorRequestHandlers: [ handler ],
      },
    });
    client = setup.client;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          BOOM
        }
      `
    });

    expect(res).toMatchObject({
      data: null,
      errors: [
        {
          message: 'BOOM',
        },
      ],
    });

    expect(called).toBe(true);
  });
});

import * as TypeMoq from 'typemoq';
import { gql } from 'apollo-server-core';
import { Telemetry } from '@withjoy/telemetry';

import { testSetupApollo } from '../helpers/apollo';


describe('the GraphQL Color TypeDefs', () => {
  let client: { query: Function };
  let telemetryMock: TypeMoq.IMock<Telemetry>;
  let telemetryError: Function;

  beforeEach(() => {
    telemetryMock = TypeMoq.Mock.ofType(Telemetry);

    // @see similar technique in 'src/server/apollo.errorPipeline.spec.ts'
    telemetryError = Telemetry.prototype.error;
    Telemetry.prototype.error = telemetryMock.object.error.bind(telemetryMock.object);
  });

  afterEach(() => {
    telemetryMock.verifyAll();

    // @see similar technique in 'src/server/apollo.errorPipeline.spec.ts'
    Reflect.set(Telemetry.prototype, 'error', telemetryError);
  });


  it('logs an Error', async () => {
    telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', {
      source: 'apollo',
      action: 'error',
      error: {
        message: 'BOOM',
        name: 'GraphQLError',
        code: undefined, // ¯\_(ツ)_/¯
        stack: 'BOOM STACK',
      },
    }))
    .verifiable(TypeMoq.Times.exactly(1));

    // not an "enrichedError"
    const BOOM = Object.assign(new Error('BOOM'), {
      stack: 'BOOM STACK',
    });
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
  });
});

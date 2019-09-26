import 'jest';
import assert from 'assert';
import nock from 'nock';
import { DocumentNode } from 'graphql';
import { gql } from 'apollo-server';

import {
  callService,
  ServiceCaller,
} from './interservice.communication';

const SERVICE_URL = 'https://SERVICE_URL';
const TOKEN = 'TOKEN';
const VARIABLE = 'VARIABLE';
const PROPERTY = 'PRECIOUS';  // "my property!!!"
const TEST_QUERY: DocumentNode = gql`
  query ($variable: String!) {
    queryMethod(argument: $variable) {
      property
    }
  }
`;
interface TestOutput {
  property: string;
};
interface TestCall {
  queryMethod: TestOutput | null;
};
interface TestVariables {
  variable: string;
};


describe('graphql/interservice.communication', () => {
  describe('callService', () => {
    it.todo('needs to be tested');
  });


  describe('ServiceCaller', () => {
    const OPTIONS = {
      serviceUrl: SERVICE_URL,
      query: TEST_QUERY,
    };
    const ARGS = {
      token: TOKEN,
      variables: { variable: VARIABLE },
    };
    let serviceCaller: ServiceCaller<TestOutput, TestCall, TestVariables>;

    beforeEach(() => {
      // nock.recorder.rec({
      //   enable_reqheaders_recording: true,
      //   output_objects: true,
      // });

      nock.disableNetConnect();

      serviceCaller = new ServiceCaller<TestOutput, TestCall, TestVariables>(OPTIONS);
    });

    afterEach(() => {
      // nock.restore();

      nock.isDone();
      nock.cleanAll();
      nock.enableNetConnect();
    });


    describe('constructor', () => {
      it('sets properties on the instance', () => {
        expect(serviceCaller.options).toBe(OPTIONS);
      });
    });


    describe('#fetch', () => {
      it('returns the FetchResult from a successful execution', async () => {
        nock(SERVICE_URL, {
          // it('provides the token for authorization')
          reqheaders: {
            authorization: TOKEN,
          },
        })
        .post('/', (body: any) => {
          // it('conveys the GraphQL query')
          expect( gql`${ body.query }` ).toMatchObject({
            definitions: [
              {
                operation: 'query',
                selectionSet: {
                  selections: [
                    {
                      name: {
                        // the { query }
                        value: 'queryMethod',
                      },
                      arguments: [
                        // its arguments
                        {
                          name: {
                            value: 'argument',
                          },
                          value: {
                            // ... as a variable
                            kind: 'Variable',
                            name: {
                              value: 'variable',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                variableDefinitions: [
                  // variables conveying argument values
                  {
                    variable: {
                      name: {
                        value: 'variable',
                      },
                    },
                  },
                ],
              },
            ],
          });

          // it('conveys the variables')
          expect(body.variables).toEqual({
            variable: VARIABLE,
          });

          return true; // yep, that's what we're looking for
        })
        .reply(200, {
          data: {
            queryMethod: {
              property: PROPERTY,
            },
          },
        });

        const output = await serviceCaller.fetch(ARGS);
        expect(output).toEqual({
          data: {
            queryMethod: {
              property: PROPERTY,
            },
          },
        });
      });


      it.todo('handles a bad HTTP response');
      it.todo('handles an HTTP failure');
      it.todo('handles a GraphQL error');
      it.todo('handles multiple selection sets');
      it.todo('does not require variables');
      it.todo('does not require complex output');
    });


    describe('#execute', () => {
      it('returns the output from a successful execution', async () => {
        nock(SERVICE_URL, {
          // it('provides the token for authorization')
          reqheaders: {
            authorization: TOKEN,
          },
        })
        .post('/', (body: any) => {
          // it('conveys the GraphQL query')
          expect( gql`${ body.query }` ).toMatchObject({
            definitions: [
              {
                operation: 'query',
                selectionSet: {
                  selections: [
                    {
                      name: {
                        // the { query }
                        value: 'queryMethod',
                      },
                      arguments: [
                        // its arguments
                        {
                          name: {
                            value: 'argument',
                          },
                          value: {
                            // ... as a variable
                            kind: 'Variable',
                            name: {
                              value: 'variable',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                variableDefinitions: [
                  // variables conveying argument values
                  {
                    variable: {
                      name: {
                        value: 'variable',
                      },
                    },
                  },
                ],
              },
            ],
          });

          // it('conveys the variables')
          expect(body.variables).toEqual({
            variable: VARIABLE,
          });

          return true; // yep, that's what we're looking for
        })
        .reply(200, {
          data: {
            queryMethod: {
              property: PROPERTY,
            },
          },
        });

        const output = await serviceCaller.execute(ARGS);
        expect(output).toEqual({
          property: PROPERTY,
        });
      });

      it('returns null from a successful execution', async () => {
        nock(SERVICE_URL)
        .post('/')
        .reply(200, {
          data: {
            queryMethod: null,
          },
        });

        const output = await serviceCaller.execute(ARGS);
        expect(output).toBeNull();
      });


      it('fails without nock', async () => {
        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/Nock: Disallowed net connect/);
      });

      it('fails on a bad HTTP response', async () => {
        nock(SERVICE_URL)
        .post('/')
        .reply(401);

        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/Unexpected end of JSON input/);
      });

      it('fails on HTTP failure', async () => {
        nock(SERVICE_URL)
        .post('/')
        .replyWithError(new Error('BOOM'));

        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/failed, reason: BOOM/);
      });

      it('fails without any data', async () => {
        nock(SERVICE_URL)
        .post('/')
        .reply(200, {});

        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/Server response was missing/);
      });

      it('fails without any output', async () => {
        nock(SERVICE_URL)
        .post('/')
        .reply(200, {
          data: {},
        });

        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/no output was received/);
      });

      it('fails if it receives a GraphQL error', async () => {
        const FETCH_RESULT = {
          data: {
            queryMethod: {
              property: PROPERTY,
            },
          },
          errors: [
            {
              message: 'BOOM',
            },
          ],
        };
        nock(SERVICE_URL)
        .post('/')
        .reply(200, FETCH_RESULT);

        try {
          await serviceCaller.execute(ARGS);
          assert.fail();
        }
        catch (err) {
          expect(err.message).toBe('BOOM');
          expect(err.fetchResult).toEqual(FETCH_RESULT);
        }
      });

      it('fails if it receives multiple GraphQL errors', async () => {
        const FETCH_RESULT = {
          errors: [
            {
              message: 'BOOM',
            },
            {
              message: 'KRAK',
            },
          ],
        };
        nock(SERVICE_URL)
        .post('/')
        .reply(200, FETCH_RESULT);

        try {
          await serviceCaller.execute(ARGS);
          assert.fail();
        }
        catch (err) {
          expect(err.message).toBe('BOOM (Error 1/2)');
          expect(err.fetchResult).toEqual(FETCH_RESULT);
        }
      });


      it('requires a single selection set', async () => {
        const QUERY: DocumentNode = gql`
          query ($variable: String!) {
            queryMethod(argument: $variable) {
              property
            }

            otherMethod {
              otherStuff
            }
          }
        `;
        serviceCaller = new ServiceCaller<TestOutput, TestCall, TestVariables>({
          serviceUrl: SERVICE_URL,
          query: QUERY,
        });

        await expect(
          serviceCaller.execute(ARGS)
        ).rejects.toThrow(/single selection set/);
      });

      it('does not require variables', async () => {
        const QUERY: DocumentNode = gql`
          query {
            queryMethod {
              property
            }
          }
        `;
        nock(SERVICE_URL)
        .post('/')
        .reply(200, {
          data: {
            queryMethod: {
              property: PROPERTY,
            },
          },
        });

        const serviceCallerNoVariables = new ServiceCaller<TestOutput, TestCall>({
          serviceUrl: SERVICE_URL,
          query: QUERY,
        });

        const output = await serviceCaller.execute({
          token: TOKEN,
        });
        expect(output).toEqual({
          property: PROPERTY,
        });
      });

      it('does not require complex output', async () => {
        const QUERY: DocumentNode = gql`
          query {
            queryMethod
          }
        `;
        interface Call {
          queryMethod: string | null;
        };

        nock(SERVICE_URL)
        .post('/')
        .reply(200, {
          data: {
            queryMethod: 'STRING',
          },
        });

        const serviceCallerNoVariables = new ServiceCaller<String, Call>({
          serviceUrl: SERVICE_URL,
          query: QUERY,
        });

        const output = await serviceCaller.execute(ARGS);
        expect(output).toEqual('STRING');
      });
    });
  });
});

import { get as getProperty } from 'lodash';
import fetch from 'node-fetch';
import { HttpLink } from 'apollo-link-http';
import { execute, FetchResult } from 'apollo-link';
import { DocumentNode } from 'graphql';
import { telemetry, deriveTelemetryContextFromError } from '@withjoy/telemetry';


export const callService = <Query, Variables = undefined>(
  // TODO:  `export interface ICallServiceOptions`
  serviceUrl: string,
  token: string,
  query: DocumentNode,
  variables?: Variables,
  headers?: Record<string, any>
): Promise<FetchResult<Query>> => {
  try {
    const apolloLink = new HttpLink({
      fetch: fetch as any,
      uri: serviceUrl
    });

    return new Promise((resolve, reject) => {
      if (!apolloLink) {
        reject(new Error('apollo link not instantiated'));
        return;
      }
      execute(apolloLink, {
        query,
        variables,
        context: {
          headers: {
            ...headers,
            authorization: token,
          },
        },
      }).subscribe({
        next: (data: FetchResult<Query>) => {
          resolve(data);
        },
        error: (err: any) => {
          // absorb & log vs. throw
          telemetry.error('callService', {
            ...deriveTelemetryContextFromError(err),
            serviceUrl,
            query,
            variables,
          });
          resolve();
        }
      })
    });
  } catch (err) {
    throw err;
  }
};


export interface IServiceCallerOptions<Query> {
  serviceUrl: string;
  query: DocumentNode;
}
export interface IServiceCallerArgs<Variables = undefined> {
  token: string;
  variables?: Variables;
  headers?: Record<string, any>;
}
export interface IServiceCallerError<Query> extends Error {
  fetchResult: FetchResult<Query>
};

export interface IServiceCallerOverrides {
  token?: string;
  headers?: Record<string, any>;
}


function _enrichError<Query>(error: Error, fetchResult: FetchResult<Query>): IServiceCallerError<Query> {
  const enrichedError = (<unknown>error as IServiceCallerError<Query>);
  enrichedError.fetchResult = fetchResult;
  return enrichedError;
}

function _deriveError<Query>(fetchResult: FetchResult<Query>): IServiceCallerError<Query> | undefined {
  const errors = getProperty(fetchResult, 'errors');
  if (! (Array.isArray(errors) && (errors.length !== 0))) {
    return undefined;
  }

  const errorCount = errors.length;
  const { message } = errors[0];
  const error = ((errorCount === 1)
    ? new Error(message)
    : new Error(`${ message } (Error 1/${ errorCount })`)
  );
  return _enrichError(error, fetchResult);
}

/**
 * ## Generics
 *
 * - `<Output>` = interface defining the shape of the query response
 * - `<Query>` = interface mapping the query method to its output shape
 * - `<Variables>` = *optional* interface defining the arguments passed to the query method
 *
 * For simple applied examples, see the Test Suite.
 *
 * ## Usage:
 *
 * ```
 * const serviceCaller = createServiceCaller<Output, Query, Variables>({
 *   serviceUrl: 'https://<GATEWAY>.withjoy.com/graphql',
 *   query: GQL_FOR_QUERY,
 * });
 *
 * const output = await serviceCaller.execute({
 *   token: AUTHENTICATION_TOKEN,
 *   variables: {
 *     argument: 'VALUE',
 *   },
 *   headers: {
 *     'x-joy-header': 'VALUE',
 *   },
 * });
 * ```
 */
export class ServiceCaller<Output, Query, Variables = undefined> {
  public readonly options: IServiceCallerOptions<Query>;

  constructor(options: IServiceCallerOptions<Query>) {
    this.options = options;
  }

  async fetch(args: IServiceCallerArgs<Variables>): Promise<FetchResult<Query>> {
    const { serviceUrl, query } = this.options;
    const { token, variables, headers } = args;

    return callService(serviceUrl, token, query, variables, headers);
  }

  /**
   * This method will throw / reject
   * - if anything fails during the call
   * - if the fetched result contains `{ errors }`
   *
   * It outputs / resolves the selection set of the first query;
   * if you need multiple outputs from a query, use #call to get back the full fetch result.
   */
  async execute(args: IServiceCallerArgs<Variables>): Promise<Output> {
    const { serviceUrl, query } = this.options;
    const { token, variables, headers } = args;

    const querySelections = getProperty(query, 'definitions.0.selectionSet.selections', []);
    if (! (Array.isArray(querySelections) && (querySelections.length === 1))) {
      throw new Error('ServiceCaller#execute: could not derive a single selection set from query');
    }
    const querySelectionName = querySelections[0].name.value;
    if (! querySelectionName) {
      throw new Error('ServiceCaller#execute: could not derive a single selection set from query');
    }

    const apolloLink = new HttpLink({
      fetch: fetch as any,
      uri: serviceUrl
    });
    if (! apolloLink) {
      throw new Error('ServiceCaller#execute: apollo link not instantiated');
    }

    return new Promise((resolve, reject) => {
      execute(apolloLink, {
        query,
        variables,
        context: {
          headers: {
            ...headers,
            authorization: token,
          },
        },
      })
      .subscribe({
        error: reject,

        next: (fetchResult: FetchResult<Query>) => {
          const err = _deriveError(fetchResult);
          if (err) {
            reject(err);
            return;
          }

          const output: Output = getProperty(fetchResult, `data.${ querySelectionName }`);
          if (output === undefined) {
            const error = _enrichError(new Error('ServiceCaller#execute: no output was received'), fetchResult);
            reject(error);
            return;
          }

          resolve(<Output>output);
        },
      });
    });
  }
}

export function createServiceCaller<Output, Query, Variables = undefined>(
  options: IServiceCallerOptions<Query>
): ServiceCaller<Output, Query, Variables> {
  return new ServiceCaller(options);
}


export interface IServiceCallerBuilder<Output, Query, Variables = undefined> {
  (args: IServiceCallerArgs<Variables>): IServiceCallerBuilderCaller<Output, Query, Variables>;
};
export interface IServiceCallerBuilderCaller<Output, Query, Variables = undefined> {
  fetch: () => Promise<FetchResult<Query>>;
  execute: () => Promise<Output>;
};

/**
 * A currying API for ServiceCaller.
 *
 * For simple applied examples, see the Test Suite.
 *
 * Usage:
 *
 * ```
 * const builder = serviceCallBuilder<Output, Query, Variables>({
 *   serviceUrl: 'https://<GATEWAY>.withjoy.com/graphql',
 *   query: GQL_FOR_QUERY,
 * });
 *
 * const caller = builder({
 *   token: AUTHENTICATION_TOKEN,
 *   variables: {
 *     argument: 'VALUE',
 *   },
 * });
 *
 * const output = await caller.execute();
 * ```
 */
export function serviceCallBuilder<Output, Query, Variables = undefined>(
  options: IServiceCallerOptions<Query>
): IServiceCallerBuilder<Output, Query, Variables> {
  return function(
    args: IServiceCallerArgs<Variables>
  ): IServiceCallerBuilderCaller<Output, Query, Variables> {
    const serviceCaller: ServiceCaller<Output, Query, Variables> = createServiceCaller(options);

    return Object.assign(serviceCaller, {
      fetch: serviceCaller.fetch.bind(serviceCaller, args),
      execute: serviceCaller.execute.bind(serviceCaller, args),
    });
  }
}

import fetch from 'node-fetch';
import { HttpLink } from 'apollo-link-http';
import { execute, FetchResult } from 'apollo-link';
import { DocumentNode } from 'graphql';

export const callService = <Query, Variables = undefined>(serviceUrl: string, token: string, query: DocumentNode, variables?: Variables): Promise<FetchResult<Query>> => {
  try {
    const apolloLink = new HttpLink({
      fetch: fetch as any,
      uri: serviceUrl
    });

    return new Promise((resolve, reject) => {
      if (apolloLink) {
        reject(new Error('apollo link not instantiated'));
        return;
      }
      execute(apolloLink, {
        query,
        variables,
        context: {
          headers: {
            authorization: token
          }
        }
      }).subscribe({
        next: (data: FetchResult<Query>) => {
          resolve(data);
        },
        error: (err: any) => {
          // TODO:  telemetry
          console.error(err);
          resolve();
        }
      })
    });
  } catch (err) {
    throw err;
  }
};

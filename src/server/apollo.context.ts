import gql from 'graphql-tag';
import fetch from 'node-fetch';
import { HttpLink, createHttpLink } from 'apollo-link-http';
import { execute, FetchResult } from 'apollo-link';
import { GetMe, UserFragment } from '../graphql/types';

const USER = gql`
  fragment UserFragment on User {
    id
    firstName
    lastName
  }
`;

const IDENTITY_ME = gql`
  ${USER}
  query GetMe {
    me {
      ...UserFragment
    }
  }
`;

export interface IContext {
  token: string;
  userId: string;
}

export class Context {

  private _userId: string;
  private _token: string;
  private _currentUser?: UserFragment;
  private apolloLink: HttpLink;
  
  constructor(token?: string, userId?: string, identityUrL?: string) {
    this._token = token ? token : 'no-token';
    this._userId = userId ? userId : 'no-user';
    if (identityUrL) {
      this.apolloLink = new HttpLink({
        fetch: fetch as any,
        uri: identityUrL
      });
    }
  }

  get token() {
    return this._token;
  }

  get userId() {
    return this._userId;
  }

  get currentUser() {
    return this._currentUser;
  }

  public async me() {
    return new Promise((resolve, reject, ) => {
      if (!this.apolloLink) {
        reject('apollo link no instantiated');
      }
      execute(this.apolloLink, { query: IDENTITY_ME, context: {
        headers: {
          authorization: this.token
        }
      }}).subscribe({
        next: (data: FetchResult<GetMe>) => {
          if (data.data && data.data.me) {
            this._currentUser = data.data.me;
            resolve();
          }
        },
        error: (error: any) => resolve()
      })
    });
  }
}

export const createContext = <T>(context?: T): T | Context => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}


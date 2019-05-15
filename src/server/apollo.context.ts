import gql from 'graphql-tag';
import fetch from 'node-fetch';
import { HttpLink } from 'apollo-link-http';
import { execute, FetchResult } from 'apollo-link';
import { GetMe, UserFragment } from '../graphql/types';

const USER = gql`
  fragment UserFragment on User {
    id
    firstName
    lastName
    superAdmin
    email
    aliases {
      id
      provider
      auth0
      firstName
      lastName
      email
    }
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
  currentUser: UserFragment | undefined;
  me: () => Promise<{}>;
}

export class Context implements IContext {

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

  public async me(query?: any) {
    return new Promise((resolve, reject) => {
      if (!this.apolloLink) {
        reject(new Error('apollo link not instantiated'));
        return;
      }
      execute(this.apolloLink, { query: query ? query : IDENTITY_ME, context: {
        headers: {
          authorization: this.token
        }
      }}).subscribe({
        next: (data: FetchResult<GetMe>) => {
          if (data.data && data.data.me) {
            this._currentUser = data.data.me;
            this._userId = data.data.me.id;
            resolve(data.data.me);
          } else {
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


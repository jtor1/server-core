import gql from 'graphql-tag';
import fetch from 'node-fetch';
import { HttpLink } from 'apollo-link-http';
import { execute, FetchResult } from 'apollo-link';
import { callService } from '../graphql/interservice.communication';
import { GetMe, UserFragment } from '../graphql/generated.typings';

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
  locale: string;
  currentUser: UserFragment | undefined;
  me: () => void;
}

export interface ContextConstructorArgs {
  token?: string;
  userId?: string;
  identityUrl?: string;
  locale?: string;
}

export class Context implements IContext {

  private _userId: string;
  private _token: string;
  private _currentUser?: UserFragment;
  private _identityUrl?: string;
  private _locale: string;

  constructor(args?: ContextConstructorArgs) {
    if (args) {
      const { token, userId, identityUrl, locale } = args;
      this._token = token ? token : 'no-token';
      this._userId = userId ? userId : 'no-user'
      this._identityUrl = identityUrl;
      this._locale = locale || 'en_US';
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

  get locale() {
    return this._locale;
  }

  public me = async () => {
    if (!this._identityUrl) {
      return;
    }
    try {
      const { data } = await callService<GetMe>(this._identityUrl, this.token, IDENTITY_ME)
      if (data && data.me) {
        this._currentUser = data.me;
        this._userId = data.me.id;
      }
    } catch (err) {
      console.error(err);
    }
  }
}

export const createContext = <T>(context?: T): T | Context => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}


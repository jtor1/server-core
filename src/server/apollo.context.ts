import { get as getProperty, pick } from 'lodash';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { Request } from 'express';
import { default as CacheManager, Cache } from 'cache-manager';
import {
  Telemetry,
  telemetry as telemetrySingleton,
  deriveTelemetryContextFromRequest,
  enrichTelemetryContext,
  deriveTelemetryContextFromError,
  deriveTelemetryHeadersFromContext,
} from '@withjoy/telemetry';

import {
  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
} from '../authentication/token.check';
import { decodeUnverifiedToken } from '../authentication/verify.token';
import { callService, IServiceCallerOverrides } from '../graphql/interservice.communication';
import { GetMe, UserFragment } from '../graphql/generated.typings';


const EMPTY_ARRAY = Object.freeze([]);
const SAFE_JWT_PROPERTIES = [
  'exp', // expires at
  'iat', // issued at
  'sub', // subject
  // everything else is secret-ish
];

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

// singleton Cache, across all Context instances
//   UserFragments are not expected to change very often
//   so we can assume a long-lived cache
const IDENTITY_CACHE_TTL: number = 5 * 60; // 5min
const IDENTITY_CACHE: Cache = CacheManager.caching({
  store: 'memory',
  ttl: IDENTITY_CACHE_TTL,
  max: 2048, // UserFragments? let's not go overboard with those
  isCacheableValue(value) {
    // keep looking until we find you -- you'll be there eventually
    return ((value !== undefined) && (value !== null));
  },
});


export function logContextRequest(context: Context): void {
  const req = context.req!;
  if (! req) {
    return;
  }

  const { telemetry, token, userId } = context;
  const { method, path, body } = req;

  const operations: Record<string, any>[] = [];
  if (method.toUpperCase() === 'POST') {
    let query: DocumentNode | undefined = undefined;
    try {
      // assuming there's a query *and* its value is parseable GraphQL
      query = gql`${ body.query }`;
    }
    catch (err) { }

    // a high-level sketch of the GraphQL request
    (getProperty(query, 'definitions') || EMPTY_ARRAY).forEach((definition: Record<string, any>): void => {
      const { operation } = definition;
      if ((operation !== 'query') && (operation !== 'mutation')) {
        return; // omit inline Fragments, etc.
      }

      const definitionName = getProperty(definition, 'name.value');

      (getProperty(definition, 'selectionSet.selections') || EMPTY_ARRAY).forEach((selection: Record<string, any>): void => {
        const selectionName = getProperty(selection, 'name.value');

        operations.push({
          definitionName,
          operation,
          selectionName,
        });
      });
    });
  }

  telemetry.info('logContextRequest', {
    source: 'apollo',
    action: 'request',
    req: { // merged into { req } subcontext
      method,
      path,
    },
    graphql: {
      operations,
    },
  });
}


export interface IContext {
  req: Request | undefined;
  token: string;
  userId: string;
  locale: string;
  identityUrl: string | undefined;
  identityCache: Cache | null;
  identityCacheTtl: number;
  currentUser: UserFragment | undefined;
  me: () => void;
}

export interface ContextConstructorArgs {
  req?: Request;
  token?: string;
  userId?: string;
  identityUrl?: string;
  identityCache?: Cache | null; // `null` to disable
  identityCacheTtl?: number;
  locale?: string;
}

export class Context
  implements IContext, ContextConstructorArgs // instances can be used as contructor args
{
  public readonly req: Request | undefined;
  public readonly telemetry: Telemetry;
  public readonly identityUrl: string | undefined;
  public readonly identityCache: Cache | null;
  public readonly identityCacheTtl: number;
  public readonly locale: string;

  private _userId: string;
  private _token: string;
  private _currentUser?: UserFragment;

  constructor(args?: ContextConstructorArgs) {
    this.telemetry = telemetrySingleton.clone();
    const telemetryContext = this.telemetry.context(); // to be mutated in-place

    // defaults
    this.identityCache = IDENTITY_CACHE;
    this.identityCacheTtl = IDENTITY_CACHE_TTL;
    this.locale = 'en_US';
    this._token = NO_TOKEN;
    this._userId = NO_USER;

    if (args) {
      const {
        req,
        token,
        userId,
        identityUrl,
        identityCache,
        identityCacheTtl,
        locale,
      } = args;
      const reqAsAny = (<any>req);

      this.req = req;
      this.locale = locale || this.locale;

      this.identityUrl = identityUrl;
      this.identityCache = ((identityCache === null)
        ? null // disabled
        : (identityCache || this.identityCache)
      );
      if (identityCacheTtl !== undefined) {
        this.identityCacheTtl = identityCacheTtl;
      }

      // TODO:  derive `locale`
      //   @mcorrigan: "a header in stitch service in the future"
      //   Accept-Language header, if present
      //   can we derive it from `context.currentUser`?

      // precedence
      //   (1) what we were given
      //   (2) what we can inherit or derive with minimum effort
      //   (3) defaults
      this._token = token || (reqAsAny && reqAsAny.token) || deriveTokenHeaderValue(req) || this._token;
      this._userId = userId || (reqAsAny && reqAsAny.userId) || this._userId;

      // enrich Telemetry from request headers
      Object.assign(telemetryContext, deriveTelemetryContextFromRequest(req));
    }

    enrichTelemetryContext(telemetryContext); // back-fill the rest

    // provide Telemetry introspection into live state;
    //   we have little control over how sub-Classes will mutate these values
    //   but they are critical for debugging.
    //   NOTE: Telemetry does a deep merge; { req: { foo } }
    const context = this;
    telemetryContext.req = {
      get token() { return context._token },
      get userId() { return context._userId },
      get jwt() {
        const decoded = decodeUnverifiedToken(context._token);
        return decoded && pick(decoded, SAFE_JWT_PROPERTIES);
      },
    };
  }


  get token() {
    return this._token;
  }

  get userId() {
    return this._userId;
  }

  get identityCacheEnabled(): Boolean {
    return (this.identityCache !== null);
  }

  get currentUser() {
    return this._currentUser;
  }


  public me = async (overrides?: IServiceCallerOverrides): Promise<void> => {
    const {
      identityCacheEnabled,
      identityCache,
      identityCacheTtl,
    } = this;

    let userFragment: UserFragment | undefined;
    if (! identityCacheEnabled) {
      userFragment = await this.fetchIdentityUser(overrides);
    }
    else {
      // thru the Cache
      const token = (overrides && overrides.token) || this.token;
      const cacheKey = `server-core/identity/${ token }`;

      userFragment = await identityCache!.wrap(
        cacheKey,
        () => this.fetchIdentityUser(overrides),
        // apparently you have to specify { ttl } every time for it to work properly,
        //   even if the Cache is pre-configured with a TTL
        { ttl: identityCacheTtl }
      );
    }
    if (! userFragment) {
      return;
    }

    // establish our state
    this._currentUser = userFragment;
    this._userId = userFragment.id;
  }

  public fetchIdentityUser = async (overrides?: IServiceCallerOverrides): Promise<UserFragment | undefined> => {
    const { identityUrl } = this;
    if (! identityUrl) {
      return undefined;
    }

    // pass along Telemetry headers
    const { telemetry } = this;
    const telemetryHeaders = deriveTelemetryHeadersFromContext(telemetry.context());

    const token = (overrides && overrides.token) || this.token;
    const headers = Object.assign(telemetryHeaders, (overrides && overrides.headers));

    try {
      const result = await callService<GetMe>(
        identityUrl,
        token,
        IDENTITY_ME,
        undefined, // no variables
        headers
      );
      if (! result) {
        throw new Error('received empty result from Service');
      }

      const { data } = result;
      if (data && data.me) {
        return data.me;
      }
    }
    catch (err) {
      telemetry.error('Context#me', {
        ...deriveTelemetryContextFromError(err),
        identityUrl,
        token,
      });
    }

    return undefined;
  }
}

export const createContext = <T>(context?: T): T | Context => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}

import { VERSION } from './utils/const';
import {
  Context,
  IContext,
  ContextConstructorArgs,
  createContext,
  logContextRequest,
  injectContextIntoRequestMiddleware,
} from './server/apollo.context'
import {
  ApolloEnvironmentConfig,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,
} from './server/apollo.config'
import { IApolloServerArgs, createApolloServer } from './server/apollo.server'
import { IServer, Server } from './server/server'
import { initApp, shutdownCurrentApp } from './server/server.init';
import { RequestHandlerVariant } from './middleware/types';
import { bodyParserGraphql } from './middleware/body.parser';
import { DefaultMiddlewareResult, getDefaultMiddleware } from './middleware/defaults';
import {
  RequestWithSessionID,
  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
} from './middleware/session';
import {
  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
  tokenCheck,
} from './authentication/token.check';
import { TokenConfig, verifyAll } from './authentication/verify.token';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from './server/errors';

import { ControllerTemplate, ControllerTemplateWithContext } from './templates/controller.template';
import { ModelViewTemplate, ViewTemplate } from './templates/view.template';
import {
  MODEL_TEMPLATE_COMMON_PROPERTIES,
  ModelTemplate,
  ModelTemplateClass,
} from './templates/model.template';
import {
  coreResolvers,
  coreTypeDefs,
  CoreTypeDate,
  CoreTypeLocationInput,
  LocationInterface,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  formatCoreTypeDateTimestamp,
  parseCoreTypeInputDateAndTimezone,
  parseCoreTypeInputTimezone,
} from './graphql/core.types'
import {
  FederatedTypeReference,
  federatedUserById,
  federatedEventById,
  federatedPhotoById,
  federatedVideoById,
} from './graphql/federated.types'
import { loadDotEnv } from './utils/dotenv';
import { createGraphQLEnumValues } from './utils/graphql.enum';
import { EdgeWrapper, edgeWrapperType } from './utils/edge.wrapper';
import {
  NULL_STRING,
  isUUID,
  executeOperationsInParallel,
} from './utils/miscellaneous';
import { hasEntityBeenPersisted } from './utils/typeorm/helpers';
import { logTypeORMConfig } from './utils/typeorm/logging';
import {
  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,
} from './utils/virtualEvent';
import {
  callService,
  ServiceCaller,
  createServiceCaller,
  serviceCallBuilder,
} from './graphql/interservice.communication';
import encodeForFirebaseKey from './utils/encodeForFirebaseKey';
import {
  ModelDeltaType,
  IModelDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  shallowCloneDelta,
  mutateDelta,
  saveDelta,
  primaryModelOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,
} from './utils/delta';
import {
  IModelReorderPayload,
  IModelReorderNeighbors,
  IModelReorderBisection,
  reorderTypeDefs,
  deriveModelReorderNeighbors,
  bisectReorderModels,
} from './utils/reorder';
import { SortKeyProvider } from './utils/sortKey/provider';
import * as sortKeyBase64 from './utils/sortKey/base64';  // namespaced, vs. top-level
import * as sortKeyPaddedNumeric from './utils/sortKey/paddedNumeric';  // namespaced, vs. top-level
import {
  applyMixinClasses,
} from './utils/typescript';
import {
  shouldLocationBeFetched,
  reproducibleLocationId,
} from './utils/location';
import {
  LocationModelTemplate
} from './data/location/model';
import {
  GooglePlacesConfig,
  GooglePlacesClient,
  googlePlacesClient,
} from './data/location/googlePlacesClient';
import {
  LocationView,
  DecoratedLocationView,
} from './data/location/view';


export {
  VERSION,

  Context,
  IContext,
  ContextConstructorArgs,
  createContext,
  logContextRequest,
  injectContextIntoRequestMiddleware,

  ApolloEnvironmentConfig,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,

  IApolloServerArgs,
  createApolloServer,

  IServer,
  Server,
  initApp,
  shutdownCurrentApp,

  RequestHandlerVariant,
  DefaultMiddlewareResult,
  bodyParserGraphql,
  getDefaultMiddleware,

  RequestWithSessionID,
  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,

  ControllerTemplate,
  ControllerTemplateWithContext,
  MODEL_TEMPLATE_COMMON_PROPERTIES,
  ModelTemplate,
  ModelTemplateClass,
  ModelViewTemplate,
  ViewTemplate,

  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
  tokenCheck,

  TokenConfig,
  verifyAll,

  coreResolvers,
  coreTypeDefs,
  CoreTypeDate,
  CoreTypeLocationInput,
  LocationInterface,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  formatCoreTypeDateTimestamp,
  parseCoreTypeInputDateAndTimezone,
  parseCoreTypeInputTimezone,
  FederatedTypeReference,
  federatedUserById,
  federatedEventById,
  federatedPhotoById,
  federatedVideoById,
  createGraphQLEnumValues,

  loadDotEnv,

  EdgeWrapper,
  edgeWrapperType,

  NULL_STRING,
  isUUID,
  executeOperationsInParallel,

  // `import * as pg from '@withjoy/server-core/dist/utils/pg'`
  //   because TypeScript definitions can't be exported in a namespace

  // `import * as typeorm from '@withjoy/server-core/dist/utils/typeorm'`
  //   because TypeScript definitions can't be exported in a namespace
  hasEntityBeenPersisted,
  logTypeORMConfig,

  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,

  callService,
  ServiceCaller,
  createServiceCaller,
  serviceCallBuilder,

  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,

  ModelDeltaType,
  IModelDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  shallowCloneDelta,
  mutateDelta,
  saveDelta,
  primaryModelOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,

  IModelReorderPayload,
  IModelReorderNeighbors,
  IModelReorderBisection,
  reorderTypeDefs,
  deriveModelReorderNeighbors,
  bisectReorderModels,

  SortKeyProvider,
  sortKeyBase64,  // namespaced, vs. top-level
  sortKeyPaddedNumeric,  // namespaced, vs. top-level

  encodeForFirebaseKey,

  applyMixinClasses,

  shouldLocationBeFetched,
  reproducibleLocationId,
  GooglePlacesConfig,
  GooglePlacesClient,
  googlePlacesClient,

  LocationModelTemplate,
  LocationView,
  DecoratedLocationView,

};

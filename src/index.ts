import { Context, IContext, createContext } from './server/apollo.context'
import { IApolloServerArgs, createApolloServer } from './server/apollo.server'
import { IServer, Server } from './server/server'
import { initApp } from './server/server.init';
import {
  deriveTokenHeaderValue,
  tokenCheck,
} from './authentication/token.check';
import { TokenConfig, verifyAll } from './authentication/verify.token';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError
} from './server/errors';

import { ControllerTemplate } from './templates/controller.template';
import { EntityViewTemplate, ViewTemplate } from './templates/view.template';
import { ModelTemplate } from './templates/model.template';
import { coreResolvers, coreTypeDefs } from './graphql/core.types'
import { createGraphQLEnumValues } from './utils/graphql.enum';
import { EdgeWrapper, edgeWrapperType } from './utils/edge.wrapper';
import { callService } from './graphql/interservice.communication';
import encodeForFirebaseKey from './utils/encodeForFirebaseKey';
import {
  EntityDeltaType,
  IEntityDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  mutateDelta,
  saveDelta,
  primaryEntityOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,
} from './utils/delta';
import {
  IEntityReorderArgs,
  IEntityReorderNeighbors,
  IEntityReorderBisection,
  deriveEntityReorderNeighbors,
  bisectReorderEntities,
} from './utils/reorder';
import { SortKeyProvider } from './utils/sortKey/provider';
import * as sortKeyBase64 from './utils/sortKey/base64';
import * as sortKeyPaddedNumeric from './utils/sortKey/paddedNumeric';

export {
  Context,
  IContext,
  createContext,

  IApolloServerArgs,
  createApolloServer,

  IServer,
  Server,
  initApp,

  ControllerTemplate,
  ModelTemplate,
  EntityViewTemplate,
  ViewTemplate,

  deriveTokenHeaderValue,
  tokenCheck,

  TokenConfig,
  verifyAll,

  coreResolvers,
  coreTypeDefs,
  createGraphQLEnumValues,

  EdgeWrapper,
  edgeWrapperType,
  callService,

  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError,

  EntityDeltaType,
  IEntityDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  mutateDelta,
  saveDelta,
  primaryEntityOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,

  IEntityReorderArgs,
  IEntityReorderNeighbors,
  IEntityReorderBisection,
  deriveEntityReorderNeighbors,
  bisectReorderEntities,

  SortKeyProvider,
  sortKeyBase64,
  sortKeyPaddedNumeric,

  encodeForFirebaseKey
};

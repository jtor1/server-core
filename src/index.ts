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
import { createGraphQLEnumValues } from './utils/graphql.enum';
import { EdgeWrapper, edgeWrapperType } from './utils/edge.wrapper';
import encodeForFirebaseKey from './utils/encodeForFirebaseKey';
import { callService } from './graphql/interservice.communication';
import { coreResolvers, coreTypeDefs } from './graphql/core.types'

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
  createGraphQLEnumValues,
  EdgeWrapper,
  edgeWrapperType,
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError,
  encodeForFirebaseKey,
  callService,
  coreResolvers,
  coreTypeDefs
}

/* istanbul ignore file */
//   it('is covered in @withjoy/server-test-core, with a backing database', noop);

import { chunk, compact } from 'lodash';
import {
  getConnection,
  EntityManager,
  ObjectLiteral,
  QueryBuilder,
  SelectQueryBuilder,
} from 'typeorm';
// we also need some of their internal tools
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

import {
  hasEntityBeenPersisted,
} from './helpers';
import {
  ObjectLiteralClass,
  IQueryBuildersToDeleteManyToManyJunctionsByParentIdOptions,
  IQueryBuildersToInsertManyToManyJunctionOptions,
  IQueryBuilderToDeleteModelsByParentIdIOptions,
  applyDefaultEntityValues,
  injectSequenceKeysIntoModels,
  queryBuildersToDeleteManyToManyJunctionsByParentId,
  queryBuildersToInsertManyToManyJunctions,
  queryBuilderToDeleteModelById,
  queryBuilderToDeleteModelsByParentId,
  queryBuildersToForceKeysOfModels,
  queryBuilderToInsertModels,
  queryBuilderToDeleteModelsBySelectedIds,
} from './batch.support';
import {
  TARGET_LIST_BATCH_SIZE,
  pgQueryBuilderBatchStatement,
} from '../pg/index';


// maximum number of statements in a batched `FUNCTION`
//   failures => lockup
//   guessing; don't know the "real" limits
export const TYPEORM_POSTGRES_BATCH_SIZE = 512;


export type TypeORMPostgresBatchSelectQueryCompleter = (
  batch: TypeORMPostgresBatch,
  selectQueryBuilder: SelectQueryBuilder<ObjectLiteral>
) => SelectQueryBuilder<ObjectLiteral>;

export type TypeORMPostgresBatchOptions = {
  applyDefaultEntityValues?: boolean;
  batchSize?: number;
  connectionName?: string;
  forceKeysOnInsert?: boolean;
  injectSequenceKeysIntoModels?: boolean;
  isolationLevel?: IsolationLevel,
};

const _TYPEORM_POSTGRES_BATCH_DEFAULTS: Required<TypeORMPostgresBatchOptions> = {
  batchSize: TYPEORM_POSTGRES_BATCH_SIZE,
  connectionName: undefined!, // 'default'
  isolationLevel: 'REPEATABLE READ',

  // the following three settings are optimized for INSERTs;
  //   it allows the caller to assemble an entire in-memory Model graph
  //   and persist it in a consistent way in the Postgres DB.
  //   the Models get mutated with @Column default values & `key`s

  // make it appear as if TypeORM had given us fresh Models back
  //   (which is actually a in-memory mutation to the Models)
  applyDefaultEntityValues: true,
  // the Models to be INSERTed will be related by their in-memory Sequence Keys
  //   but Postgres goes off and allocates new ones anyways;
  //   enabling this option will force those row `key`s to their proper values
  forceKeysOnInsert: true,
  // allocate & inject Sequence Keys into the Models;
  //   we have reproducible IDs
  //   (UUIDs -- a secondary unique key)
  //   and cross-Service relationships are always by `id` (never by `key`)
  //   which ultimately means that our Postgres-generated Sequence Keys (`Model.key`) are disposable
  injectSequenceKeysIntoModels: true,
};


// an operation to accumulate QueryBuilders
export type TypeORMPostgresBatchOperation = (batch: TypeORMPostgresBatch) => QueryBuilder<ObjectLiteral>[];

interface _IWithOptions {
  prepend: boolean;
};


// NOTE:  making this Generic via <T = ObjectLiteral>,
//   or any other variant thereof
//   doesn't work, ultimately, because of private Junction Model classes
//   ¯\_ (ツ)_/¯
export class TypeORMPostgresBatch {
  public readonly options: Required<TypeORMPostgresBatchOptions>;
  private _insertedModelSet = new Set<ObjectLiteral>();
  private _operations = new Array<TypeORMPostgresBatchOperation>();

  constructor(
    options?: TypeORMPostgresBatchOptions
  ) {
    this.options = Object.assign({}, _TYPEORM_POSTGRES_BATCH_DEFAULTS, (options || {}));
  }

  get entityManager(): EntityManager {
    const { connectionName } = this.options;
    return getConnection(connectionName).manager;
  }

  private _addInsertedModels(models: ObjectLiteral[]): void {
    const { _insertedModelSet } = this;
    models.forEach((model) => _insertedModelSet.add(model));
  }


  // free-form operations
  //   the helper is *not* pre-built for UPDATEs and other SQL operations;
  //   the most common use case is for INSERTs and DELETEs of in-memory Model states.
  //   should you need to go out-of-bounds, use #withQueryBuilder (etc.)

  /**
   * Adds an operation to the queue.
   *
   * Operations are not asynchronous for a reason; don't be fetching things.
   * That goes against the whole idea of 'batching'; you should know the whole state up-front.
   * In general, be *very mindful* about custom operations.
   *
   * @param operation {QueryBuilder}
   * @param [options.prepend] {Boolean} prepend the operations; default = append
   * @returns {TypeORMPostgresBatch} this
   */
  withOperation(operation: TypeORMPostgresBatchOperation, options?: _IWithOptions): this {
    if (options?.prepend) {
      this._operations.unshift(operation);
    }
    else {
      this._operations.push(operation);
    }

    return this;
  }

  /**
   * Adds a QueryBuilder to the queued operations.
   *
   * @param queryBuilder {QueryBuilder}
   * @param [options.prepend] {Boolean} prepend the operations; default = append
   * @returns {TypeORMPostgresBatch} this
   */
  withQueryBuilder(queryBuilder: QueryBuilder<ObjectLiteral>, options?: _IWithOptions): this {
    return this.withOperation(() => ([ queryBuilder ]), options);
  }

  /**
   * Adds all operations from the batch provided to this batch.
   *
   * Caveats
   * - the INSERTed Models from the batch provided are also added to this batch
   * - the `options` of both batches are left unchanged,
   *   which means the providing batch's #execute behavior is *NOT* added
   *
   * @param batch {TypeORMPostgresBatch}
   * @param [options.prepend] {Boolean} prepend the operations; default = append
   * @returns {TypeORMPostgresBatch} this
   */
  withBatch(batch: TypeORMPostgresBatch, options?: _IWithOptions): this {
    const ours = this._operations;
    const theirs = batch._operations;

    this._addInsertedModels(Array.from(batch._insertedModelSet));
    this._operations = (options?.prepend
      ? theirs.concat(ours)
      : ours.concat(theirs)
    );

    return this;
  }


  // INSERT operations

  /**
   * Queue Models to be INSERTed within this scope of this batch.
   *
   * Caveats
   * - the INSERTed Models must all be of the same Class
   *
   * @param models {ObjectLiteral[]}
   * @returns {TypeORMPostgresBatch} this
   */
  insertModels(models: ObjectLiteral[]): this {
    this._addInsertedModels(models);

    return this.withOperation(() => {
      const { entityManager, options } = this;
      let qbs: QueryBuilder<ObjectLiteral>[] = [];

      const qbInsert = queryBuilderToInsertModels(entityManager, models);
      if (qbInsert) {
        qbs.push(qbInsert);
      }
      if (options.forceKeysOnInsert) {
        const forceKeys = queryBuildersToForceKeysOfModels(entityManager, models);
        qbs = qbs.concat(forceKeys);
      }

      return qbs;
    });
  }

  /**
   * Queue @ManyToMany Junctions to be INSERTed within this scope of this batch.
   *
   * Caveats
   * - the Models being Junctioned must exist at the time this operation is executed
   * - you can use #insertModels to INSERT those Models (beforehand) within this same batch
   *
   * @param models {ObjectLiteral[]}
   * @param options.childRelations {String[]} the names of the relations to be INSERTed
   * @returns {TypeORMPostgresBatch} this
   */
  insertManyToManyJunctions(
    models: ObjectLiteral[],
    options: IQueryBuildersToInsertManyToManyJunctionOptions<ObjectLiteral>
  ): this {
    // do not #_addInsertedModels;
    //   it's their @ManyToManys that are getting INSERTed, not themselves
    //   (or at least not here they aren't)

    return this.withOperation(() => {
      const { entityManager } = this;

      const qbs = queryBuildersToInsertManyToManyJunctions(entityManager, models, options);
      return qbs;
    });
  }


  // DELETE operations

  /**
   * DELETE Models by their `id`s.
   *
   * Caveats
   * - unlike #insertModels, the Models specified can be a mixed bag of Classes
   *
   * @param models {ObjectLiteral[]}
   * @returns {TypeORMPostgresBatch} this
   */
  deleteModelsById(models: ObjectLiteral[]): this {
    return this.withOperation(() => {
      const { entityManager } = this;

      const qbs = models.map((model) => queryBuilderToDeleteModelById(entityManager, model));
      return qbs;
    });
  }

  /**
   * DELETE Models by the `id`s returned by a QuerySelector.
   *
   * Caveats
   * - the `selectQueryCompleter` is invoked during the #execute process, vs. up-front
   * - the SelectQueryBuilder it received is initialized with `SELECT model.id from <ModelTableName> as model ... ;`
   *
   * @param Model {typeof ObjectLiteral} the type of Models to be deleted
   * @returns {TypeORMPostgresBatch} this
   */
  deleteModelsBySelectedIds(
    Model: ObjectLiteralClass<ObjectLiteral>,
    selectQueryCompleter: TypeORMPostgresBatchSelectQueryCompleter
  ): this {
    return this.withOperation(() => {
      const { entityManager } = this;

      // ensure the basics -- a SelectQueryBuilder on 'model' returning 'model.id'
      const incompleteSelector = entityManager.createQueryBuilder(Model, 'model').select('model.id');
      const completedSelector = selectQueryCompleter(this, incompleteSelector);

      const qb = queryBuilderToDeleteModelsBySelectedIds(entityManager, Model, completedSelector);
      return (qb ? [ qb ]: []);
    });
  }

  /**
   * DELETE Models related by the `id` of an Ancestor Model.
   *
   * Examples:
   * - Parent <= Child + delete Child
   *   ```
   *   {
   *     ancestorName: 'parent', // the Ancestor is Child's immediate parent
   *     ancestorModels: [ PARENT ],
   *   }
   *   ```
   * - Parent <= Child <= Pet <= Friend + delete Friend
   *   ```
   *   {
   *     ancestorRelations: [ 'pets', 'owner' ], // Friend => Pet => Child
   *     ancestorName: 'parent', // Child => Ancestor
   *     ancestorModels: [ PARENT ],
   *   }
   *   ```
   *
   * @param Model {typeof ObjectLiteral} the type of Models to be deleted
   * @param [options.ancestorRelations] {String[]} any parent relations to be traversed in reaching an Ancestor's immediate child
   * @param options.ancestorName {String} the name by which an Ancestor's child relates to its parent (the Ancestor)
   * @param options.ancestorModels {ObjectLiteral[]} the Ancestor Models
   * @returns {TypeORMPostgresBatch} this
   */
  deleteModelsByParentId(
    Model: ObjectLiteralClass<ObjectLiteral>,
    options: IQueryBuilderToDeleteModelsByParentIdIOptions<ObjectLiteral>
  ): this {
    return this.withOperation(() => {
      const { entityManager } = this;

      const qb = queryBuilderToDeleteModelsByParentId(entityManager, Model, options);
      return (qb ? [ qb ]: []);
    });
  }

  /**
   * DELETE Models related by the `id` of an Ancestor Model.
   *
   * Examples:
   * - Child <= Pet <=> Friend + delete Pet <=> Friends Junctions
   *   ```
   *   Pet,
   *   {
   *     childRelations: [ 'friends' ], // the Pet's Friends
   *     ancestorName: 'owner', // the Ancestor is Pet's immediate parent
   *     ancestorModels: [ CHILD ],
   *   }
   *   ```
   * - Parent <= Child <= Pet <=> Friend + delete Pet <=> Friends Junctions
   *   ```
   *   Pet,
   *   {
   *     childRelations: [ 'friends' ], // the Pet's Friends
   *     ancestorRelations: [ 'owner' ], // Pet => Child
   *     ancestorName: 'parent', // (immediate) Child => Ancestor
   *     ancestorModels: [ PARENT ],
   *   }
   *   ```
   *
   * @param Model {typeof ObjectLiteral} the type of the Model whose @ManyToMany relations should be deleted deleted
   * @param [options.childRelations] {String[]} the @ManyToMany relations to be deleted
   * @param [options.ancestorRelations] {String[]} @see #deleteModelsByParentId
   * @param options.ancestorName {String} @see #deleteModelsByParentId
   * @param options.ancestorModels {ObjectLiteral[]} @see #deleteModelsByParentId
   * @returns {TypeORMPostgresBatch} this
   */
  deleteManyToManyJunctionsByParentId(
    Model: ObjectLiteralClass<ObjectLiteral>,
    options: IQueryBuildersToDeleteManyToManyJunctionsByParentIdOptions<ObjectLiteral>
  ): this {
    return this.withOperation(() => {
      const { entityManager } = this;

      const qbs = queryBuildersToDeleteManyToManyJunctionsByParentId(entityManager, Model, options);
      return qbs;
    });
  }


  /**
   * Executes the accumulation of QueryBuilders, in batches,
   * as individual Postgres `FUNCTION` statements.
   *
   * @returns {Promise<void>}
   */
  async execute(): Promise<void> {
    const { options } = this;
    const insertedModels = Array.from(this._insertedModelSet);

    // all executed within a single Transaction
    await getConnection(options.connectionName)
    .transaction(options.isolationLevel, async (entityManager: EntityManager): Promise<void> => {
      // "Used only in transactional instances of EntityManager."
      const queryRunner = entityManager.queryRunner!;

      if (options.injectSequenceKeysIntoModels) {
        // missing Sequence Keys must be allocated & injected first;
        //   eg. populates the Model `key`s, so that they can all relate
        //   this is a mutating operation on all participating Models
        //   which have also been scope-captured into *other* queued operations
        // execute each batch serially
        const keylessModels = insertedModels.filter((model) => (! hasEntityBeenPersisted(model)));
        const sequenceKeyBatches = chunk(keylessModels, TARGET_LIST_BATCH_SIZE);
        for (let batch of sequenceKeyBatches) {
          await injectSequenceKeysIntoModels(entityManager, batch);
        }
      }

      // accumulate the QueryBuilders from each queued operation
      const queryBuilders: QueryBuilder<ObjectLiteral>[] = this._operations
      .map((operation) => operation(this)) // provide ourselves as a Context
      .flat();

      // execute each batch serially
      const queryBuilderBatches = chunk(compact(queryBuilders), options.batchSize);
      for (let batch of queryBuilderBatches) {
        // prouduce a Postgres `FUNCTION` statement
        //   from this batch of the accumulated QueryBuilders
        const { query, parameters } = pgQueryBuilderBatchStatement(batch);

        await queryRunner.query(query, parameters);
      }
    });

    if (options.applyDefaultEntityValues) {
      // make it appear as if TypeORM had given us fresh Models back
      //   eg. inject their default column / property values
      //   (which is an in-memory mutation on the Models).
      // defaults will appear on the Postgres side of things during persistence;
      //   however, we aren't getting any Models back from the batched `FUNCTION` operations,
      //   so in an INSERT-only scenario, we must do it ourselves
      applyDefaultEntityValues(insertedModels);
    }
  }
}


export function createTypeORMPostgresBatch(options?: TypeORMPostgresBatchOptions): TypeORMPostgresBatch {
  return new TypeORMPostgresBatch(options);
}

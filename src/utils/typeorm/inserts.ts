/* istanbul ignore file */
//   it('is covered in @withjoy/server-core-test, with a backing database', noop);

import {
  getConnection,
  getRepository,
  InsertQueryBuilder,
} from 'typeorm';
import { ReturningResultsEntityUpdator } from 'typeorm/query-builder/ReturningResultsEntityUpdator';

import { ModelTemplate, ModelTemplateClass } from '../../templates/model.template';


/**
 * This method provides Type convenience around our `ModelTemplate`s;
 *   there is nothing "special" about the returned QueryBuilder.
 *
 * The Models inserted by the InsertQueryBuilder returned from ths method
 *   can be obtained (in Typed fashion) through the use of `executeInsertQueryBuilderForModels`.
 *
 * @param models {ModelTemplate[]}
 * @returns {InsertQueryBuilder} a QueryBuilder which `INSERT`s all of the Models in one query
 */
export function insertQueryBuilderForModels<T extends ModelTemplate>(models: T[]): InsertQueryBuilder<T> {
  const Model = (<unknown>models[0].constructor as ModelTemplateClass<T>);
  return getRepository(Model).createQueryBuilder()
  .insert()
  .values(models as any /* QueryDeepPartialEntity<T> */);
}

/**
 * This method builds an InsertQueryBuilder which can be used by `executeInsertQueryBuilderForModels`,
 *   mostly for Type convenience ...
 *   there's nothing "special" about the returned QueryBuilder.
 *
 * CONFLICT handling is identical for each Model.
 *
 * @param models {ModelTemplate[]}
 * @param [options] {UpsertQueryBuilderOptions}
 * @returns {InsertQueryBuilder} a QueryBuilder which `INSERT ... ON CONFLICT`s all of the Models in one query
 */
export function upsertQueryBuilderForModels<T extends ModelTemplate>(
  models: T[],
  options?: UpsertQueryBuilderOptions<T>
): InsertQueryBuilder<T> {
  const insertQueryBuilder = insertQueryBuilderForModels(models);

  const Model = (<unknown>models[0].constructor as ModelTemplateClass<T>);
  return upsertForInsertQueryBuilder(Model, insertQueryBuilder, options);
}

type UpsertQueryBuilderOptions<T extends ModelTemplate> = {
  criteriaProperties?: Array<keyof T>;
};

/**
 * This method applies standard UPSERT semantics to an existing InsertQueryBuilder.
 *
 * By default, it assumes that the 'id' property is the single criteria for the UPSERT;
 *   *all other properties* will get UPDATE-d if the Model already exists by 'id'.
 *   Alternate criteria properties can be specified via options.
 *
 * @param Model {ModelTemplateClass} the Model Class, for metadata extraction purposes
 * @param queryBuilder {InsertQueryBuilder}
 * @param [options] {UpsertQueryBuilderOptions}
 * @returns {InsertQueryBuilder} `queryBuilder`, cloned, with support for `INSERT ... ON CONFLICT`
 */
export function upsertForInsertQueryBuilder<T extends ModelTemplate>(
  Model: ModelTemplateClass<T>,
  queryBuilder: InsertQueryBuilder<T>,
  options?: UpsertQueryBuilderOptions<T>
): InsertQueryBuilder<T> {
  const repository = getRepository(Model);
  const criteriaProperties = options?.criteriaProperties || [ 'id' ];
  const criteriaPropertySet = new Set(criteriaProperties);

  // default behavior;
  //   `id` is the constraining column
  //   all other columns are subject to UPSERT
  const nonCriteriaProperties = repository.metadata.columns
  .map((meta) => meta.databaseName)
  .filter((name) => ! criteriaPropertySet.has(name as keyof T));

  // https://www.postgresql.org/docs/10/sql-insert.html#SQL-ON-CONFLICT
  return queryBuilder.clone().orUpdate({
    conflict_target: (criteriaProperties as string[]),
    overwrite: nonCriteriaProperties,
  });
}

/**
 * This method isn't just about Typing;
 *   there's weirdness RE: what columns / properties come back from an INSERT;
 *   this method ensures that *all* @Entity properties are fetched into the returned Models.
 *
 * @param Model {ModelTemplateClass} the Model Class, for metadata extraction purposes
 * @param qb {InsertQueryBuilder}
 * @returns {Promise<ModelTemplate[]>} the Models produced during QueryBuilder execution,
 *   which are curiously hard to to derive without additional tooling
 */
export async function executeInsertQueryBuilderForModels<T extends ModelTemplate>(
  Model: ModelTemplateClass<T>,
  qb: InsertQueryBuilder<T>
): Promise<T[]> {
  // "what columns will TypeORM automatically return for us?"
  //   reverse-engineered from InsertQueryBuilder#execute
  //   and its use of `ReturningResultsEntityUpdator`
  const queryRunner = getConnection().createQueryRunner();
  const expressionMap = (<any>qb).expressionMap;
  const returningResultsEntityUpdator = new ReturningResultsEntityUpdator(queryRunner, expressionMap);
  const assumedColumns = returningResultsEntityUpdator.getInsertionReturningColumns();
  const assumedPropertyNames = new Set( assumedColumns.map((meta) => meta.propertyName) );

  // we want all the others, too
  const repository = getRepository(Model);
  const extraColumns = repository.metadata.columns
  .filter((meta) => (! assumedPropertyNames.has(meta.propertyName)))
  .map((meta) => meta.databaseName);

  const insertResult = await qb.clone().returning(extraColumns).execute();
  const models = insertResult.generatedMaps; // marshaled Entity representations
  return (<unknown>models as T[]);
}

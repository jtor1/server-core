/* istanbul ignore file */
//   it('is covered in @withjoy/server-test-core, with a backing database', noop);

const { prepareValue: pgPrepareValue } = require('pg/lib/utils');
import uuidV4 from 'uuid/v4';
import {
  isString,
  isDate,
} from 'lodash';
import {
  ObjectLiteral,
  QueryBuilder,
} from 'typeorm';


// do not call out more than this many targets (eg. columns) in any one `SELECT` statement
//   "error: target lists can have at most 1664 entries"
export const TARGET_LIST_BATCH_SIZE = 1024;


function _pgRegexpForParameterIndex(oneBasedIndex: number | string, flags?: string): RegExp {
  // eg. [15] => ' $16,'
  return new RegExp('(^|\\W)\\$' + oneBasedIndex + '(\\W|$)', flags);
}
function _pgRegexpReplacementValue(value: any): string {
  // restore the capture groups before & after the _pgRegexpForParameterIndex
  // ensure '$' escapement
  //   '$$$$' + .replace #1 below =>
  //   '$$' + .replace #2 using returned value =>
  //   a single '$'
  // calling _pgEscapeAndQuoteString is *not* our job
  return `$1${ value.replace(/\$/g, '$$$$') }$2`;
}
function _pgEscapeAndQuoteString(value: string) {
  const escaped = value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/'/g, `\\'`)
  .replace(/\$/g, `\\$`); // "Dollar-Quoted String Constants"

  // 'E' prefix => "String Constants with C-Style Escapes"
  //   https://www.postgresql.org/docs/current/sql-syntax-lexical.html
  return `E'${escaped}'`;
}


interface IPgStatement {
  query: string,
  parameters: any[],
};

export function pgInlineParametersIntoQuery<T extends ObjectLiteral>(
  queryBuilder: QueryBuilder<T>
): string {
  const [ query, parameters ] = queryBuilder.getQueryAndParameters();

  // perform batch (vs. in-place) substitution;
  //   let's say parameter #0 is the String 'a $2 sandwich';
  //   that'd mean substituting '$1' with 'a $2 sandwich'
  //   then, we'd go to process parameter #1 ...
  //   if we'd done in-place substitution, we'd mess up parameter #0's value
  //   and the '$2' placeholder would remain unchanged
  //   (KABOOM !!!1!)
  const parts = new Array((parameters.length * 2) + 1);
  const regexp = _pgRegexpForParameterIndex('[0-9]+', 'g'); // all numeric parameters, globally
  let lastOffset = 0;

  // iterate through all numeric parameters
  query.replace(regexp, (match: string, prefixCapture: string, suffixCapture: string, offset: number): string => {
    const matchLength = match.length;
    const prefixLength = prefixCapture.length;
    const suffixLength = suffixCapture.length;

    // exclude the parameter name's leading '$'
    const matchParameterIndex = match.substring(prefixLength + 1, (matchLength - suffixLength));
    const oneBasedIndex = parseInt(matchParameterIndex, 10);
    const partsIndex = 2 * (oneBasedIndex - 1); // (2 * N) + 1
    parts[partsIndex] = query.substring(lastOffset, offset + prefixLength);

    // PL/pgSQL-safe String escapement
    const parameterValue = parameters[oneBasedIndex - 1];
    let safeValue = pgPrepareValue(parameterValue);
    if (isString(parameterValue) || isDate(parameterValue)) {
      safeValue = _pgEscapeAndQuoteString(safeValue);
    }
    else if (parameterValue === null) {
      // avoid 'QueryFailedError: syntax error at or near ","'
      //   eg. 'INSERT INTO "foo"("string", "nullable", "numeric") VALUES ('S', , 23);'
      safeValue = 'NULL';
    }
    parts[partsIndex + 1] = safeValue;

    // bring along the suffix with the next pass
    lastOffset = offset + (matchLength - suffixLength);

    return match; // no substitution needed
  });

  // everything remaining
  parts[parts.length - 1] = query.substring(lastOffset);

  const inlined = parts.join('');
  return inlined;
}

export function pgDeriveQueryBuilderStatements<T extends ObjectLiteral>(
  queryBuilders: Array<QueryBuilder<T>>
): IPgStatement[] {
  return queryBuilders.map((queryBuilder): IPgStatement => {
    const [ query, parameters ] = queryBuilder.getQueryAndParameters();
    return { query, parameters };
  });
}

export function pgCombineStatements(statements: IPgStatement[]): IPgStatement {
  // first, renumber the parameter indexes in all the queries
  //   eg. 8th query from `VALUES (DEFAULT, $1, $2)` => `VALUES (DEFAULT, $15, $16)`
  let combinedParameters: any[] = []; // <= and we get this for free

  const queries = statements.map(({ query, parameters }): string => {
    const parametersCount = parameters.length;
    const combinedCount = combinedParameters.length;
    let combinedQuery = query;

    for (let parameterIndex = parametersCount - 1; parameterIndex >= 0; --parameterIndex) {
      const oneBasedIndex = (parameterIndex + 1);
      const combinedIndex = oneBasedIndex + combinedCount;
      const regexp = _pgRegexpForParameterIndex(oneBasedIndex);
      const replacement = _pgRegexpReplacementValue('$' + combinedIndex);
      combinedQuery = combinedQuery.replace(regexp, replacement);
    }

    combinedParameters = combinedParameters.concat(parameters);
    return combinedQuery;
  });

  // https://stackoverflow.com/questions/33014119/inserting-multiple-commands-into-prepared-statement-rails
  // https://www.postgresql.org/docs/current/queries-with.html
  const withs = queries.map((query, index) => `with_${ index } AS (${ query } RETURNING *)`);
  const combinedQuery = `WITH ${ withs.join(', ') } SELECT 1 AS ok`;
  // // TODO:  return combined results
  // const selects = queries.map((query, index) => `* FROM with_${ index } AS with_${ index }`);
  // const combinedQuery = `WITH ${ withs.join(', ') } SELECT ${ selects.join(', ') }`;

  return {
    query: combinedQuery,
    parameters: combinedParameters,
  };
}

interface IOptionsBatchStatement {
  queryId: string
};
export function pgQueryBuilderBatchStatement<T extends ObjectLiteral>(
  queryBuilders: Array<QueryBuilder<T>>,
  options?: IOptionsBatchStatement
): IPgStatement {
  const queryiesInlined = queryBuilders.map(pgInlineParametersIntoQuery);
  const queryId = (
    (options && options.queryId) ||
    uuidV4().replace(/-/g, '') // name-safe & unique enough
  );
  const queryName = `func_${ queryId }`;

  // features
  //   self-deleting
  //   readably-intented
  // fun learnings
  //   PREPARE'd statement can take untyped variables (eg. $1, $2), but can only do *one* operation (FAIL)
  //   PREPARE'd statement can execute a WITH statement,
  //     but a WITH statement does *not* ensure ordering of its subqueries (FAIL)
  //   EXECUTE with a String arg does not seem possible outside of a FUNCTION (or PROCEDURE) (FAIL)
  //   cannot use `CREATE PROCEDURE`; not supported in our version of Postgres
  //     https://www.postgresql.org/docs/current/sql-createprocedure.html
  //   so, we build, upload and execute a one-off FUNCTION that has all the smarts baked in
  const query = `
CREATE FUNCTION ${ queryName }() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DROP FUNCTION IF EXISTS ${ queryName };
  ${ queryiesInlined.join(';\n  ') };
END
$$;
SELECT ${ queryName }() AS ok;
  `.trim();

  return {
    query,
    parameters: [], // we inlined 'em all
  };
}

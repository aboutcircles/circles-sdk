import { Cursor } from './cursor';
import { Row } from './row';

export interface PagedQueryResult<TRow extends Row> {
  /**
   * The number of results that were requested.
   */
  limit: number;
  /**
   * The number of results that were returned.
   */
  size: number;

  /**
   * If the query returned results, this will be the cursor for the first result.
   */
  firstCursor?: Cursor;
  /**
   * If the query returned results, this will be the cursor for the last result.
   */
  lastCursor?: Cursor;
  /**
   * The sort order of the results.
   */
  sortOrder: 'ASC' | 'DESC';

  /**
   * The results of the query.
   */
  results: TRow[];
}
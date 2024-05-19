import { Namespace, Table } from '../rpcSchema/namespaces';
import { SortOrder } from '../rpcSchema/sortOrder';
import { Filter } from '../rpcSchema/filter';

export interface PagedQueryParams {
  /**
   * The namespace of the table to query.
   */
  namespace: Namespace;
  /**
   * The name of the table to query.
   */
  table: Table;
  /**
   * The order to sort the results.
   */
  sortOrder: SortOrder;
  /**
   * The columns to return in the results or an empty array to return all columns.
   */
  columns: string[];
  /**
   * The filters to apply to the query.
   */
  filter?: Filter[];
  /**
   * The number of results to return.
   */
  limit: number;
}
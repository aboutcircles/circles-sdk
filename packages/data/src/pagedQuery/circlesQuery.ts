import { PagedQueryParams } from './pagedQueryParams';
import { Cursor } from './cursor';
import { CirclesQueryParams } from '../rpcSchema/circlesQueryParams';
import { JsonRpcResponse } from '../rpcSchema/jsonRpcResponse';
import { Filter } from '../rpcSchema/filter';
import { Order } from '../rpcSchema/order';
import { PagedQueryResult } from './pagedQueryResult';
import { EventRow } from './eventRow';
import { CirclesQueryRpcResult, CirclesRpc } from '../circlesRpc';

export class CalculatedColumn {
  constructor(public readonly name: string
    , public readonly generator: (row: any) => any) {
  }
}

/**
 * A class for querying Circles RPC nodes with pagination.
 * The class maintains the state of the current page and provides methods for querying the next pages.
 *
 * Usage:
 * 1. Create a new instance of CirclesQuery with the CirclesRpc instance and the query parameters.
 * 2. Call queryNextPage() to get the next page of results.
 * 3. Access the results and cursors from the currentPage property.
 * 4. Repeat step 2 until there are no more results.
 *
 * @typeParam TRow The type of the rows returned by the query.
 */
export class CirclesQuery<TRow extends EventRow> {
  private readonly params: PagedQueryParams;
  private readonly rpc: CirclesRpc;

  /**
   * The current page of the query (or undefined).
   */
  get currentPage(): PagedQueryResult<TRow> | undefined {
    return this._currentPage;
  }

  private _currentPage?: PagedQueryResult<TRow>;

  private _calculatedColumns: {
    [name: string]: CalculatedColumn
  } = {};

  constructor(rpc: CirclesRpc, params: PagedQueryParams, calculatedColumns?: CalculatedColumn[]) {
    this.params = params;
    this.rpc = rpc;

    if (!calculatedColumns) {
      return;
    }

    calculatedColumns.forEach(column => {
      this._calculatedColumns[column.name] = column;
    });
  }

  /**
   * Builds the order by clause for a paged query.
   * Always orders by blockNumber, transactionIndex, and logIndex.
   * If the table is TransferBatch, also orders by batchIndex.
   * @param params The query parameters.
   * @private
   */
  private buildOrderBy(params: PagedQueryParams) {
    const order: Order[] = [{
      Column: 'blockNumber',
      SortOrder: params.sortOrder
    }, {
      Column: 'transactionIndex',
      SortOrder: params.sortOrder
    }, {
      Column: 'logIndex',
      SortOrder: params.sortOrder
    }];

    if (params.table === 'TransferBatch') {
      // TODO: Find a better way to handle this.
      order.push({
        Column: 'batchIndex',
        SortOrder: params.sortOrder
      });
    }

    return order;
  }

  /**
   * Builds the cursor filter for a paged query.
   * Depending on the sort order, the cursor filter will be either greater than or less than the existing cursor.
   * @param params The query parameters.
   * @param cursor The cursor to use or undefined to start from the beginning/end depending on the sort order.
   * @private
   */
  private buildCursorFilter(params: PagedQueryParams, cursor?: Cursor) {
    if (!cursor) {
      return undefined;
    }

    const sortOrder = params.sortOrder === 'ASC' ? 'GreaterThan' : 'LessThan';

    // Add primary filter for blockNumber
    const blockNumberFilter: Filter = {
      Type: 'FilterPredicate',
      FilterType: sortOrder,
      Column: 'blockNumber',
      Value: cursor.blockNumber
    };

    // Create compound filter for transactionIndex, logIndex, and batchIndex
    const subFilters: Filter[] = [];

    // Filter for transactionIndex if blockNumber is equal
    subFilters.push({
      Type: 'Conjunction',
      ConjunctionType: 'And',
      Predicates: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'blockNumber',
          Value: cursor.blockNumber
        },
        {
          Type: 'FilterPredicate',
          FilterType: sortOrder,
          Column: 'transactionIndex',
          Value: cursor.transactionIndex
        }
      ]
    });

    // Filter for logIndex if blockNumber and transactionIndex are equal
    subFilters.push({
      Type: 'Conjunction',
      ConjunctionType: 'And',
      Predicates: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'blockNumber',
          Value: cursor.blockNumber
        },
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'transactionIndex',
          Value: cursor.transactionIndex
        },
        {
          Type: 'FilterPredicate',
          FilterType: sortOrder,
          Column: 'logIndex',
          Value: cursor.logIndex
        }
      ]
    });

    // Filter for batchIndex if applicable and all previous columns are equal
    if (params.table === 'TransferBatch') {
      subFilters.push({
        Type: 'Conjunction',
        ConjunctionType: 'And',
        Predicates: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'blockNumber',
            Value: cursor.blockNumber
          },
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'transactionIndex',
            Value: cursor.transactionIndex
          },
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'logIndex',
            Value: cursor.logIndex
          },
          {
            Type: 'FilterPredicate',
            FilterType: sortOrder,
            Column: 'batchIndex',
            Value: cursor.batchIndex
          }
        ]
      });
    }

    // Combine the primary and compound filters into a single filter
    const combinedFilter: Filter = {
      Type: 'Conjunction',
      ConjunctionType: 'Or',
      Predicates: [
        blockNumberFilter,
        ...subFilters
      ]
    };

    return [combinedFilter];
  }


  /**
   * Combines two filters into a single filter.
   * The filters are always combined with an 'And' conjunction.
   * @param filter1 The first filter or undefined.
   * @param filter2 The second filter or undefined.
   * @returns The combined filter or an empty array if both filters are undefined or empty.
   * @private
   */
  private combineFilters(filter1?: Filter[], filter2?: Filter[]): Filter[] {
    if (!filter1 && !filter2) {
      return [];
    }

    if (!filter1) {
      return filter2 ?? [];
    }

    if (!filter2) {
      return filter1;
    }

    return [<Filter>{
      Type: 'Conjunction',
      ConjunctionType: 'And',
      Predicates: [
        ...filter1,
        ...filter2
      ]
    }];
  }

  /**
   * Sends a `circles_query` call to a Circles Rpc node and returns the result as an array of objects.
   * @param method The method to call.
   * @param param The request parameters.
   * @private
   */
  private async request(method: string, param: CirclesQueryParams): Promise<TRow[]> {
    const jsonResponse = await this.rpc.call<CirclesQueryRpcResult>(method, [param]);
    return this.rowsToObjects(jsonResponse);
  }

  /**
   * Converts the rows from a Circles RPC response to an array of objects.
   * @param jsonResponse The JSON-RPC response.
   * @private
   */
  private rowsToObjects(jsonResponse: JsonRpcResponse<CirclesQueryRpcResult>): TRow[] {
    const { columns, rows } = jsonResponse.result;

    const calculatedColumns = Object.entries(this._calculatedColumns);
    if (calculatedColumns.length > 0) {
      calculatedColumns.forEach(col => columns.push(col[0]));
    }

    return <TRow[]>rows.map(row => {
      const rowObj: Record<string, any> = {};
      row.forEach((value, index) => {
        rowObj[columns[index]] = value;
      });

      for (const [name, column] of calculatedColumns) {
        rowObj[name] = column.generator(rowObj);
      }

      return rowObj;
    });
  }

  /**
   * Converts a row from a query result to a cursor.
   * The cursor is an object with the blockNumber, transactionIndex, logIndex, and optional batchIndex properties.
   * @param resultElement The row from the query result.
   * @private
   */
  private rowToCursor(resultElement: TRow): Cursor {
    return {
      blockNumber: resultElement.blockNumber as number,
      transactionIndex: resultElement.transactionIndex as number,
      logIndex: resultElement.logIndex as number,
      batchIndex: !resultElement.batchIndex ? undefined : resultElement.batchIndex as number
    };
  }

  /**
   * Builds a cursor from the first or last row of a query result.
   * If the result is empty, returns null.
   * @param result The query result.
   * @private
   */
  private getFirstAndLastCursor(result: TRow[]): {
    first: Cursor,
    last: Cursor
  } | null {
    if (result.length === 0) {
      return null;
    }

    const first = this.rowToCursor(result[0]);
    const last = this.rowToCursor(result[result.length - 1]);

    return { first, last };
  }

  /**
   * Queries the next page of a paged query.
   * @returns True if the query returned rows, false if there are no more results.
   */
  public async queryNextPage(): Promise<boolean> {
    const orderBy = this.buildOrderBy(this.params);
    const filter = this.buildCursorFilter(this.params, this._currentPage?.lastCursor);
    const combinedFilter = this.combineFilters(this.params.filter, filter);

    const queryParams: CirclesQueryParams = {
      Namespace: this.params.namespace,
      Table: this.params.table,
      Columns: this.params.columns,
      Filter: combinedFilter,
      Order: orderBy,
      Limit: this.params.limit
    };

    const result = await this.request('circles_query', queryParams);
    const cursors = this.getFirstAndLastCursor(result);

    this._currentPage = {
      limit: this.params.limit,
      size: result.length,
      firstCursor: cursors?.first,
      lastCursor: cursors?.last,
      sortOrder: this.params.sortOrder,
      results: result
    };

    return result.length > 0;
  }

/**
 * Queries a single row from the Circles RPC node.
 */
  public async getSingleRow(): Promise<TRow | undefined> {
    const orderBy = this.buildOrderBy(this.params);
    const filter = this.buildCursorFilter(this.params, this._currentPage?.lastCursor);
    const combinedFilter = this.combineFilters(this.params.filter, filter);

    const queryParams: CirclesQueryParams = {
      Namespace: this.params.namespace,
      Table: this.params.table,
      Columns: this.params.columns,
      Filter: combinedFilter,
      Order: orderBy,
      Limit: 1
    };

    const result = await this.request('circles_query', queryParams);
    return result.length > 0 ? result[0] : undefined;
  }
}
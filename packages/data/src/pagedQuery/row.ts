/**
 * Defines the default and minimum columns, any row must have.
 * These values are important for pagination.
 */
export interface Row {
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  batchIndex: number | undefined;
}
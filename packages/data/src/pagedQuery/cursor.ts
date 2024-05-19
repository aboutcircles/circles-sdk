/**
 * A cursor is a sortable unique identifier for a specific log entry.
 */
export interface Cursor {
  readonly blockNumber: number;
  readonly transactionIndex: number;
  readonly logIndex: number;
  readonly batchIndex?: number;
}
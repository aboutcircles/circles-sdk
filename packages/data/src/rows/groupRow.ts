import { EventRow } from '../pagedQuery/eventRow';

export interface GroupRow extends EventRow {
  group: string;
  mint: string;
  treasury: string;
  name: string;
  symbol: string;
}
import { Filter } from "./filter";
import { Order } from "./order";

export type CirclesQueryParams = {
  Namespace: string;
  Table: string;
  Columns: string[];
  Filter?: Filter[];
  Order?: Order[];
  Limit?: number;
};
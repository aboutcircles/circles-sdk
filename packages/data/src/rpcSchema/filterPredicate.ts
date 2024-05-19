export type FilterPredicate = {
  Type: 'FilterPredicate';
  FilterType: string;
  Column: string;
  Value: any;
};
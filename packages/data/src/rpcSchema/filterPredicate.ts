export type FilterPredicate = {
  Type: 'FilterPredicate';
  FilterType: 'Equals' | 'NotEquals' | 'GreaterThan' | 'GreaterThanOrEquals' | 'LessThan' | 'LessThanOrEquals' | 'Like'| 'ILike' | 'NotLike' | 'In' | 'NotIn' | 'IsNotNull' | 'IsNull';
  Column: string;
  Value: any;
};
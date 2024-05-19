import { Filter } from './filter';

export type Conjunction = {
  Type: 'Conjunction';
  ConjunctionType: 'Or' | 'And';
  Predicates: Filter[];
};
import { Observable } from './observable';

export type ObservablePropertyAndSetter<TValue> = {
  property: ObservableProperty<TValue>;
  emit: (value: TValue) => void;
}

export class ObservableProperty<TValue> extends Observable<TValue> {
  get value(): TValue | undefined {
    return this._value;
  }

  private _value?: TValue;

  protected constructor() {
    super();
  }

  subscribe(subscriber: (value?: TValue) => void): (() => void) {
    subscriber(this._value);
    return super.subscribe(subscriber);
  }

  protected emit(value: TValue) {
    this._value = value;
    super.emit(value);
  }

  public static create<T>(): ObservablePropertyAndSetter<T> {
    const prop = new ObservableProperty<T>();
    return {
      property: prop,
      emit: (e) => prop.emit(e)
    };
  }
}
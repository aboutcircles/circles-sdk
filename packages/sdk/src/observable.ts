export type ObservableAndEmitter<TValue> = {
  property: Observable<TValue>;
  emit: (value: TValue) => void;
}

export class Observable<TEvent> {
  private readonly _subscribers: ((event: TEvent) => void)[] = [];

  subscribe(subscriber: (value: TEvent) => void): (() => void) {
    this._subscribers.push(subscriber);
    return () => {
      this._subscribers.splice(this._subscribers.indexOf(subscriber), 1);
    };
  }

  protected constructor() {
    this._subscribers = [];
  }

  protected emit(value: TEvent) {
    this._subscribers.forEach(sub => sub(value));
  }

  public static create<T>(): ObservableAndEmitter<T> {
    const prop = new Observable<T>();
    return {
      property: prop,
      emit: (e) => prop.emit(e)
    };
  }
}
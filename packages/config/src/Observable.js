export class Observable {
  constructor(value) {
    this._val = value;
    this._listeners = [];
  }

  set(val) {
    if (this._val !== val) {
      this._val = val;
      this._listeners.forEach(l => l(val));
    }
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }
}

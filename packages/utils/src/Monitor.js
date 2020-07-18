export class Monitor {
  #intervalId;
  #interval;
  #listeners;

  constructor(interval = 5000) {
    this.#interval = interval;
  }

  start(invoke, newInterval = this.#interval) {
    if (!this.#intervalId && invoke) {
      this.#intervalId = setInterval(async () => {
        const data = await invoke();
        this.#listeners.forEach(subscriber => subscriber(data));
      }, newInterval);
    }
  }

  stop() {
    this.#intervalId && clearInterval(this.#intervalId);
  }

  subscribe(onChange) {
    if (onChange in this.#listeners) return;
    this.#listeners.push(onChange);
    return () => {
      this.#listeners = this.#listeners.filter(l => l !== onChange);
    };
  }

  close() {
    this.stop();
  }
}

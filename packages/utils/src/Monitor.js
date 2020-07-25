export class Monitor {
  #intervalId;
  #interval;
  #listeners = [];
  #afterFinish;
  #monitor;

  constructor({ interval = 5000, afterFinish = false, monitor }) {
    this.#interval = interval;
    this.#afterFinish = afterFinish;
    this.#monitor = monitor;
  }

  start({ monitor = this.#monitor, interval = this.#interval, onCall, afterFinish = this.#afterFinish } = {}) {
    if (!this.#intervalId && monitor) {
      const fn = async () => {
        const data = await monitor();
        this.#listeners.forEach(subscriber => subscriber(data));
      };

      if (afterFinish) {
        const warpTimeout = async () => {
          await fn();
          this.#intervalId = setTimeout(warpTimeout, interval);
        };
        setTimeout(warpTimeout, interval);
      } else this.#intervalId = setInterval(fn, interval);
      if (onCall) return this.subscribe(onCall);
    }
  }

  stop() {
    this.#intervalId && clearInterval(this.#intervalId);
  }

  subscribe(onCall) {
    const unsubscribe = () => (this.#listeners = this.#listeners.filter(l => l !== onCall));

    if (onCall in this.#listeners) return unsubscribe;
    this.#listeners.push(onCall);
    return unsubscribe;
  }

  unsubscribe(onCall) {
    this.#listeners = this.#listeners.filter(l => l !== onCall);
  }

  destroy() {
    this.stop();
    this.#listeners = [];
  }
}

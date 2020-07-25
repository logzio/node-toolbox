<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

# handy utils

## Observable
simplified observable pattern class
```javascript
import { Observable }  from '@logz/utils';
const data = {
  num: 2
}
const observable = new Observable(data);

const unsubscribe = observable.subscribe((newData => console.log(newData));

observable.set({num : 3}) // wii invoke all subscribes


unsubscribe() // will remove subscriber from object
```

## Monitor
using the observable pattern implement with timeouts can monitor changes
constructor params:
 interval: number (default 5000) | interval time to iterate on the callback
 afterFinish: boolean (default false) | should start next iteration timer after callback function finished
 monitor: fn (optional can also be pass on the start method)

methods:
  start: { monitor: fn, interval: number (default from class) onCall: fn } | start the interval
  stop: | stop interval
  subscribe: fn | call on each interval
  unSubscribe: fn | remove fn from subscribes
  destroy: | stop interval the remove all subscribes

```javascript
import { Monitor }  from '@logz/utils';

const sum = 0;
const toMonitorCallback = () => {
  sum = sum + 20
  delay(2000)
  return sum
}

// in this case afterFinish will cause interval be 5000 (delay from monitor + interval time) instead of 3000
const monitor = new Monitor({ interval: 3000, afterFinish: true, monitor: toMonitorCallback });

const subscriber2 = newData => console.log(newData);

monitor.subscribe(subscriber2);

const unsubscriber1 = monitor.subscribe((newData => console.log(newData)));

monitor.start(); // wii invoke all subscribers each call

monitor.unsubscribe(subscriber2);
unsubscriber1(); // will remove subscriber from object

monitor.destroy();

```

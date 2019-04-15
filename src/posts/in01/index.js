//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import { getContext } from '../ch03';


function counterStream(context) {
  return Kefir.interval(100).scan(prev => prev + 1, 0);
}

function enableStream(context) {
  return context.eventBus.scan(prev => !prev, true);
}

function numberStream(context) {
  return keep(counterStream(context), counterStream_ =>
    keep(enableStream(context), enableStream_ => {
      return enableStream_.filter().flatMap(enable => {
        return counterStream_
          .sampledBy(Kefir.interval(100).merge(Kefir.later(0)))
          .takeUntilBy(enableStream_.filter(enable => !enable));
      });
    })
  );
}

function mainViewStream(context) {
  return Kefir.combine([
    enableStream(context),
    numberStream(context),
  ], (enable, number) => {
    return (
      <div>
        不管你是否选择
        <button onClick={() => context.emit()}>
          { enable ? '暂停' : '继续' }
        </button>
        ，你都已经在这个页面上<del>浪费</del>花费了{ number / 10 }秒。
      </div>
    );
  });
}

function main() {
  const context = getContext();
  const subscription = mainViewStream(context).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    }
  });
  return () => subscription.unsubscribe();
}

export default main;

export function keep(obs, getObs) {
  return Kefir.stream(emitter => {
    const subscription = obs.observe();
    getObs(obs).observe(emitter);
    return () => subscription.unsubscribe();
  });
}

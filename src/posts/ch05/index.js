//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import { getContext } from '../ch03';


function enableStream(context) {
  return context.eventBus.scan(prev => !prev, true);
}

function colorUpdateSignal(context, colorStream) {
  return colorStream.sampledBy(
    enableStream(context).filter().merge(Kefir.later(0))
  ).flatMap(color =>
    colorStream.toProperty(() => color)
      .flatMap(color => {
        switch(color) {
          case 'red': return Kefir.later(1000);
          case 'green': return Kefir.later(700);
          case 'yellow': return Kefir.later(300);
        }
      })
      .takeUntilBy(enableStream(context).filter(enable => !enable))
  );
}

function colorStream(context) {
  return overdraft(colorStream =>
    colorUpdateSignal(context, colorStream)
      .scan(prev => {
        switch(prev) {
          case 'red': return 'green';
          case 'green': return 'yellow';
          case 'yellow': return 'red';
        }
      }, 'green')
  );
}

function mainViewStream(context) {
  return Kefir.combine([
    colorStream(context),
    enableStream(context).map(enable =>
      <button
        onClick={() => context.emit()}
        style={{width: 75}}
      >
        { enable ? '暂停' : '继续' }
      </button>
    )
  ], (color, enableView) => {
    return <div
      style={{width: '100%', height: 300, backgroundColor: color}}
    >
      { enableView }
    </div>
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

export function overdraft(getObs) {
  const context = getContext();
  return Kefir.stream(emitter => {
    const subscription = getObs(context.eventBus).observe({
      value(value) {
        context.emit(value);
        emitter.value(value);
      }
    });
    return () => subscription.unsubscribe();
  });
}

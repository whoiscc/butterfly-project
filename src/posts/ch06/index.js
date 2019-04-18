//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import { getContext } from '../ch03';
import { keep } from '../in01';


function resetButtonViewStream(context) {
  return Kefir.constant(
    <button
      style={{display: 'inline-block'}}
      onClick={() => context.emit('reset')}
    >重置</button>
  );
}

function wanderingButtonVolatileViewStream(context) {
  const resetSignal_ = context.eventBus
    .filter(event => event === 'reset');
  return keep(
    resetSignal_.scan(prev => prev + 1, 0),
    resetCountStream_ => {
      function aliveTimeVolatilePhantomStream(context) {
        return Kefir
          .merge([
            Kefir.interval(1000).map(() => -1),
            context.eventBus.filter(event => event === 'click').map(() => 1)
          ])
          .scan(
            (prev, update) => prev + update,
            Math.floor(Math.random() * 10) + 5
          );
      }

      function positionVolatilePhantomStream(context) {
        return Kefir
          .repeat(() =>
            Kefir.later(Math.floor(Math.random() * 1000) + 500))
          .toProperty(() => {})
          .map(() => ({left: Math.floor(Math.random() * 80) + 10 + '%'}));
      }

      function singleButtonVolatilePhantomStream(context) {
        const aliveTimeStream_ =
          aliveTimeVolatilePhantomStream(context);
        return Kefir.combine([
          aliveTimeStream_,
          positionVolatilePhantomStream(context),
          resetCountStream_
        ], (aliveTime, {left}, resetCount) =>
          <button
            onClick={() => context.emit('click')}
            style={{
              position: 'absolute',
              left,
              width: 75,
              transition: 'all 0.5s ease-in-out',
              display: 'inline-block',
            }}
          >#{resetCount}({ aliveTime })</button>
        ).takeUntilBy(
          Kefir.merge([
            aliveTimeStream_.filter(aliveTime => aliveTime < 0),
            resetSignal_,
            Kefir.later(20 * 1000),
          ])
        )
        .beforeEnd(() => {});
      }

      return resetSignal_
        .delay(20)
        .toProperty(() => {})
        .flatMap(() => singleButtonVolatilePhantomStream(context));
    }
  );
}

function main() {
  const context = getContext();
  const subscription = Kefir.combine([
    resetButtonViewStream(context),
    wanderingButtonVolatileViewStream(context),
  ], (resetButtonView, wanderingButtonView) =>
    <div style={{position: 'relative'}}>
      { resetButtonView }
      { wanderingButtonView }
    </div>
  ).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    }
  });
  return () => subscription.unsubscribe();
}

export default main;

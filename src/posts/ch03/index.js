//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import './style.css';
import powerImageSrc from './power.jpeg';

function buttonViewStream(context) {
  return Kefir.constant(
    <div className="button" onClick={
      () => context.emit({target: buttonViewStream, type: 'click'})
    }>
      <img src={ powerImageSrc } />
    </div>
  );
}

function buttonClickedSignal(context) {
  return context.eventBus
    .filter(({target, type}) =>
      target === buttonViewStream && type === 'click');
}

function buttonClickedCountStream(context) {
  return buttonClickedSignal(context).scan(x => x + 1, 0);
}

function turnOffBackgroundStream(context) {
  return buttonClickedCountStream(context).map(count => count % 3 != 0);
}

function main() {
  const context = getContext();
  buttonViewStream(context).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    }
  });
  turnOffBackgroundStream(context).observe({
    value(turnOff) {
      if (turnOff) {
        document.body.classList.add('turn-off');
      } else {
        document.body.classList.remove('turn-off');
      }
    }
  });
}

export function getContext() {
  const context = {};
  const eventBus = Kefir.stream(emitter => {
    context.emit = event => {
      emitter.emit(event);
    };
  });
  context.eventBus = eventBus;
  return context;
}

export default main;

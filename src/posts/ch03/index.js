//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import styles from './style.css';
import powerImageSrc from './power.jpeg';

function buttonViewStream(context) {
  return Kefir.constant(
    <div className={ styles.button } onClick={
      () => context.emit('clicked')
    }>
      <img src={ powerImageSrc } />
    </div>
  );
}

function buttonClickedSignal(context) {
  return context.eventBus
    .filter(event => event === 'clicked');
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
        document.body.classList.add(styles.turnOff);
      } else {
        document.body.classList.remove(styles.turnOff);
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

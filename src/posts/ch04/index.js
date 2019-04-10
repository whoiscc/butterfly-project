//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import { getContext } from '../ch03';
import styles from './style.css';


function tickSignal(context) {
  return Kefir.interval(1000);
}

function helpButtonClickedSignal(context) {
  return context.eventBus.filter(event => event === 'clicked');
}

function positionUpdateSignal(context) {
  return Kefir.merge([
    tickSignal(context).map(() => -1),
    helpButtonClickedSignal(context).map(() => 1),
  ]);
}

function positionStream(context) {
  return positionUpdateSignal(context)
    .scan((prevPos, update) => prevPos + update, 10)
    .takeWhile(position => position > 0)
    .beforeEnd(() => 0)
    .ignoreEnd();
}

function positionViewStream(context, positionStream) {
  return positionStream.map(position => (
    <div style={position === 0 ? {color: 'red'} : {}}>{ position }</div>
  ));
}

function helpButtonViewStream(context, positionStream) {
  return positionStream
    .map(position =>
      position !== 0 ?
        <button onClick={() => context.emit('clicked')}>救命</button> :
        <button>&nbsp;</button>
    );
}

function mainViewStream(context) {
  const positionStream_ = positionStream(context);
  return Kefir.combine([
    positionViewStream(context, positionStream_),
    helpButtonViewStream(context, positionStream_),
  ], (positionView, helpButtonViewStream) => (
    <div className={styles.app}>
      { positionView }
      { helpButtonViewStream }
    </div>
  ));
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

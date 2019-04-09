//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';


function tickSignal(context) {
  return Kefir.interval(1000);
}

function tickStream(context) {
  return tickSignal(context).scan(x => x + 1, 0);
}

function tickViewStream(context) {
  return tickStream(context).map(tick => {
    return (
      <div>
        <p>
          至此，世界上又有{ Math.floor(tick / 60 * 105) }人去世了。
          <sup>[1]</sup>
        </p>
        <p>1. 数据来自：http://www.ecology.com/birth-death-rates/</p>
      </div>
    );
  });
}

function main() {
  const subscription = tickViewStream({}).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    }
  });
  return () => subscription.unsubscribe();
}

export default main;

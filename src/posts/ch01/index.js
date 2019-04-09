//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';


function mainViewStream(context) {
  return Kefir.constant(
    <div>逝者如斯夫，不舍昼夜。</div>
  );
}

function main() {
  mainViewStream({}).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    },
  });
}

export default main;

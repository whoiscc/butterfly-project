//

import Kefir from 'kefir';
import React from 'react';
import ReactDOM from 'react-dom';

import { getContext } from '../ch03';
import { overdraft } from '../ch05';
import { keep } from '../in01';
import styles from './style.css';


function tickSignal(context) {
  return Kefir.interval(1000);
}

function clickSignal(context) {
  return context.eventBus.filter(event => event.type === 'click');
}

function moneyVolatilePhantomStream(context, pipeRiver_, id) {
  return Kefir.merge([
    tickSignal(context).map(() => -1),
    pipeRiver_
      .filter(([[source, destination]]) => source === id)
      .flatMap(([key, blobRiver]) => {
        return blobRiver.flatMap(blobSignal => {
          return blobSignal.filter(signal => signal === 'send');
        });
      })
      .map(() => -1),
    pipeRiver_
      .filter(([[source, destination]]) => destination === id)
      .flatMap(([key, blobRiver]) => {
        return blobRiver.flatMap(blobSignal => {
          return blobSignal.filter(signal => signal === 'receive');
        });
      })
      .map(() => 1),
  ]).scan(
    (prev, update) => prev + update,
    Math.floor(Math.random() * 10) + 10
  )
  .takeWhile(money => money >= 0);
}

const moneyRiver = once(context => {
  return keep(pipeRiver(context), pipeRiver_ => {
    return clickSignal(context)
      .scan(prev => prev + 1, 0)
      .skip(1)
      .map(id => [
        id,
        moneyVolatilePhantomStream(context, pipeRiver_, id)
      ]);
  });
});

function inDangerSignal(context) {
  return moneyRiver(context)
    .map(([id, moneyStream]) =>
      moneyStream
        .map(money => money <= 5)
        .skipDuplicates()
        .filter()
        .map(() => id)
    )
    .flatMap();
}

function createPipeSignal(context, pipeRiver_) {
  const moneyMapStream_ = collectRiver(moneyRiver(context));
  const newInDanger = moneyMapStream_
    .sampledBy(inDangerSignal(context), (moneyMap, inDangerId) => {
      console.assert(
        moneyMap[inDangerId] !== undefined && moneyMap[inDangerId] <= 5,
        `moneyMap[${inDangerId}] = ${moneyMap[inDangerId]}`
      );
      return {moneyMap, inDangerId};
    })
    .withHandler((emitter, event) => {
      if (event.type === 'value') {
        const {moneyMap, inDangerId} = event.value;
        for (const [id, money] of Object.entries(moneyMap)) {
          if (money >= 10) {
            emitter.emit({
              source: parseInt(id),
              destination: inDangerId
            });
          }
        }
      }
    });
  const newNumber = moneyMapStream_
    .sampledBy(moneyRiver(context), (moneyMap, [id]) => ({moneyMap, id}))
    .withHandler((emitter, event) => {
      if (event.type === 'value') {
        const {moneyMap, id} = event.value;
        for (const [otherId, money] of Object.entries(moneyMap)) {
          if (money <= 5) {
            emitter.emit({
              source: id,
              destination: parseInt(otherId)
            });
          }
        }
      }
    });
  const overlapped = Kefir.merge([newInDanger, newNumber]);
  const duplicated = collectRiver(pipeRiver_)
    .sampledBy(overlapped, (pipeMap, {source, destination}) => {
      return pipeMap[[source, destination]] !== undefined;
    });
  return Kefir
    .zip([overlapped, duplicated])
    .filter(([o, d]) => !d)
    .map(([o, d]) => o);
}

function pipeRiver(context) {
  return overdraft(pipeRiver_ => {
    return keep(collectRiver(moneyRiver(context)), moneyMapStream_ => {
      return createPipeSignal(context, pipeRiver_)
        .map(({source, destination}) => {
          return [
            [source, destination],
            blobPhantomAnonymousRiver(
              context, moneyMapStream_, source, destination)
          ];
        });
    });
  });
}

function blobPhantomAnonymousRiver(
  context, moneyMapStream_, source, destination
) {
  return moneyMapStream_
    .sampledBy(tickSignal(context))
    .map(moneyMap =>
      moneyMap[source] !== undefined &&
      moneyMap[destination] !== undefined &&
      moneyMap[source] !== 0 &&
      moneyMap[source] >= moneyMap[destination]
    )
    .takeWhile()
    .map(() => blobPhantomSignal(context, moneyMapStream_, destination));
}

function blobPhantomSignal(context, moneyMapStream_, destination) {
  return Kefir.merge([
    Kefir.later(0, 'send'),
    Kefir.later(1000, 'receive'),
    moneyMapStream_
      .filter(moneyMap => moneyMap[destination] === undefined)
      .map(() => 'cancel')
  ])
  .take(2);
}

const positionSignal = once(context => {
  return moneyRiver(context).map(([id, moneyStream]) =>
    ({
      left: Math.random() * 95 + '%',
      top: Math.random() * 95 + '%',
    })
  );
});

function blobPhantomViewStream(
  context, positionMapStream_, blobSignal_, source, destination, id
) {
  return positionMapStream_
    .sampledBy(blobSignal_.take(1))
    .map(positionMap => {
      const {left: sourceLeft, top: sourceTop} = positionMap[source];
      const {left: destinationLeft, top: destinationTop} =
        positionMap[destination];
      return {
        sourceStyle: {left: sourceLeft, top: sourceTop},
        destinationStyle: {left: destinationLeft, top: destinationTop}
      };
    })
    .flatMap(({sourceStyle, destinationStyle}) => {
      return Kefir.merge([
        Kefir.later(
          0,
          <div
            key={[source, destination, id]}
            className={styles.blob}
            style={sourceStyle}
          >1</div>
        ),
        Kefir.later(
          20,
          <div
            key={[source, destination, id]}
            className={styles.blob}
            style={destinationStyle}
          >1</div>
        )
      ]).ignoreEnd();
    })
    .takeUntilBy(blobSignal_.skip(1));
}

function blobPhantomViewRiver(
  context, positionMapStream_, blobRiver_, source, destination
) {
  return blobRiver_.scan(([id], blobSignal) => [
    id + 1,
    blobPhantomViewStream(
      context, positionMapStream_, blobSignal, source, destination, id)
  ], [0]).skip(1).map(([id, stream]) => [id - 1, stream]);
}

function pipeViewRiver(context) {
  return keep(collectRiver(Kefir.zip([
    moneyRiver(context),
    positionSignal(context),
  ], ([id, moneyStream], position) => [
    id,
    moneyStream.map(() => position).skipDuplicates()
  ])), positionMapStream_ => {
    return pipeRiver(context)
      .map(([[source, destination], blobRiver]) => [
        [source, destination],
        blobPhantomViewRiver(
          context, positionMapStream_, blobRiver, source, destination)
      ]);
  });
}

function moneyViewVolatileRiver(context) {
  return Kefir.zip([
    moneyRiver(context),
    positionSignal(context),
  ], ([id, moneyStream], {left, top}) => {
    return [
      id,
      moneyStream.map(money => {
        const colorStyle = money <= 5 ? {color: 'red'} :
          money >= 10 ? {color: 'green'} : {};
        return (
          <div
            key={id}
            className={styles.money}
            style={{left, top, ...colorStyle}}
          >
            { money }
          </div>
        );
      })
    ];
  });
}

function buttonViewStream(context) {
  return Kefir.constant(
    <button onClick={() => context.emit({type: 'click'})}>+1</button>
  );
}

function mainViewStream(context) {
  return Kefir.combine([
    buttonViewStream(context),
    collectRiver(moneyViewVolatileRiver(context)),
    collectRiver(
      pipeViewRiver(context).map(([id, blobViewRiver]) => [
        id,
        collectRiver(blobViewRiver)
      ])
    )
  ], (buttonView, moneyViewMap, pipeViewMap) => {
    let blobViews = [];
    for (const blobViewMap of Object.values(pipeViewMap)) {
      blobViews = blobViews.concat(Object.values(blobViewMap));
    }
    return (
      <div className={styles.app}>
        { buttonView }
        { Object.values(moneyViewMap) }
        { blobViews }
      </div>
    );
  });
}

function main() {
  const context = getContext();
  pipeViewRiver(context);
  const subscription = mainViewStream(context).observe({
    value(view) {
      ReactDOM.render(view, document.querySelector('#box'));
    }
  });
  return () => subscription.unsubscribe();
}

export default main;


function once(getInstance) {
  let inst = null;
  return context => {
    if (inst === null) {
      inst = getInstance(context);
    }
    return inst;
  };
}

function collectRiver(river) {
  const map = {};
  return river.withHandler((emitter, event) => {
    if (event.type === 'value') {
      const [key, stream] = event.value;
      const subscription = stream.observe({
        value(value) {
          map[key] = value;
          emitter.emit(map);
        },
        end() {
          delete map[key];
          emitter.emit(map);
          subscription.unsubscribe();
        }
      });
    }
  }).toProperty(() => ({}));
}

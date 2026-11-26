import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, increment, decrement, type Trace } from './counter';
test('records actual action and immutable state transitions synchronously', () => {
  const traces: Trace[] = [];
  const store = makeStore(t => traces.push(t));
  const original = store.getState();
  store.dispatch(increment()); store.dispatch(increment()); store.dispatch(decrement());
  assert.equal(store.getState().counter.value, 1);
  assert.equal(original.counter.value, 0);
  assert.deepEqual(traces.map(t => [t.before, t.after]), [[0,1],[1,2],[2,1]]);
  assert.equal(traces[0].action.type, 'counter/increment');
});
test('creating an action does not dispatch; stores are isolated; negative values allowed', () => {
  const a = makeStore(); const b = makeStore();
  increment(); assert.equal(a.getState().counter.value, 0);
  a.dispatch(decrement());
  assert.equal(a.getState().counter.value, -1);
  assert.equal(b.getState().counter.value, 0);
});

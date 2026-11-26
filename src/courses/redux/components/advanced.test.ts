import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeResilienceContext, makeSelectionContext } from './advanced';
import { makeQueryContext } from './query-lab';
const timing = { delay: 5, timeout: 80, backoff: 5 };
test('selection result preserves untouched record reference and changes selected record', async () => {
  const { api, store } = makeSelectionContext();
  const request = store.dispatch(api.endpoints.getEntries.initiate());
  try {
    await request;
    const old = api.endpoints.getEntries.select()(store.getState()).data!;
    store.dispatch(api.util.updateQueryData('getEntries', undefined, draft => { draft[1].title = 'Изменена вторая'; }));
    const changed = api.endpoints.getEntries.select()(store.getState()).data!;
    assert.notEqual(changed, old);
    assert.equal(changed[0], old[0]);
    store.dispatch(api.util.updateQueryData('getEntries', undefined, draft => { draft[0].title = 'Изменена первая'; }));
    assert.notEqual(api.endpoints.getEntries.select()(store.getState()).data![0], old[0]);
  } finally { request.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});
test('select is passive; manual initiate starts a query, repeated handle refetches', async () => {
  const c = makeQueryContext(); const { api, store } = c;
  const read = api.endpoints.getPost.select(1);
  assert.equal(read(store.getState()).status, 'uninitialized');
  assert.equal(c.getRequestCount(), 0);
  const a = store.dispatch(api.endpoints.getPost.initiate(1));
  const b = store.dispatch(api.endpoints.getPost.initiate(1));
  try {
    await Promise.all([a, b]); assert.equal(c.getRequestCount(), 1);
    a.unsubscribe(); await b.refetch();
    assert.equal(c.getRequestCount(), 2);
    assert.ok(read(store.getState()).data);
  } finally { a.unsubscribe(); b.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});
for (const retries of [0, 1, 2]) test(`retry allows initial call plus ${retries} retries`, async () => {
  const c = makeResilienceContext('transient', retries, timing);
  const request = c.store.dispatch(c.api.endpoints.getMessage.initiate());
  try {
    const result = await request;
    assert.equal(c.getAttempts(), retries + 1);
    assert.equal(Boolean(result.data), retries === 2);
  } finally { request.unsubscribe(); c.store.dispatch(c.api.util.resetApiState()); }
});
test('401 uses retry.fail to stop after first attempt', async () => {
  const c = makeResilienceContext('permanent', 2, timing);
  const request = c.store.dispatch(c.api.endpoints.getMessage.initiate());
  try {
    const result = await request;
    assert.equal(c.getAttempts(), 1);
    assert.equal(result.error && 'status' in result.error && result.error.status, 401);
    assert.ok(c.events.some(event => event.includes('retry.fail')));
  } finally { request.unsubscribe(); c.store.dispatch(c.api.util.resetApiState()); }
});
test('fetchBaseQuery timeout aborts fake transport and retry applies to each attempt', async () => {
  const c = makeResilienceContext('timeout', 1, timing);
  const request = c.store.dispatch(c.api.endpoints.getMessage.initiate());
  try {
    const result = await request;
    assert.equal(c.getAttempts(), 2);
    assert.equal(result.error && 'status' in result.error && result.error.status, 'TIMEOUT_ERROR');
    assert.equal(c.events.filter(event => event.includes('транспорт отменён')).length, 2);
  } finally { request.unsubscribe(); c.store.dispatch(c.api.util.resetApiState()); }
});

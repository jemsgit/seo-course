import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterSlice, makeTasksStore, saveTasks, selectVisible, sessionEnded, tasksSlice } from './tasks';
import { makeQueryContext } from './query-lab';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
test('filters preserve entities; one event clears both slices; old state is intact', () => {
  const c = makeTasksStore();
  try {
    const original = c.store.getState();
    c.store.dispatch(filterSlice.actions.changed('active'));
    assert.equal(selectVisible(c.store.getState()).length, 1);
    assert.equal(c.store.getState().tasks.ids.length, 2);
    c.store.dispatch(tasksSlice.actions.toggled('2'));
    assert.equal(selectVisible(c.store.getState()).length, 0);
    assert.equal(original.tasks.entities['2'].done, false);
    c.store.dispatch(sessionEnded());
    assert.equal(c.store.getState().filter, 'all');
    assert.equal(c.store.getState().tasks.ids.length, 0);
  } finally { c.dispose(); }
});
test('memoized selector preserves result when unrelated metadata changes', async () => {
  const c = makeTasksStore();
  try {
    c.store.dispatch(filterSlice.actions.changed('active'));
    const a = selectVisible(c.store.getState());
    const count = selectVisible.recomputations();
    c.store.dispatch(tasksSlice.actions.reminderShown());
    assert.equal(selectVisible(c.store.getState()), a);
    assert.equal(selectVisible.recomputations(), count);
  } finally { c.dispose(); }
});
test('async thunk succeeds, rejects through unwrap and supports abort', async () => {
  const c = makeTasksStore();
  try {
    const success = c.store.dispatch(saveTasks({ fail: false }));
    assert.equal(c.store.getState().tasks.status, 'pending');
    assert.equal(await success.unwrap(), 'Сохранено');
    assert.equal(c.store.getState().tasks.status, 'fulfilled');
    await assert.rejects(c.store.dispatch(saveTasks({ fail: true })).unwrap());
    const aborted = c.store.dispatch(saveTasks({ fail: false }));
    aborted.abort();
    const result = await aborted;
    assert.equal(saveTasks.rejected.match(result) && result.meta.aborted, true);
    assert.equal(c.store.getState().tasks.message, 'Запрос отменён');
  } finally { c.dispose(); }
});
test('ending the session ignores a late save and preserves a newer request', async () => {
  const c = makeTasksStore();
  const { dispatch, getState } = c.store;
  try {
    const previous = dispatch(saveTasks({ fail: false }));
    dispatch(sessionEnded());
    assert.equal(getState().tasks.status, 'idle');
    const current = dispatch(saveTasks({ fail: false }));

    await previous.unwrap();
    assert.equal(getState().tasks.status, 'pending');
    assert.equal(getState().tasks.currentRequestId, current.requestId);
    await current.unwrap();
    assert.equal(getState().tasks.status, 'fulfilled');

    const cancelled = dispatch(saveTasks({ fail: false }));
    dispatch(sessionEnded());
    cancelled.abort();
    await cancelled;
    assert.equal(getState().tasks.status, 'idle');
    assert.equal(getState().tasks.message, '');
  } finally { c.dispose(); }
});
test('listener debounces reactions and dispose cancels pending work', async () => {
  const c = makeTasksStore();
  c.store.dispatch(tasksSlice.actions.toggled('2'));
  await delay(250);
  c.store.dispatch(tasksSlice.actions.toggled('2'));
  await delay(300);
  assert.equal(c.store.getState().tasks.reminder, '');
  await delay(300);
  assert.match(c.store.getState().tasks.reminder, /Список изменён/);
  c.store.dispatch(tasksSlice.actions.toggled('2'));
  c.store.dispatch(sessionEnded());
  await delay(550);
  assert.equal(c.store.getState().tasks.reminder, '');
  c.dispose();
  const disposed = makeTasksStore();
  disposed.store.dispatch(tasksSlice.actions.toggled('2'));
  disposed.dispose();
  await delay(550);
  assert.equal(disposed.store.getState().tasks.reminder, '');
});
test('queries deduplicate; tags refresh active matching subscriptions only', async () => {
  const c = makeQueryContext();
  const { api, store } = c;
  const a = store.dispatch(api.endpoints.getPost.initiate(1));
  const b = store.dispatch(api.endpoints.getPost.initiate(1));
  const other = store.dispatch(api.endpoints.getPost.initiate(2));
  try {
    await Promise.all([a, b, other]);
    assert.equal(c.getRequestCount(), 2);
    await store.dispatch(api.endpoints.editPost.initiate({ id: 1, title: 'Новый заголовок' })).unwrap();
    const running = store.dispatch(api.util.getRunningQueriesThunk());
    await Promise.all(running);
    assert.equal(c.getRequestCount(), 4);
    assert.equal(api.endpoints.getPost.select(1)(store.getState()).data?.title, 'Новый заголовок');
    assert.equal(api.endpoints.getPost.select(2)(store.getState()).data?.title, 'Освоить теги');
    await assert.rejects(store.dispatch(api.endpoints.editPost.initiate({
      id: 1,
      title: 'Не сохранится',
      fail: true,
    })).unwrap(), { status: 500 });
    assert.equal(store.dispatch(api.util.getRunningQueriesThunk()).length, 0);
    assert.equal(c.getRequestCount(), 5);
    assert.equal(api.endpoints.getPost.select(1)(store.getState()).data?.title, 'Новый заголовок');
  } finally { a.unsubscribe(); b.unsubscribe(); other.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});
test('optimistic update is visible immediately and reconciles with the server', async () => {
  const c = makeQueryContext(); const { api, store } = c;
  const subscription = store.dispatch(api.endpoints.getPost.initiate(1));
  try {
    await subscription;
    const original = api.endpoints.getPost.select(1)(store.getState()).data?.title;
    const request = store.dispatch(api.endpoints.editOptimistic.initiate({ id: 1, title: 'Временно', fail: true }));
    assert.equal(api.endpoints.getPost.select(1)(store.getState()).data?.title, 'Временно');
    await assert.rejects(request.unwrap());
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()));
    assert.equal(api.endpoints.getPost.select(1)(store.getState()).data?.title, original);
    const older = store.dispatch(api.endpoints.editOptimistic.initiate({ id: 1, title: 'Первая правка', fail: true }));
    const newer = store.dispatch(api.endpoints.editOptimistic.initiate({ id: 1, title: 'Вторая   правка' }));
    const cachedTitle = () => api.endpoints.getPost.select(1)(store.getState()).data?.title;
    assert.equal(cachedTitle(), 'Вторая   правка');
    await assert.rejects(older.unwrap());
    assert.equal(cachedTitle(), 'Вторая   правка');
    await newer.unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()));
    assert.equal(cachedTitle(), 'Вторая правка');
    assert.equal(c.events.filter(event => event.includes('GET /posts/1')).length, 3);
  } finally { subscription.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});
test('cache survives one unsubscribe and expires after last subscriber leaves', async () => {
  const c = makeQueryContext(); const { api, store } = c;
  const a = store.dispatch(api.endpoints.getPost.initiate(1));
  const b = store.dispatch(api.endpoints.getPost.initiate(1));
  try {
    await Promise.all([a,b]); a.unsubscribe();
    await delay(3200);
    assert.ok(api.endpoints.getPost.select(1)(store.getState()).data);
    b.unsubscribe(); await delay(3200);
    assert.equal(api.endpoints.getPost.select(1)(store.getState()).status, 'uninitialized');
  } finally { a.unsubscribe(); b.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});

test('infinite query appends pages to one cache entry and stops at the last page', async () => {
  const { makeFeedContext } = await import('./feed');
  const { api, store } = makeFeedContext();
  const first = store.dispatch(api.endpoints.feed.initiate('Redux'));
  try {
    await first;
    await store.dispatch(api.endpoints.feed.initiate('Redux', { direction: 'forward' }));
    await store.dispatch(api.endpoints.feed.initiate('Redux', { direction: 'forward' }));
    const result = api.endpoints.feed.select('Redux')(store.getState());
    assert.deepEqual(result.data?.pageParams, [1, 2, 3]);
    assert.equal(result.data?.pages.flatMap(page => page.items).length, 6);
    assert.equal(result.hasNextPage, false);
    assert.equal(Object.keys(store.getState().feedApi.queries).length, 1);
    assert.equal(api.endpoints.feed.select('RTK Query')(store.getState()).status, 'uninitialized');
  } finally { first.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});

test('infinite query preserves pages after a failed fetch and retries the same page', async () => {
  const { makeFeedContext } = await import('./feed');
  const { api, store, setPageFailure } = makeFeedContext();
  const selectRedux = api.endpoints.feed.select('Redux');
  const selectRtk = api.endpoints.feed.select('RTK Query');
  const first = store.dispatch(api.endpoints.feed.initiate('Redux'));
  try {
    await first.unwrap();
    const other = store.dispatch(api.endpoints.feed.initiate('RTK Query'));
    try {
      assert.equal(selectRtk(store.getState()).data, undefined);
      assert.deepEqual(selectRedux(store.getState()).data?.pageParams, [1]);
      await other.unwrap();
      assert.equal(selectRtk(store.getState()).data?.pages[0].items[0].title, 'RTK Query: запись 1');
    } finally { other.unsubscribe(); }

    setPageFailure(true);
    const nextPage = () => store.dispatch(api.endpoints.feed.initiate('Redux', {
      direction: 'forward',
      subscribe: false,
    }));
    await assert.rejects(nextPage().unwrap(), { status: 503 });
    const failed = selectRedux(store.getState());
    assert.equal(failed.isFetchNextPageError, true);
    assert.deepEqual(failed.data?.pageParams, [1]);
    assert.equal(failed.hasNextPage, true);

    setPageFailure(false);
    await nextPage().unwrap();
    const retried = selectRedux(store.getState());
    assert.equal(retried.isFetchNextPageError, false);
    assert.deepEqual(retried.data?.pageParams, [1, 2]);
  } finally { first.unsubscribe(); store.dispatch(api.util.resetApiState()); }
});

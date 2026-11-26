import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSessionContext } from './session-lab';

test('concurrent 401 responses share one refresh and both reads retry', async () => {
  const context = makeSessionContext(async () => {});
  const { api, store, signIn, signOut, getEvents } = context;
  signIn('Анна');
  try {
    const profile = store.dispatch(api.endpoints.privatePanel.initiate('profile'));
    const tasks = store.dispatch(api.endpoints.privatePanel.initiate('tasks'));
    assert.deepEqual(await Promise.all([profile.unwrap(), tasks.unwrap()]), [
      'Профиль: Анна', 'Список задач: Анна',
    ]);
    assert.equal(getEvents().filter(event => event.startsWith('POST /refresh')).length, 1);
    assert.equal(getEvents().filter(event => event.startsWith('401')).length, 2);
    assert.equal(getEvents().filter(event => event.startsWith('GET')).length, 4);
  } finally { signOut(); }
});

test('logout clears cached data and a late refresh cannot affect the next account', async () => {
  const refreshes: Array<() => void> = [];
  const context = makeSessionContext(ms => ms === 900
    ? new Promise<void>(resolve => refreshes.push(resolve))
    : Promise.resolve());
  const { api, store, signIn, signOut, getEvents } = context;
  const profile = () => store.dispatch(api.endpoints.privatePanel.initiate('profile'));
  const cached = () => api.endpoints.privatePanel.select('profile')(store.getState()).data;
  const nextTick = () => new Promise<void>(resolve => setImmediate(resolve));

  try {
    signIn('Анна');
    const old = profile();
    await nextTick();
    assert.equal(refreshes.length, 1);
    signOut();
    await old;
    assert.equal(api.endpoints.privatePanel.select('profile')(store.getState()).isUninitialized, true);

    signIn('Борис');
    const current = profile();
    await nextTick();
    assert.equal(refreshes.length, 2);
    refreshes[0]();
    await nextTick();
    assert.equal(cached(), undefined);
    assert.ok(getEvents().includes('Ответ refresh отброшен · Анна'));
    assert.equal(getEvents().filter(event => event === 'GET /profile · Анна').length, 1);

    refreshes[1]();
    assert.equal(await current.unwrap(), 'Профиль: Борис');
    assert.equal(cached(), 'Профиль: Борис');
    signOut();
    assert.equal(cached(), undefined);
  } finally {
    signOut();
    for (const finish of refreshes) finish();
  }
});

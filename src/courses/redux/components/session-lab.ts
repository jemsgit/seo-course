import { configureStore } from '@reduxjs/toolkit';
import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';

type Panel = 'profile' | 'tasks';
type Session = { account: string; credentialVersion: number; refresh?: Promise<void> };
type SessionError = { status: 401 };
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function makeSessionContext(delay = wait) {
  let session: Session | undefined;
  let events: readonly string[] = [];
  const listeners = new Set<() => void>();
  const log = (event: string) => {
    events = [...events, event];
    for (const listener of listeners) listener();
  };

  async function read(panel: Panel, owner: Session, version: number) {
    log(`GET /${panel} · ${owner.account}`);
    await delay(200);
    if (session !== owner || version === 0) {
      log(`401 /${panel} · ${owner.account}`);
      return { error: { status: 401 } as const };
    }
    return { data: panel === 'profile' ? `Профиль: ${owner.account}` : `Список задач: ${owner.account}` };
  }

  async function refresh(owner: Session) {
    log(`POST /refresh · ${owner.account}`);
    await delay(900);
    if (session !== owner) {
      log(`Ответ refresh отброшен · ${owner.account}`);
      return;
    }
    owner.credentialVersion++;
    log(`Сессия обновлена · ${owner.account}`);
  }

  const baseQuery: BaseQueryFn<Panel, string, SessionError> = async (panel, { signal }) => {
    const owner = session;
    if (!owner) return { error: { status: 401 } };
    const version = owner.credentialVersion;
    const result = await read(panel, owner, version);
    if (!result.error || session !== owner || signal.aborted) return result;

    // A late 401 may refer to credentials that have already been refreshed.
    if (owner.credentialVersion === version) {
      owner.refresh ??= refresh(owner).finally(() => { delete owner.refresh; });
      await owner.refresh;
    }
    if (session !== owner || signal.aborted) return result;
    return read(panel, owner, owner.credentialVersion);
  };

  const api = createApi({
    baseQuery,
    reducerPath: 'sessionApi',
    endpoints: builder => ({
      privatePanel: builder.query<string, Panel>({ query: panel => panel }),
    }),
  });
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: getDefault => getDefault().concat(api.middleware),
  });

  function signOut() {
    const previous = session;
    session = undefined;
    for (const request of store.dispatch(api.util.getRunningQueriesThunk())) request.abort();
    store.dispatch(api.util.resetApiState());
    if (previous) log(`Выход · ${previous.account}. Приватный кэш очищен.`);
  }

  return {
    api,
    store,
    signOut,
    signIn(account: string) {
      signOut();
      session = { account, credentialVersion: 0 };
      log(`Вход · ${account}. Для опыта срок доступа уже истёк.`);
    },
    getEvents: () => events,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

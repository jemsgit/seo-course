import { configureStore } from '@reduxjs/toolkit';
import { createApi, fakeBaseQuery, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
export type Entry = { id: number; title: string };
export function makeSelectionContext() {
  const api = createApi({
    reducerPath: 'selectionApi', baseQuery: fakeBaseQuery(),
    endpoints: builder => ({
      getEntries: builder.query<Entry[], void>({ queryFn: async () => ({ data: [{ id: 1, title: 'Первая запись' }, { id: 2, title: 'Вторая запись' }] }) }),
    }),
  });
  const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: g => g().concat(api.middleware) });
  return { api, store };
}
export type ResilienceMode = 'transient' | 'permanent' | 'timeout';
export function makeResilienceContext(mode: ResilienceMode, maxRetries = 2, timing = { delay: 60, timeout: 120, backoff: 180 }) {
  const events: string[] = [];
  let attempts = 0;
  const fetchFn: typeof fetch = async input => {
    const request = input as Request;
    const attempt = ++attempts;
    events.push(`Попытка ${attempt}: запрос начат`);
    try {
      await new Promise<void>((resolve, reject) => {
        const finish = () => { request.signal.removeEventListener('abort', abort); resolve(); };
        const timer = setTimeout(finish, mode === 'timeout' ? timing.timeout * 3 : timing.delay);
        function abort() { clearTimeout(timer); request.signal.removeEventListener('abort', abort); reject(request.signal.reason ?? new DOMException('Отменено', 'AbortError')); }
        if (request.signal.aborted) abort();
        else request.signal.addEventListener('abort', abort, { once: true });
      });
    } catch (error) { events.push(`Попытка ${attempt}: транспорт отменён`); throw error; }
    const status = mode === 'permanent' ? 401 : mode === 'transient' && attempt <= 2 ? 503 : 200;
    events.push(`Попытка ${attempt}: HTTP ${status}`);
    return new Response(JSON.stringify(status === 200 ? { message: 'Данные получены' } : { message: 'Учебная ошибка' }), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const raw = fetchBaseQuery({ baseUrl: 'https://learning.invalid/', timeout: timing.timeout, fetchFn });
  const resilient = retry(async (args: Parameters<typeof raw>[0], api, extraOptions) => {
    const result = await raw(args, api, extraOptions);
    if (result.error?.status === 401) {
      events.push('401: повторные попытки прекращены через retry.fail');
      retry.fail(result.error, result.meta);
    }
    return result;
  }, {
    maxRetries,
    backoff: async attempt => { events.push(`Ожидание перед повтором ${attempt}: ${timing.backoff} мс`); await new Promise(resolve => setTimeout(resolve, timing.backoff)); },
  });
  const api = createApi({ reducerPath: 'resilienceApi', baseQuery: resilient, endpoints: builder => ({
    getMessage: builder.query<{ message: string }, void>({ query: () => 'message' }),
  }) });
  const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: g => g().concat(api.middleware) });
  return { api, store, events, getAttempts: () => attempts };
}

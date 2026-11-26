import { configureStore } from '@reduxjs/toolkit';
import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
export type Post = { id: number; title: string };
type Args = { id: number; title?: string; fail?: boolean };
export function makeQueryContext() {
  const server: Record<number, Post> = { 1: { id: 1, title: 'Разобраться с кэшем' }, 2: { id: 2, title: 'Освоить теги' } };
  let requestCount = 0;
  const events: string[] = [];
  const baseQuery: BaseQueryFn<Args, Post, { status: number; data: string }> = async (args, api) => {
    requestCount++;
    events.push(`#${requestCount} ${args.title === undefined ? 'GET' : 'PATCH'} /posts/${args.id}`);
    await new Promise(resolve => setTimeout(resolve, 450));
    if (api.signal.aborted) return { error: { status: 499, data: 'Отменено' } };
    if (args.fail) { events.push('→ ошибка 500'); return { error: { status: 500, data: 'Учебная ошибка' } }; }
    if (!server[args.id]) return { error: { status: 404, data: 'Не найдено' } };
    if (args.title !== undefined) {
      server[args.id] = { id: args.id, title: args.title.trim().replace(/\s+/g, ' ') };
    }
    events.push(`→ 200: ${server[args.id].title}`);
    return { data: { ...server[args.id] } };
  };
  const api = createApi({
    reducerPath: 'labApi', baseQuery, keepUnusedDataFor: 3, tagTypes: ['Post'],
    endpoints: builder => ({
      getPost: builder.query<Post, number>({ query: id => ({ id }), providesTags: (_r, _e, id) => [{ type: 'Post', id }] }),
      editPost: builder.mutation<Post, Args>({
        query: args => args,
        invalidatesTags: (_result, error, arg) => error ? [] : [{ type: 'Post', id: arg.id }],
      }),
      editOptimistic: builder.mutation<Post, Args>({
        query: args => args,
        onQueryStarted(arg, { dispatch }) {
          dispatch(api.util.updateQueryData('getPost', arg.id, draft => {
            draft.title = arg.title ?? draft.title;
          }));
        },
        invalidatesTags: (_result, _error, arg) => [{ type: 'Post', id: arg.id }],
      }),
    }),
  });
  const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: g => g().concat(api.middleware) });
  return { api, store, events, getRequestCount: () => requestCount };
}
export type QueryContext = ReturnType<typeof makeQueryContext>;

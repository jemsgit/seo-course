import { configureStore } from '@reduxjs/toolkit';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
type Item = { id: number; title: string };
export function makeFeedContext() {
  let failNextPage = false;
  const api = createApi({
    reducerPath: 'feedApi', baseQuery: fakeBaseQuery<{ status: number }>(),
    endpoints: builder => ({
      feed: builder.infiniteQuery<{ items: Item[]; nextPage: number | null }, string, number>({
        infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: page => page.nextPage ?? undefined },
        async queryFn({ queryArg, pageParam }) {
          const shouldFail = pageParam > 1 && failNextPage;
          await new Promise(resolve => setTimeout(resolve, 350));
          if (shouldFail) return { error: { status: 503 } };
          return { data: { items: [1,2].map(offset => ({ id: (pageParam - 1) * 2 + offset, title: `${queryArg}: запись ${(pageParam - 1) * 2 + offset}` })), nextPage: pageParam < 3 ? pageParam + 1 : null } };
        },
      }),
    }),
  });
  const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: getDefault => getDefault().concat(api.middleware) });
  return { api, store, setPageFailure(enabled: boolean) { failNextPage = enabled; } };
}

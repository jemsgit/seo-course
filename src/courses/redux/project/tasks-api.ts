import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export type Task = { id: number; title: string; done: boolean };
export type Transport = typeof fetch;

export function createTaskBoard(transport: Transport) {
  const api = createApi({
    reducerPath: 'tasksApi',
    baseQuery: fetchBaseQuery({ baseUrl: 'https://tasks.example/api/', fetchFn: transport }),
    tagTypes: ['Tasks'],
    endpoints: builder => ({
      getTasks: builder.query<Task[], void>({
        query: () => 'tasks',
        providesTags: ['Tasks'],
      }),
      renameTask: builder.mutation<Task, Pick<Task, 'id' | 'title'>>({
        query: ({ id, title }) => ({ url: `tasks/${id}`, method: 'PATCH', body: { title } }),
        invalidatesTags: (_result, error) => error ? [] : ['Tasks'],
      }),
    }),
  });
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(api.middleware),
  });
  return { api, store };
}

export type TaskBoardApi = ReturnType<typeof createTaskBoard>['api'];

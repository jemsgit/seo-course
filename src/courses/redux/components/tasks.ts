import { configureStore, createAction, createAsyncThunk, createEntityAdapter, createListenerMiddleware, createSelector, createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
export type Task = { id: string; title: string; done: boolean };
export const initialTasks: Task[] = [{ id: '1', title: 'Понять store', done: true }, { id: '2', title: 'Написать slice', done: false }];
export const adapter = createEntityAdapter<Task>();
export const sessionEnded = createAction('session/ended');
export const saveTasks = createAsyncThunk('tasks/save', async ({ fail }: { fail: boolean }, { signal }) => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 700);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Отменено')); }, { once: true });
  });
  if (fail) throw new Error('Учебная ошибка сохранения');
  return 'Сохранено';
});
const makeInitialTasksState = () => adapter.getInitialState({
  status: 'idle',
  message: '',
  reminder: '',
  currentRequestId: null as string | null,
});

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState: makeInitialTasksState(),
  reducers: {
    added: adapter.addOne,
    toggled(state, action: PayloadAction<string>) {
      const task = state.entities[action.payload];
      if (task) task.done = !task.done;
    },
    reminderShown(state) { state.reminder = 'Список изменён. Можно сохранить результат.'; },
  },
  extraReducers: builder => builder
    .addCase(sessionEnded, makeInitialTasksState)
    .addCase(saveTasks.pending, (state, action) => {
      state.currentRequestId = action.meta.requestId;
      state.status = 'pending';
      state.message = '';
    })
    .addCase(saveTasks.fulfilled, (state, action) => {
      if (state.currentRequestId !== action.meta.requestId) return;
      state.currentRequestId = null;
      state.status = 'fulfilled';
      state.message = action.payload;
    })
    .addCase(saveTasks.rejected, (state, action) => {
      if (state.currentRequestId !== action.meta.requestId) return;
      state.currentRequestId = null;
      state.status = 'rejected';
      state.message = action.meta.aborted ? 'Запрос отменён' : action.error.message ?? 'Ошибка';
    }),
});
export const filterSlice = createSlice({ name: 'filter', initialState: 'all' as 'all' | 'active', reducers: {
  changed: (_state, action: PayloadAction<'all' | 'active'>) => action.payload,
}, extraReducers: b => b.addCase(sessionEnded, () => 'all' as const) });
export function makeTasksStore() {
  const listener = createListenerMiddleware();
  listener.startListening({ matcher: isAnyOf(tasksSlice.actions.toggled, sessionEnded), effect: async (action, api) => {
    api.cancelActiveListeners();
    if (sessionEnded.match(action)) return;
    await api.delay(500);
    api.dispatch(tasksSlice.actions.reminderShown());
  } });
  const store = configureStore({ reducer: { tasks: tasksSlice.reducer, filter: filterSlice.reducer }, middleware: g => g().prepend(listener.middleware) });
  store.dispatch(tasksSlice.actions.added(initialTasks[0]));
  store.dispatch(tasksSlice.actions.added(initialTasks[1]));
  return { store, dispose: () => listener.clearListeners() };
}
export type TasksState = ReturnType<ReturnType<typeof makeTasksStore>['store']['getState']>;
export const taskSelectors = adapter.getSelectors<TasksState>(s => s.tasks);
export const selectVisible = createSelector([taskSelectors.selectAll, (s: TasksState) => s.filter], (tasks, filter) => filter === 'all' ? tasks : tasks.filter(t => !t.done));

import { configureStore, createSlice, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
export const counterSlice = createSlice({
  name: 'counter', initialState: { value: 0 },
  reducers: {
    increment(state) { state.value += 1; },
    decrement(state) { state.value -= 1; },
  },
});
export type Trace = { action: UnknownAction; before: number; after: number };
export function makeStore(onAction?: (trace: Trace) => void) {
  const recorder: Middleware<{}, { counter: { value: number } }> = api => next => action => {
    const before = api.getState().counter.value;
    const result = next(action);
    onAction?.({ action: action as UnknownAction, before, after: api.getState().counter.value });
    return result;
  };
  return configureStore({ reducer: { counter: counterSlice.reducer }, middleware: getDefault => getDefault().concat(recorder) });
}
export const { increment, decrement } = counterSlice.actions;
export type RootState = ReturnType<ReturnType<typeof makeStore>['getState']>;

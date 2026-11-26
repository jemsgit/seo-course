import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
type Task = { id: string; title: string; done: boolean };
const tasksSlice = createSlice({
  name: 'tasks',
  initialState: [{ id: '1', title: 'Понять store', done: true }, { id: '2', title: 'Написать селектор', done: false }] as Task[],
  reducers: { toggled(state, action: PayloadAction<string>) { const task = state.find(task => task.id === action.payload); if (task) task.done = !task.done; } },
});
const filterSlice = createSlice({ name: 'filter', initialState: 'all' as 'all' | 'active', reducers: { changed: (_state, action: PayloadAction<'all' | 'active'>) => action.payload } });
function makeStore() { return configureStore({ reducer: { tasks: tasksSlice.reducer, filter: filterSlice.reducer } }); }
type State = ReturnType<ReturnType<typeof makeStore>['getState']>;
const selectTasks = (state: State) => state.tasks;
const selectActiveCount = (state: State) => state.tasks.filter(task => !task.done).length;
const selectVisibleTasks = (state: State) => state.filter === 'all' ? state.tasks : state.tasks.filter(task => !task.done);
function View() {
  const tasks = useSelector(selectTasks);
  const filter = useSelector((state: State) => state.filter);
  const activeCount = useSelector(selectActiveCount);
  const dispatch = useDispatch();
  // Compute a view from the selected fields. This chapter introduces plain selectors;
  // memoizing array results for useSelector follows in the next chapter.
  const state = { tasks, filter };
  const visible = selectVisibleTasks(state);
  return <div className="tasks-body"><div className="button-row filter-row"><button aria-pressed={filter === 'all'} onClick={() => dispatch(filterSlice.actions.changed('all'))}>Все</button><button aria-pressed={filter === 'active'} onClick={() => dispatch(filterSlice.actions.changed('active'))}>Только активные</button></div><ul className="task-list">{visible.map(task => <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => dispatch(tasksSlice.actions.toggled(task.id))}/><span>{task.title}</span></label></li>)}</ul>{!visible.length && <p>Активных задач нет. Переключи фильтр на «Все».</p>}<p role="status">В store: {tasks.length}. Активных: {activeCount}. Показано: {visible.length}.</p><h3>Исходное состояние store</h3><pre><code>{JSON.stringify(state, null, 2)}</code></pre><h3>Результат selectVisibleTasks</h3><pre><code>{JSON.stringify(visible, null, 2)}</code></pre><p className="muted">В store хранятся только tasks и filter. Видимый список вычисляется селектором и отдельно в store не сохраняется.</p></div>;
}
function Instance() { const [store] = useState(makeStore); return <Provider store={store}><View/></Provider>; }
export default function SelectorsLab() { const [key, setKey] = useState(0); return <section className="lab" aria-label="Лаборатория селекторов"><div className="lab-top"><h3>Сохранённые данные и вычисленный список</h3></div><Instance key={key}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Начать заново</button></section>; }

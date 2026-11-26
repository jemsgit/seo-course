import { useEffect, useRef, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { filterSlice, makeTasksStore, saveTasks, selectVisible, sessionEnded, tasksSlice, type TasksState } from './tasks';
function View({ mode }: { mode: string }) {
  const tasks = useSelector((s: TasksState) => s.tasks);
  const filter = useSelector((s: TasksState) => s.filter);
  const state = { tasks, filter };
  const visible = useSelector(selectVisible);
  const dispatch = useDispatch<ReturnType<typeof makeTasksStore>['store']['dispatch']>();
  const [title, setTitle] = useState('');
  const [lastAction, setLastAction] = useState('Начальное состояние');
  const [fail, setFail] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);
  const asyncMode = mode === 'async';
  return <><div className="lab-top"><div><span className="eyebrow">Учебный список задач</span><h3>Данные, действия и результат</h3></div><span className="status">● Redux Toolkit</span></div><div className="tasks-body"><form onSubmit={e => { e.preventDefault(); if (!title.trim()) return; const action = tasksSlice.actions.added({ id: crypto.randomUUID(), title: title.trim(), done: false }); dispatch(action); setLastAction(JSON.stringify(action)); setTitle(''); }}><label htmlFor={`task-${mode}`}>Название новой задачи</label><div className="button-row"><input id={`task-${mode}`} value={title} onChange={e => setTitle(e.target.value)} required maxLength={100}/><button className="primary">Добавить</button></div></form><div className="button-row filter-row"><button aria-pressed={state.filter === 'all'} onClick={() => dispatch(filterSlice.actions.changed('all'))}>Все</button><button aria-pressed={state.filter === 'active'} onClick={() => dispatch(filterSlice.actions.changed('active'))}>Только активные</button><button onClick={() => { dispatch(sessionEnded()); setLastAction('session/ended → tasks и filter сброшены'); }}>Завершить сессию</button></div><ul className="task-list">{visible.map(task => <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => { dispatch(tasksSlice.actions.toggled(task.id)); setLastAction(JSON.stringify(tasksSlice.actions.toggled(task.id))); }}/><span>{task.title}</span></label><code>id: {task.id.slice(0, 8)}</code></li>)}</ul>{!visible.length && <p>Под этот фильтр задачи не попали. Можно добавить новую.</p>}<p className="muted">Показано {visible.length} из {state.tasks.ids.length}. Фильтр не удаляет данные из store.</p>{mode === 'listener' && <p role="status">Listener: {state.tasks.reminder || 'Переключи задачу и подожди полсекунды.'}</p>}{asyncMode && <div><label><input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)}/> Сымитировать ошибку</label><div className="button-row"><button disabled={state.tasks.status === 'pending'} onClick={() => { const request = dispatch(saveTasks({ fail })); cancel.current = () => request.abort(); }}>Сохранить (700 мс)</button><button disabled={state.tasks.status !== 'pending'} onClick={() => cancel.current?.()}>Отменить</button></div><p role="status">Статус: {state.tasks.status}. {state.tasks.message}</p></div>}<details open={mode === 'entities' || mode === 'payload'}><summary>Состояние и последнее действие</summary><p><code>{lastAction}</code></p><pre><code>{JSON.stringify(state, null, 2)}</code></pre></details></div></>;
}
function Instance({ mode }: { mode: string }) {
  const [context] = useState(makeTasksStore);
  useEffect(() => context.dispose, [context]);
  return <Provider store={context.store}><View mode={mode}/></Provider>;
}
export default function TasksLab({ mode = 'basic' }: { mode?: string }) {
  const [key, setKey] = useState(0);
  return <section className="lab" aria-label="Лаборатория задач"><Instance mode={mode} key={key}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Начать заново</button></section>;
}

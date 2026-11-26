import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { makeQueryContext } from './query-lab';
function Instance() {
  const [context] = useState(makeQueryContext);
  const handles = useRef(new Map<string, { unsubscribe(): void; refetch(): unknown }>());
  const [active, setActive] = useState<string[]>([]);
  const state = useSyncExternalStore(context.store.subscribe, context.store.getState, context.store.getState);
  const result = context.api.endpoints.getPost.select(1)(state);
  function subscribe(name: string) { if (handles.current.has(name)) return; handles.current.set(name, context.store.dispatch(context.api.endpoints.getPost.initiate(1))); setActive([...handles.current.keys()]); }
  function unsubscribe(name: string) { handles.current.get(name)?.unsubscribe(); handles.current.delete(name); setActive([...handles.current.keys()]); }
  useEffect(() => () => { handles.current.forEach(handle => handle.unsubscribe()); handles.current.clear(); context.store.dispatch(context.api.util.resetApiState()); }, [context]);
  return <div className="tasks-body"><p>Здесь нет useQuery и Provider. Кнопки вызывают initiate и unsubscribe; React только отображает снимок store через useSyncExternalStore.</p>{['A', 'B'].map(name => <div className="button-row filter-row" key={name}><strong>Подписка {name}</strong><button disabled={active.includes(name)} onClick={() => subscribe(name)}>Создать {name}</button><button disabled={!active.includes(name)} onClick={() => unsubscribe(name)}>Снять {name}</button></div>)}<button disabled={!active.length || result.isLoading} onClick={() => handles.current.values().next().value?.refetch()}>Refetch через handle</button><p role="status">Активные ручные подписки: {active.join(', ') || 'нет'}. Статус: {result.status}.</p><p>Выполнено запросов: {context.getRequestCount()}</p><pre><code>{JSON.stringify(state.labApi.queries, null, 2)}</code></pre><p className="muted">select читает данные без новой подписки. После снятия последней подписки запись живёт ещё 3 секунды — учебное значение keepUnusedDataFor.</p></div>;
}
export default function ManualQueryLab() { const [key, setKey] = useState(0); return <section className="lab"><div className="lab-top"><h3>Управляем подписками вручную</h3></div><Instance key={key}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Удалить подписки и сбросить кэш</button></section>; }

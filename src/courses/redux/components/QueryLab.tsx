import { useEffect, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { makeQueryContext, type QueryContext } from './query-lab';
function Subscriber({ context, id, name, fail, showOverlap }: { context: QueryContext; id: number; name: string; fail: boolean; showOverlap?: boolean }) {
  const q = context.api.useGetPostQuery(id);
  const [edit, mutation] = context.api.useEditPostMutation();
  const [optimistic, optimisticResult] = context.api.useEditOptimisticMutation();
  const [title, setTitle] = useState('Новое название');
  const [message, setMessage] = useState('');
  const [overlapRunning, setOverlapRunning] = useState(false);
  const busy = overlapRunning || q.isFetching || mutation.isLoading || optimisticResult.isLoading;
  async function update(early: boolean) {
    setMessage('');
    try { await (early ? optimistic : edit)({ id, title, fail }).unwrap(); setMessage('Сервер подтвердил изменение'); }
    catch { setMessage(early ? 'Ошибка: сверяем название с сервером' : 'Ошибка: изменение не сохранено'); }
  }
  async function runOverlap() {
    setOverlapRunning(true);
    setMessage('');
    const results = await Promise.allSettled([
      optimistic({ id, title: 'Первая правка', fail: true }).unwrap(),
      optimistic({ id, title: 'Вторая   правка' }).unwrap(),
    ]);
    setMessage(results[0].status === 'rejected' && results[1].status === 'fulfilled'
      ? 'Первая правка завершилась ошибкой, вторая сохранена.'
      : 'Запросы завершились. Посмотри журнал учебного API.');
    setOverlapRunning(false);
  }
  return <div className="subscriber"><span className="eyebrow">Компонент {name} · id {id}</span><h3>{q.isLoading ? 'Первая загрузка…' : q.currentData?.title ?? 'Нет данных'}</h3><p className="muted" role="status">isLoading: {String(q.isLoading)} · isFetching: {String(q.isFetching)} · isError: {String(q.isError)}</p><button disabled={q.isFetching} onClick={() => q.refetch()}>Refetch</button><label>Новое название<input value={title} onChange={e => setTitle(e.target.value)} maxLength={90}/></label><div className="button-row"><button disabled={busy || !title.trim()} onClick={() => update(false)}>Mutation + tags</button><button disabled={busy || !q.currentData || !title.trim()} onClick={() => update(true)}>Оптимистически</button>{showOverlap && <button disabled={busy || !q.currentData} onClick={runOverlap}>Запустить две правки</button>}</div><p role="status">{message}</p></div>;
}
function Inspector({ context }: { context: QueryContext }) {
  const queries = useSelector((s: ReturnType<QueryContext['store']['getState']>) => s.labApi.queries);
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick(t => t + 1), 150); return () => clearInterval(timer); }, []);
  return <div className="query-inspector"><p><strong>Выполнено запросов: {context.getRequestCount()}</strong></p><span className="small-label">Настоящие записи кэша RTK Query</span><pre><code>{JSON.stringify(queries, (key, value) => ['requestId', 'startedTimeStamp', 'fulfilledTimeStamp'].includes(key) ? undefined : value, 2)}</code></pre><details><summary>Журнал учебного API</summary><ol>{context.events.map((event, i) => <li key={i}><code>{event}</code></li>)}</ol></details></div>;
}
function Instance({ showOverlap }: { showOverlap: boolean }) {
  const [context] = useState(makeQueryContext);
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [id, setId] = useState(1);
  const [fail, setFail] = useState(false);
  useEffect(() => () => { context.store.dispatch(context.api.util.resetApiState()); }, [context]);
  return <Provider store={context.store}><div className="lab-top"><div><span className="eyebrow">Лаборатория серверных данных</span><h3>Подписки, кэш и обновления</h3></div><span className="status">● RTK Query</span></div><div className="tasks-body"><p className="muted">Сеть заменена учебным API в памяти: задержка 450 мс. Кэш, подписки, теги и оптимистические обновления выполняет настоящий RTK Query. Данные сбрасываются при выходе или сбросе стенда.</p><div className="button-row"><label><input type="checkbox" checked={a} onChange={e => setA(e.target.checked)}/> Компонент A</label><label><input type="checkbox" checked={b} onChange={e => setB(e.target.checked)}/> Компонент B</label><label>ID для B <select value={id} onChange={e => setId(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label></div><label><input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)}/> Ошибка следующей мутации</label><div className="subscribers">{a && <Subscriber context={context} id={1} name="A" fail={fail} showOverlap={showOverlap}/>} {b && <Subscriber context={context} id={id} name="B" fail={fail}/>}</div><p className="muted">В стенде keepUnusedDataFor = 3 секунды. Отключи оба компонента и наблюдай удаление записи. По умолчанию в RTK Query — 60 секунд.</p><Inspector context={context}/></div></Provider>;
}
export default function QueryLab({ showOverlap = false }: { showOverlap?: boolean }) {
  const [key, setKey] = useState(0);
  return <section className="lab" aria-label="Лаборатория RTK Query"><Instance key={key} showOverlap={showOverlap}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Сбросить сервер и кэш</button></section>;
}

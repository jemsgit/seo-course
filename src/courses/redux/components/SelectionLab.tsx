import { memo, useEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { makeSelectionContext } from './advanced';
type Context = ReturnType<typeof makeSelectionContext>;
const AllEntries = memo(function AllEntries({ api }: { api: Context['api'] }) {
  const result = api.useGetEntriesQuery();
  const renders = useRef(0); renders.current++;
  return <div className="subscriber"><span className="eyebrow">Весь результат</span><h3>Все записи</h3><ul>{result.data?.map(entry => <li key={entry.id}>{entry.title}</li>)}</ul><p>Вызовов рендера: {renders.current}</p></div>;
});
const FirstEntry = memo(function FirstEntry({ api }: { api: Context['api'] }) {
  const { entry } = api.useGetEntriesQuery(undefined, { selectFromResult: ({ data }) => ({ entry: data?.find(item => item.id === 1) }) });
  const renders = useRef(0); renders.current++;
  return <div className="subscriber"><span className="eyebrow">selectFromResult</span><h3>Только запись 1</h3><p>{entry?.title ?? 'Загрузка…'}</p><p>Вызовов рендера: {renders.current}</p></div>;
});
function Instance() {
  const [context] = useState(makeSelectionContext);
  const [ready, setReady] = useState(false);
  const edits = useRef(0);
  useEffect(() => { const request = context.store.dispatch(context.api.endpoints.getEntries.initiate()); request.then(() => setReady(true)); return () => { request.unsubscribe(); context.store.dispatch(context.api.util.resetApiState()); }; }, [context]);
  function edit(id: number) { const revision = ++edits.current; context.store.dispatch(context.api.util.updateQueryData('getEntries', undefined, draft => { const entry = draft.find(item => item.id === id); if (entry) entry.title = `Запись ${id}, изменение ${revision}`; })); }
  return <Provider store={context.store}><div className="tasks-body"><div className="button-row"><button disabled={!ready} onClick={() => edit(2)}>Изменить только запись 2</button><button disabled={!ready} onClick={() => edit(1)}>Изменить запись 1</button></div><div className="subscribers"><AllEntries api={context.api}/><FirstEntry api={context.api}/></div><p className="muted">Сравни прибавление счётчиков, а не абсолютные числа: режим разработки React может вызывать рендер дополнительно. Карточки изолированы через memo; новых сетевых запросов при этих правках нет.</p></div></Provider>;
}
export default function SelectionLab() { const [key, setKey] = useState(0); return <section className="lab"><div className="lab-top"><h3>Одна запись меняется — кто обновится?</h3></div><Instance key={key}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Сбросить наблюдение</button></section>; }

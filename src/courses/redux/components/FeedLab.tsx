import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeFeedContext } from './feed';
type FeedContext = ReturnType<typeof makeFeedContext>;

function View({ context }: { context: FeedContext }) {
  const [category, setCategory] = useState('Redux');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const { currentData, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage, hasNextPage } =
    context.api.useFeedInfiniteQuery(category);

  return <div className="tasks-body">
    <label>Категория <select value={category} onChange={event => setCategory(event.target.value)}>
      <option>Redux</option>
      <option>RTK Query</option>
    </select></label>
    <label><input type="checkbox" checked={simulateFailure} onChange={event => {
      const enabled = event.target.checked;
      setSimulateFailure(enabled);
      context.setPageFailure(enabled);
    }} /> Имитировать ошибку подгрузки</label>
    <ul aria-busy={isFetching}>
      {currentData?.pages.flatMap(page => page.items).map(item => <li key={item.id}>{item.title}</li>)}
    </ul>
    {isFetchNextPageError && <p role="alert">Не удалось загрузить следующую страницу.</p>}
    <button className="primary" disabled={isFetching || !hasNextPage} onClick={() => fetchNextPage()}>
      {isFetchingNextPage ? 'Загружаем страницу…'
        : isFetching ? 'Загружаем ленту…'
        : isFetchNextPageError ? 'Повторить загрузку'
        : hasNextPage ? 'Загрузить ещё' : 'Все страницы загружены'}
    </button>
    <p role="status">Страниц: {currentData?.pages.length ?? 0}; pageParams: {JSON.stringify(currentData?.pageParams ?? [])}</p>
    <details><summary>Структура currentData</summary><pre><code>{JSON.stringify(currentData ?? null, null, 2)}</code></pre></details>
  </div>;
}
function Instance() {
  const [context] = useState(makeFeedContext);
  useEffect(() => () => { context.store.dispatch(context.api.util.resetApiState()); }, [context]);
  return <Provider store={context.store}><View context={context}/></Provider>;
}
export default function FeedLab() {
  const [key, setKey] = useState(0);
  return <section className="lab"><div className="lab-top"><div><span className="eyebrow">Настоящий infiniteQuery</span><h3>Три страницы в одной записи</h3></div></div><Instance key={key}/><button className="reset" onClick={() => setKey(k => k + 1)}>↺ Сбросить ленту</button></section>;
}

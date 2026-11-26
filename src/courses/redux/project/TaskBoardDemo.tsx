import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { TaskBoard } from './TaskBoard';
import { createDemoApi } from './demo-api';
import { createTaskBoard } from './tasks-api';
import './board.css';

export default function TaskBoardDemo() {
  const [{ demo, api, store }] = useState(() => {
    const demo = createDemoApi();
    return { demo, ...createTaskBoard(demo.fetch) };
  });
  useEffect(() => () => {
    store.dispatch(api.util.resetApiState());
  }, [api, store]);

  return <section className="lab project-board" aria-label="Проект со списком задач">
    <div className="tasks-body">
      <label><input type="checkbox" onChange={event => demo.setRejectSaves(event.target.checked)} /> Имитировать ошибку сохранения</label>
      <Provider store={store}><TaskBoard api={api} /></Provider>
    </div>
  </section>;
}

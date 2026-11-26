import { useEffect, useState, type FormEvent } from 'react';
import type { Task, TaskBoardApi } from './tasks-api';

type Filter = 'all' | 'open' | 'done';

function readFilter(): Filter {
  const value = new URLSearchParams(window.location.search).get('status');
  return value === 'open' || value === 'done' ? value : 'all';
}

function TaskRow({ task, api }: { task: Task; api: TaskBoardApi }) {
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState(false);
  const [renameTask, { isLoading }] = api.useRenameTaskMutation();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft?.trim();
    if (isLoading || !title) return;
    setError(false);
    try {
      await renameTask({ id: task.id, title }).unwrap();
      setDraft(undefined);
    } catch {
      setError(true);
    }
  }

  return <li>
    <span>{task.title}</span>{' '}
    <small>{task.done ? 'Готово' : 'В работе'}</small>{' '}
    {draft === undefined
      ? <button onClick={() => {
        setError(false);
        setDraft(task.title);
      }} aria-label={`Переименовать: ${task.title}`}>Переименовать</button>
      : <form onSubmit={save}>
        <label>Новое название <input value={draft} maxLength={100} required disabled={isLoading}
          onChange={event => setDraft(event.target.value)} /></label>
        <button disabled={isLoading || !draft.trim()}>{isLoading ? 'Сохраняем…' : 'Сохранить'}</button>
        <button type="button" disabled={isLoading} onClick={() => setDraft(undefined)}>Отмена</button>
        {error && <p role="alert">Не удалось сохранить. Можно повторить попытку.</p>}
      </form>}
  </li>;
}

export function TaskBoard({ api }: { api: TaskBoardApi }) {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: tasks, isFetching, isError, refetch } = api.useGetTasksQuery();

  useEffect(() => {
    const sync = () => setFilter(readFilter());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  function changeFilter(next: Filter) {
    if (next === filter) return;
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('status');
    else url.searchParams.set('status', next);
    window.history.pushState(window.history.state, '', url);
    setFilter(next);
  }

  const visible = tasks?.filter(task => filter === 'all' || task.done === (filter === 'done'));

  return <div className="task-board">
    <label>Показать задачи <select value={filter} onChange={event => changeFilter(event.target.value as Filter)}>
      <option value="all">Все</option>
      <option value="open">В работе</option>
      <option value="done">Готовые</option>
    </select></label>
    {isFetching && <p role="status">{tasks ? 'Обновляем список…' : 'Загружаем задачи…'}</p>}
    {isError && <p role="alert">Не удалось загрузить список. <button onClick={() => refetch()}>Повторить</button></p>}
    {visible && (visible.length
      ? <ul aria-label="Задачи" aria-busy={isFetching}>{visible.map(task => <TaskRow key={task.id} task={task} api={api} />)}</ul>
      : <p>Под этот фильтр нет задач.</p>)}
  </div>;
}

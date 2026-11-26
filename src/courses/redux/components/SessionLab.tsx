import { useEffect, useState, useSyncExternalStore } from 'react';
import { Provider } from 'react-redux';
import { skipToken } from '@reduxjs/toolkit/query';
import { makeSessionContext } from './session-lab';

type Context = ReturnType<typeof makeSessionContext>;

function SessionControls({ context }: { context: Context }) {
  const [account, setAccount] = useState<string>();
  const events = useSyncExternalStore(context.subscribe, context.getEvents, context.getEvents);
  const profile = context.api.usePrivatePanelQuery(account ? 'profile' : skipToken);
  const tasks = context.api.usePrivatePanelQuery(account ? 'tasks' : skipToken);

  function signIn(name: string) {
    context.signIn(name);
    setAccount(name);
  }

  return <div className="tasks-body">
    <div className="button-row">
      <button disabled={!!account} onClick={() => signIn('Анна')}>Войти как Анна</button>
      <button disabled={!!account} onClick={() => signIn('Борис')}>Войти как Борис</button>
      <button disabled={!account} onClick={() => {
        context.signOut();
        setAccount(undefined);
      }}>Выйти</button>
    </div>
    <p role="status">{account
      ? [profile.currentData, tasks.currentData].filter(Boolean).join(' · ') || 'Загружаем профиль и задачи…'
      : 'Вход не выполнен. Приватные данные скрыты.'}</p>
    <details open><summary>Журнал учебного API</summary>
      <ol>{events.map((event, index) => <li key={index}><code>{event}</code></li>)}</ol>
    </details>
  </div>;
}

export default function SessionLab() {
  const [context] = useState(() => makeSessionContext());
  useEffect(() => () => context.signOut(), [context]);
  return <section className="lab" aria-label="Лаборатория сессии RTK Query">
    <div className="lab-top"><h3>Профиль и задачи при истёкшем доступе</h3></div>
    <Provider store={context.store}><SessionControls context={context} /></Provider>
  </section>;
}

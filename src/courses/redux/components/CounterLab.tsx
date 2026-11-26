import { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { makeStore, increment, decrement, type RootState, type Trace } from './counter';
const stages = ['Действие', 'Dispatch', 'Reducer', 'Store', 'Интерфейс'];
function Lab() {
  const [history, setHistory] = useState<Trace[]>([]);
  const [store] = useState(() => makeStore(t => setHistory(h => [...h, t])));
  return <Provider store={store}><Controls history={history} /></Provider>;
}
function Controls({ history }: { history: Trace[] }) {
  const value = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const trace = history[selected ?? history.length - 1];
  const explanations = trace ? [
    `Создан объект действия: ${JSON.stringify(trace.action)}. Он описывает событие, но сам состояние не меняет.`,
    'dispatch передал действие в Redux store через цепочку middleware.',
    `Reducer получил прежнее состояние (${trace.before}) и действие. Он вычислил новое значение: ${trace.after}.`,
    `Store сохранил новое состояние и уведомил подписчиков. К моменту возврата из этого синхронного dispatch значение уже равно ${trace.after}.`,
    `useSelector читает counter.value. Значение изменилось, поэтому React Redux запрашивает обновление компонента. React отображает ${trace.after}.`,
  ] : [];
  function send(direction: 'up' | 'down') { dispatch(direction === 'up' ? increment() : decrement()); setSelected(null); setStep(0); }
  return <>
    <div className="lab-top"><div><span className="eyebrow">Живой пример</span><h3>Заглянем внутрь Redux</h3></div><span className="status">● Настоящий store</span></div>
    <div className="lab-grid"><div className="counter-panel"><span className="small-label">Значение в интерфейсе</span><output className="counter-value" aria-live="polite">{value}</output><div className="button-row"><button onClick={() => send('down')} aria-label="Уменьшить на один">−1</button><button className="primary" onClick={() => send('up')} aria-label="Увеличить на один">+1</button></div><p className="muted">Нажми кнопку. Затем разбери действие по шагам.</p></div><div className="state-panel"><span className="small-label">Текущее состояние store</span><pre><code>{JSON.stringify({ counter: { value } }, null, 2)}</code></pre><span className="small-label">Последнее действие</span><code className="action-code">{history.length ? history[history.length - 1].action.type : 'Пока нет действий'}</code></div></div>
    {trace ? <div className="replay"><div className="replay-heading"><strong>Разбор записи #{(selected ?? history.length - 1) + 1}</strong><span>{step + 1} / 5</span></div><div className="stages" aria-label="Этапы обновления">{stages.map((name, i) => <button key={name} aria-pressed={step === i} onClick={() => setStep(i)}>{i + 1}. {name}</button>)}</div><p aria-live="polite">{explanations[step]}</p><div className="diff"><code>До: {trace.before}</code><span>→</span><code>После: {trace.after}</code></div><div className="button-row"><button disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Назад</button><button disabled={step === 4} onClick={() => setStep(s => s + 1)}>Далее →</button></div><p className="muted">Это разбор уже выполненной операции. Реальный dispatch синхронный; React обновляет интерфейс отдельно.</p></div> : <p className="empty-state">Первое нажатие запишет action и состояния до и после.</p>}
    <details><summary>История действий ({history.length})</summary>{history.length ? <ol className="history">{history.map((t, i) => <li key={i}><button onClick={() => { setSelected(i); setStep(0); }}>{i + 1}. {t.action.type}: {t.before} → {t.after}</button></li>)}</ol> : <p>История пока пуста.</p>}</details>
  </>;
}
export default function CounterLab() {
  const [session, setSession] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  return <section className="lab" aria-label="Интерактивная лаборатория Redux"><Lab key={session}/><div className="quiz"><span className="eyebrow">Проверь себя</span><h3>А если отправить три действия?</h3><p>Независимый пример: начальное значение — 0. Отправляем increment, increment, decrement. Какое значение получится?</p><form onSubmit={e => { e.preventDefault(); setChecked(true); }}><label htmlFor="answer">Твой ответ</label><div className="button-row"><input id="answer" type="number" required value={answer} onChange={e => { setAnswer(e.target.value); setChecked(false); }}/><button className="primary" type="submit">Проверить</button></div></form>{checked && <p className="feedback" role="status">{Number(answer) === 1 ? 'Верно!' : 'Попробуй ещё раз.'} Каждое действие работает с результатом предыдущего: 0 → 1 → 2 → 1. Итог — 1.</p>}</div><button className="reset" onClick={() => { setSession(s => s + 1); setAnswer(''); setChecked(false); }}>↺ Сбросить стенд и задание</button><noscript>Для стенда нужен JavaScript. Объяснение и исходный код доступны ниже.</noscript></section>;
}

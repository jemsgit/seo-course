import { useEffect, useRef, useState } from 'react';
import { makeResilienceContext, type ResilienceMode } from './advanced';
export default function RetryLab() {
  const [mode, setMode] = useState<ResilienceMode>('transient');
  const [retries, setRetries] = useState(2);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [message, setMessage] = useState('Выбери сценарий и запусти запрос.');
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  async function run() {
    cleanup.current?.(); setBusy(true); setEvents([]); setMessage('Запрос выполняется…');
    const context = makeResilienceContext(mode, retries);
    const request = context.store.dispatch(context.api.endpoints.getMessage.initiate());
    const timer = setInterval(() => setEvents([...context.events]), 30);
    let mounted = true;
    cleanup.current = () => { mounted = false; clearInterval(timer); request.abort(); request.unsubscribe(); context.store.dispatch(context.api.util.resetApiState()); };
    const result = await request;
    clearInterval(timer);
    if (mounted) { setEvents([...context.events]); setMessage(result.error ? `Завершено ошибкой: ${JSON.stringify(result.error)}` : `Успех: ${result.data?.message}`); setBusy(false); }
    request.unsubscribe(); context.store.dispatch(context.api.util.resetApiState());
  }
  return <section className="lab"><div className="lab-top"><h3>Сколько попыток будет на самом деле?</h3></div><div className="tasks-body"><label>Сценарий <select disabled={busy} value={mode} onChange={e => setMode(e.target.value as ResilienceMode)}><option value="transient">503, 503, затем успех</option><option value="permanent">401 — остановка повторов</option><option value="timeout">Ответ медленнее таймаута</option></select></label><label> Максимум повторов <select disabled={busy} value={retries} onChange={e => setRetries(Number(e.target.value))}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label><p className="muted">Настоящие retry и fetchBaseQuery, транспорт — учебная fetchFn без внешней сети. Таймаут 120 мс, ожидание между повторами 180 мс. Это ускоренные учебные настройки.</p><div className="button-row"><button className="primary" disabled={busy} onClick={run}>Запустить</button><button onClick={() => { cleanup.current?.(); setBusy(false); setEvents([]); setMessage('Стенд сброшен.'); }}>↺ Сбросить</button></div><p role="status">{message}</p><ol>{events.map((event, i) => <li key={i}>{event}</li>)}</ol></div></section>;
}

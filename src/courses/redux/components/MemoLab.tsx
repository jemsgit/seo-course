import { createSelector } from '@reduxjs/toolkit';
import { useState } from 'react';
type State = { tasks: { id: number; done: boolean }[]; theme: number };
function createExperiment() {
  const selector = createSelector([(s: State) => s.tasks], tasks => tasks.filter(task => !task.done));
  const state: State = { tasks: [{ id: 1, done: false }, { id: 2, done: true }], theme: 0 };
  const result = selector(state);
  return { selector, state, result };
}
export default function MemoLab() {
  const [experiment] = useState(createExperiment);
  const [observation, setObservation] = useState({ computations: 1, same: true, label: 'Первый вызов селектора', count: 1 });
  function run(change: 'none' | 'theme' | 'tasks') {
    const previous = experiment.result;
    if (change === 'theme') experiment.state = { ...experiment.state, theme: experiment.state.theme + 1 };
    if (change === 'tasks') experiment.state = { ...experiment.state, tasks: experiment.state.tasks.map(task => task.id === 1 ? { ...task, done: !task.done } : task) };
    experiment.result = experiment.selector(experiment.state);
    setObservation({ computations: experiment.selector.recomputations(), same: previous === experiment.result, label: change === 'none' ? 'Повторное чтение' : change === 'theme' ? 'Изменили только тему' : 'Изменили массив задач', count: experiment.result.length });
  }
  return <section className="lab"><div className="lab-top"><div><span className="eyebrow">Наблюдаем вычисления</span><h3>Когда работает createSelector?</h3></div></div><div className="tasks-body"><div className="button-row"><button onClick={() => run('none')}>Прочитать снова</button><button onClick={() => run('theme')}>Сменить тему в данных</button><button onClick={() => run('tasks')}>Переключить задачу</button></div><div role="status"><p>{observation.label}</p><p>Вычислений результата: <strong>{observation.computations}</strong></p><p>Ссылка совпала с предыдущей: <strong>{String(observation.same)}</strong>. Активных задач: {observation.count}.</p></div><p className="muted">Это счётчик результирующей функции настоящего createSelector, а не счётчик рендеров React. Поле theme не входит во входы селектора.</p><button onClick={() => { const fresh = createExperiment(); Object.assign(experiment, fresh); setObservation({ computations: 1, same: true, label: 'Первый вызов селектора', count: 1 }); }}>↺ Сбросить эксперимент</button></div></section>;
}

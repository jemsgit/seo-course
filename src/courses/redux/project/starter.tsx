import { createRoot } from 'react-dom/client';
import './board.css';

function Starter() {
  return <section className="task-board">
    <label>Показать задачи <select defaultValue="all">
      <option value="all">Все</option>
      <option value="open">В работе</option>
      <option value="done">Готовые</option>
    </select></label>
    <p>Подключи store и выведи список задач из API.</p>
  </section>;
}

createRoot(document.getElementById('root')!).render(<Starter />);

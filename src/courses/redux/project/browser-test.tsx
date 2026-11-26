import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { TaskBoard } from './TaskBoard';
import { createDemoApi } from './demo-api';
import { createTaskBoard, type Transport } from './tasks-api';

const container = document.getElementById('root')!;
const status = document.getElementById('result')!;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function until(condition: () => unknown, message: string) {
  const end = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() >= end) throw new Error(message);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

function setField(field: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

async function run() {
  const demo = createDemoApi(0);
  const methods: string[] = [];
  const transport: Transport = (input, init) => {
    const request = new Request(input, init);
    methods.push(request.method);
    return demo.fetch(request);
  };
  const { api, store } = createTaskBoard(transport);
  const root = createRoot(container);
  const originalUrl = window.location.href;
  const url = new URL(originalUrl);
  url.searchParams.set('status', 'done');
  window.history.replaceState(null, '', url);

  const list = () => container.querySelector('ul');
  const select = () => container.querySelector('select')!;
  const button = (label: string) => [...container.querySelectorAll('button')].find(el => el.textContent === label);
  try {
    root.render(<Provider store={store}><TaskBoard api={api} /></Provider>);
    await until(() => list()?.children.length === 1 && select().value === 'done', 'Фильтр из URL не применился');
    check(list()?.textContent?.includes('Подключить Redux store'), 'Показана не та задача');
    setField(select(), 'open');
    await until(() => list()?.children.length === 2, 'Фильтр в работе не применился');
    check(new URLSearchParams(location.search).get('status') === 'open', 'URL не обновился');
    check(methods.join(',') === 'GET', 'Фильтрация запустила лишний запрос');

    history.back();
    await until(() => select().value === 'done', 'Кнопка Назад не восстановила фильтр');
    setField(select(), 'open');
    await until(() => list()?.children.length === 2, 'Открытые задачи не появились снова');

    button('Переименовать')!.click();
    await until(() => container.querySelector('input'), 'Форма не открылась');
    const title = 'Проверить инвалидацию кэша';
    setField(container.querySelector('input')!, title);
    demo.setRejectSaves(true);
    button('Сохранить')!.click();
    await until(() => container.querySelector('[role="alert"]'), 'Ошибка сохранения не показана');
    check(container.querySelector('input')?.value === title, 'Черновик пропал');
    check(list()?.textContent?.includes('Добавить фильтр задач'), 'Список изменился после ошибки');
    check(methods.join(',') === 'GET,PATCH', 'После ошибки список запросили повторно');

    demo.setRejectSaves(false);
    button('Сохранить')!.click();
    await until(() => list()?.textContent?.includes(title), 'Название не обновилось после сохранения');
    check(!container.querySelector('input'), 'Форма осталась открыта');
    check(methods.join(',') === 'GET,PATCH,PATCH,GET', 'После успеха ожидалось повторное чтение');
  } finally {
    root.unmount();
    store.dispatch(api.util.resetApiState());
    window.history.replaceState(null, '', originalUrl);
  }
}

run().then(() => {
  status.dataset.result = 'passed';
  status.textContent = 'Тест пройден.';
}, error => {
  status.dataset.result = 'failed';
  status.textContent = String(error);
  console.error(error);
});

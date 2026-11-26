import type { Task, Transport } from './tasks-api';

export function createDemoApi(delay = 400) {
  const tasks: Task[] = [
    { id: 1, title: 'Подключить Redux store', done: true },
    { id: 2, title: 'Добавить фильтр задач', done: false },
    { id: 3, title: 'Проверить ошибку сохранения', done: false },
  ];
  let rejectSaves = false;

  const fetch: Transport = async (input, init) => {
    const request = new Request(input, init);
    await new Promise(resolve => setTimeout(resolve, delay));
    request.signal.throwIfAborted();
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/api/tasks') {
      return Response.json(tasks);
    }

    const match = pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (request.method === 'PATCH' && match) {
      if (rejectSaves) return Response.json({ message: 'Учебная ошибка сохранения' }, { status: 503 });
      const task = tasks.find(task => task.id === Number(match[1]));
      if (!task) return Response.json({ message: 'Задача не найдена' }, { status: 404 });
      const { title } = await request.json();
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) {
        return Response.json({ message: 'Нужно название от 1 до 100 символов' }, { status: 400 });
      }
      task.title = title.trim();
      return Response.json(task);
    }

    return Response.json({ message: 'Маршрут не найден' }, { status: 404 });
  };

  return { fetch, setRejectSaves(enabled: boolean) { rejectSaves = enabled; } };
}

import { useId, useState } from 'react';
export default function Quiz({ question, options, correct, explanation }: { question: string; options: string[]; correct: number; explanation: string }) {
  const id = useId();
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  return <section className="quiz standalone-quiz"><span className="eyebrow">Проверь понимание</span><form onSubmit={e => { e.preventDefault(); if (choice !== null) setChecked(true); }}><fieldset><legend>{question}</legend>{options.map((option, i) => <label className="quiz-option" key={option}><input type="radio" name={id} required checked={choice === i} onChange={() => { setChoice(i); setChecked(false); }}/><span>{option}</span></label>)}</fieldset><button className="primary" type="submit" disabled={choice === null}>Проверить ответ</button></form>{checked && <p className="feedback" role="status"><strong>{choice === correct ? 'Верно. ' : 'Пока неверно. '}</strong>{explanation}</p>}<noscript>Для проверки ответа включи JavaScript. Разбор темы и примеры кода доступны на странице.</noscript></section>;
}

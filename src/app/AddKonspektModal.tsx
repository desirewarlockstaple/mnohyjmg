import { useMemo, useState } from 'react';
import type { Konspekt } from '../game/common/types';
import {
  addCustomKonspekt,
  newCustomKonspektId,
  type CustomKonspekt,
} from '../data/customKonspekts';
import { parseQuestionsText } from '../data/questionParser';

interface AddKonspektModalProps {
  onClose: () => void;
  onSaved: (k: CustomKonspekt) => void;
}

const EXAMPLE = `Q: Что такое филология?
A) Наука о языке и текстах *
B) Раздел физики
C) Учение о растениях

Q: Кто написал «Войну и мир»?
A) Лев Толстой *
B) Фёдор Достоевский
C) Антон Чехов

Q: Что изучает фонетика?
A) Звуки речи *
B) Состав слова
C) Историю народов`;

export function AddKonspektModal({ onClose, onSaved }: AddKonspektModalProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState(EXAMPLE);
  const [showExample, setShowExample] = useState(false);

  const parsed = useMemo(() => parseQuestionsText(text, 'preview'), [text]);

  const canSave = title.trim().length >= 2 && parsed.questions.length >= 1;

  const handleSave = () => {
    if (!canSave) return;
    const id = newCustomKonspektId();
    const reParsed = parseQuestionsText(text, id);
    const k: CustomKonspekt = {
      id,
      title: title.trim(),
      subject: subject.trim() || undefined,
      topicTags: [],
      questions: reParsed.questions,
      source: 'user',
      createdAt: Date.now(),
    };
    addCustomKonspekt(k);
    onSaved(k);
  };

  return (
    <div className="overlay-root" role="dialog" aria-modal="true">
      <div className="card wide" style={{ maxWidth: 720 }}>
        <div className="title-2">Загрузить свой конспект</div>
        <div className="muted">
          Введите название и список вопросов. Правильный вариант помечается
          звёздочкой <span className="kbd">*</span> в конце строки. Можно вставить и JSON.
        </div>
        <div className="ak-fields">
          <label className="ak-label">
            <span>Название</span>
            <input
              className="ak-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Основы филологии"
              maxLength={120}
            />
          </label>
          <label className="ak-label">
            <span>Предмет (опционально)</span>
            <input
              className="ak-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Филология"
              maxLength={60}
            />
          </label>
          <label className="ak-label">
            <span>
              Вопросы ({parsed.questions.length} {pluralize(parsed.questions.length)})
            </span>
            <textarea
              className="ak-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              spellCheck={false}
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn ghost ak-small"
              onClick={() => setShowExample((v) => !v)}
            >
              {showExample ? 'Скрыть формат' : 'Подсказка по формату'}
            </button>
            <span className="muted ak-warn-row">
              {parsed.warnings.length > 0 ? `⚠ ${parsed.warnings[0]}` : ''}
            </span>
          </div>
          {showExample && (
            <pre className="ak-example">{`Q: Текст вопроса?
A) Вариант 1 *  ← звёздочка = правильный
B) Вариант 2
C) Вариант 3
D) Вариант 4   ← можно 2–4 варианта

Q: Следующий вопрос?
...

# строки, начинающиеся с #, игнорируются
# вместо * можно использовать ✅ или (верно)`}</pre>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" onClick={handleSave} disabled={!canSave}>
            Сохранить конспект
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DeleteKonspektProps {
  konspekt: Konspekt;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteKonspektDialog({ konspekt, onConfirm, onCancel }: DeleteKonspektProps) {
  return (
    <div className="overlay-root" role="dialog" aria-modal="true">
      <div className="card">
        <div className="title-2">Удалить конспект?</div>
        <div className="muted">
          «{konspekt.title}» будет удалён вместе со своими вопросами. Действие
          необратимо для этой сессии.
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onCancel}>
            Отмена
          </button>
          <button className="btn danger" onClick={onConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'вопрос';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'вопроса';
  return 'вопросов';
}

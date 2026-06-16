// game/questions.ts — загрузка набора вопросов (например, public/questions/default-ru.json).
// Question — каноническое определение домена вопроса; state/types.ts реэкспортирует его
// (Game Logic ничего не импортирует из state/, зависимости идут только сверху вниз).

/** Индекс правильного варианта: 0=▲, 1=◆, 2=●, 3=■. */
export type AnswerChoice = 0 | 1 | 2 | 3;

export interface Question {
  questionId: string;
  text: string;
  options: readonly [string, string, string, string];
  correctIndex: AnswerChoice;
  durationMs: number;
}

function isAnswerChoice(value: unknown): value is AnswerChoice {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function parseQuestion(value: unknown, index: number): Question {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Вопрос #${index}: ожидался объект`);
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.questionId !== 'string' || candidate.questionId.length === 0) {
    throw new Error(`Вопрос #${index}: questionId должен быть непустой строкой`);
  }
  if (typeof candidate.text !== 'string' || candidate.text.length === 0) {
    throw new Error(`Вопрос #${index}: text должен быть непустой строкой`);
  }
  if (!Array.isArray(candidate.options) || candidate.options.length !== 4) {
    throw new Error(`Вопрос #${index}: options должен содержать ровно 4 варианта`);
  }
  if (!candidate.options.every((option) => typeof option === 'string')) {
    throw new Error(`Вопрос #${index}: все варианты ответа должны быть строками`);
  }
  if (!isAnswerChoice(candidate.correctIndex)) {
    throw new Error(`Вопрос #${index}: correctIndex должен быть числом 0..3`);
  }
  if (typeof candidate.durationMs !== 'number' || candidate.durationMs <= 0) {
    throw new Error(`Вопрос #${index}: durationMs должен быть положительным числом`);
  }

  const options = candidate.options as string[];

  return {
    questionId: candidate.questionId,
    text: candidate.text,
    options: [options[0], options[1], options[2], options[3]],
    correctIndex: candidate.correctIndex,
    durationMs: candidate.durationMs,
  };
}

/** Загружает и валидирует набор вопросов по указанному пути. */
export async function loadQuestions(path = './questions/default-ru.json'): Promise<Question[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить вопросы (${path}): HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Неверный формат файла вопросов (${path}): ожидался массив`);
  }

  return data.map((item, index) => parseQuestion(item, index));
}

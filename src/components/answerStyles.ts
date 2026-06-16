// components/answerStyles.ts — общие цвета и символы вариантов ответа (UX-правило из CLAUDE.md).
// Символы дублируют цвет для дальтоников: 0=▲ красный, 1=◆ синий, 2=● жёлтый, 3=■ зелёный.

export interface AnswerStyle {
  symbol: string;
  bgClass: string;
}

export const ANSWER_STYLES: readonly [AnswerStyle, AnswerStyle, AnswerStyle, AnswerStyle] = [
  { symbol: '▲', bgClass: 'bg-answer-red' },
  { symbol: '◆', bgClass: 'bg-answer-blue' },
  { symbol: '●', bgClass: 'bg-answer-yellow' },
  { symbol: '■', bgClass: 'bg-answer-green' },
];

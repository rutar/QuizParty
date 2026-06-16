import { describe, expect, it } from 'vitest';
import { transition, type GameEvent } from '../../src/state/machine';
import type { Phase } from '../../src/state/types';

const ALL_PHASES: readonly Phase[] = [
  'idle',
  'lobby',
  'preview',
  'question',
  'reveal',
  'leaderboard',
  'finished',
];

const ALL_EVENT_TYPES: readonly GameEvent['type'][] = [
  'start_lobby',
  'start_preview',
  'start_question',
  'reveal',
  'show_leaderboard',
  'next_question',
  'finish',
  'reset',
];

interface Case {
  phase: Phase;
  event: GameEvent;
  eventType: GameEvent['type'];
  expected: Phase;
}

function makeCase(phase: Phase, event: GameEvent, expected: Phase): Case {
  return { phase, event, eventType: event.type, expected };
}

const VALID_TRANSITIONS: Case[] = [
  makeCase('idle', { type: 'start_lobby' }, 'lobby'),
  makeCase('lobby', { type: 'start_preview' }, 'preview'),
  makeCase('preview', { type: 'start_question' }, 'question'),
  makeCase('question', { type: 'reveal' }, 'reveal'),
  makeCase('reveal', { type: 'show_leaderboard' }, 'leaderboard'),
  makeCase('leaderboard', { type: 'next_question' }, 'preview'),
  makeCase('leaderboard', { type: 'finish' }, 'finished'),
  makeCase('finished', { type: 'start_lobby' }, 'lobby'),
];

const IGNORED_TRANSITIONS: Case[] = [
  makeCase('idle', { type: 'reveal' }, 'idle'),
  makeCase('idle', { type: 'finish' }, 'idle'),
  makeCase('lobby', { type: 'start_question' }, 'lobby'),
  makeCase('preview', { type: 'start_lobby' }, 'preview'),
  makeCase('question', { type: 'start_question' }, 'question'),
  makeCase('reveal', { type: 'next_question' }, 'reveal'),
  makeCase('leaderboard', { type: 'start_preview' }, 'leaderboard'),
  makeCase('finished', { type: 'next_question' }, 'finished'),
];

describe('transition — таблица переходов', () => {
  it.each(VALID_TRANSITIONS)(
    '$phase + $eventType → $expected',
    ({ phase, event, expected }) => {
      expect(transition(phase, event)).toBe(expected);
    },
  );
});

describe('transition — reset работает из любой фазы', () => {
  it.each(ALL_PHASES.map((phase) => ({ phase })))(
    "reset из '$phase' ведёт в idle",
    ({ phase }) => {
      expect(transition(phase, { type: 'reset' })).toBe('idle');
    },
  );
});

describe('transition — неизвестные комбинации не меняют фазу', () => {
  it.each(IGNORED_TRANSITIONS)(
    '$phase + $eventType остаётся $expected',
    ({ phase, event, expected }) => {
      expect(transition(phase, event)).toBe(expected);
    },
  );
});

describe('transition — полнота и чистота', () => {
  const allCombinations = ALL_PHASES.flatMap((phase) =>
    ALL_EVENT_TYPES.map((eventType) => ({ phase, eventType })),
  );

  it.each(allCombinations)(
    '$phase + $eventType не бросает исключение и возвращает валидную фазу',
    ({ phase, eventType }) => {
      const event = { type: eventType } as GameEvent;
      expect(() => transition(phase, event)).not.toThrow();
      expect(ALL_PHASES).toContain(transition(phase, event));
    },
  );

  it('не мутирует входные аргументы', () => {
    const phase: Phase = 'idle';
    const event: GameEvent = { type: 'start_lobby' };
    const eventCopy = { ...event };

    transition(phase, event);

    expect(event).toEqual(eventCopy);
  });

  it('детерминирована: одинаковый вход даёт одинаковый результат', () => {
    const first = transition('leaderboard', { type: 'next_question' });
    const second = transition('leaderboard', { type: 'next_question' });

    expect(first).toBe(second);
  });
});

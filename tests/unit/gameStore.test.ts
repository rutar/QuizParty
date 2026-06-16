import { describe, expect, it, vi } from 'vitest';
import { GAME_STORE_CHANGE_EVENT, GameStore } from '../../src/state/gameStore';
import type { GameEvent } from '../../src/state/machine';
import type { Phase } from '../../src/state/types';

describe('GameStore — начальное состояние', () => {
  it('начинается в фазе idle с пустым состоянием', () => {
    const state = new GameStore().getState();

    expect(state.phase).toBe('idle');
    expect(state.roomCode).toBeNull();
    expect(state.role).toBeNull();
    expect(state.players).toEqual([]);
    expect(state.questions).toEqual([]);
    expect(state.answers).toEqual([]);
    expect(state.connectionState).toBe('disconnected');
  });
});

describe('GameStore — dispatch меняет фазу через transition()', () => {
  it('последовательно проходит весь игровой цикл', () => {
    const store = new GameStore();

    store.dispatch({ type: 'start_lobby' });
    expect(store.getState().phase).toBe('lobby');

    store.dispatch({ type: 'start_preview' });
    expect(store.getState().phase).toBe('preview');

    store.dispatch({ type: 'start_question' });
    expect(store.getState().phase).toBe('question');

    store.dispatch({ type: 'reveal' });
    expect(store.getState().phase).toBe('reveal');

    store.dispatch({ type: 'show_leaderboard' });
    expect(store.getState().phase).toBe('leaderboard');

    store.dispatch({ type: 'finish' });
    expect(store.getState().phase).toBe('finished');
  });

  it('неизвестное для текущей фазы событие не меняет фазу', () => {
    const store = new GameStore();

    store.dispatch({ type: 'reveal' });

    expect(store.getState().phase).toBe('idle');
  });
});

const PATHS_TO_PHASE: Record<Exclude<Phase, 'idle'>, GameEvent[]> = {
  lobby: [{ type: 'start_lobby' }],
  preview: [{ type: 'start_lobby' }, { type: 'start_preview' }],
  question: [
    { type: 'start_lobby' },
    { type: 'start_preview' },
    { type: 'start_question' },
  ],
  reveal: [
    { type: 'start_lobby' },
    { type: 'start_preview' },
    { type: 'start_question' },
    { type: 'reveal' },
  ],
  leaderboard: [
    { type: 'start_lobby' },
    { type: 'start_preview' },
    { type: 'start_question' },
    { type: 'reveal' },
    { type: 'show_leaderboard' },
  ],
  finished: [
    { type: 'start_lobby' },
    { type: 'start_preview' },
    { type: 'start_question' },
    { type: 'reveal' },
    { type: 'show_leaderboard' },
    { type: 'finish' },
  ],
};

describe('GameStore — reset работает из любой достигнутой фазы', () => {
  it.each(Object.entries(PATHS_TO_PHASE) as [Phase, GameEvent[]][])(
    'reset из фазы %s возвращает store в idle',
    (phase, path) => {
      const store = new GameStore();
      for (const event of path) {
        store.dispatch(event);
      }
      expect(store.getState().phase).toBe(phase);

      store.dispatch({ type: 'reset' });

      expect(store.getState().phase).toBe('idle');
    },
  );

  it('reset из idle оставляет store в idle', () => {
    const store = new GameStore();

    store.dispatch({ type: 'reset' });

    expect(store.getState().phase).toBe('idle');
  });
});

describe('GameStore — нотификация подписчиков', () => {
  it('dispatch вызывает GAME_STORE_CHANGE_EVENT', () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.addEventListener(GAME_STORE_CHANGE_EVENT, listener);

    store.dispatch({ type: 'start_lobby' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispatch вызывает событие даже без смены фазы', () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.addEventListener(GAME_STORE_CHANGE_EVENT, listener);

    store.dispatch({ type: 'reveal' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('GameStore — getState возвращает копию', () => {
  it('мутация результата getState не влияет на внутреннее состояние', () => {
    const store = new GameStore();
    const state = store.getState();

    state.players.push({
      playerId: 'p1',
      nickname: 'tester',
      score: 0,
      connected: true,
    });

    expect(store.getState().players).toEqual([]);
  });

  it('повторные вызовы getState возвращают разные ссылки на массивы', () => {
    const store = new GameStore();

    expect(store.getState().players).not.toBe(store.getState().players);
  });
});

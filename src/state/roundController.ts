// state/roundController.ts — оркестрация раунда: preview → question → answers_closed → reveal.
// С Transport работает только через интерфейс (net/transport.ts).

import { loadQuestions } from '../game/questions';
import { calculateScore } from '../game/scoring';
import { validateAnswer } from '../game/validator';
import { clearState } from '../persistence/storage';
import type {
  AnswerMessage,
  GameMessage,
  QuestionMessage,
  QuestionPreviewMessage,
  RevealMessage,
} from '../net/protocol';
import type { Transport } from '../net/transport';
import type { GameStore } from './gameStore';
import type { AnswerChoice, AnswerRecord, Question } from './types';

const PREVIEW_DURATION_MS = 3000;

interface MyAnswer {
  questionId: string;
  choice: AnswerChoice;
}

/** Данные для восстановления состояния игрока после request_sync. */
interface SyncPayload {
  players?: { playerId: string; nickname: string; score: number }[];
  currentQuestionIndex?: number;
  total?: number;
  questionId?: string;
  deadline?: number;
  durationMs?: number;
  correctIndex?: AnswerChoice;
  distribution?: Record<AnswerChoice, number>;
}

export class RoundController {
  private readonly gameStore: GameStore;
  private readonly transport: Transport;
  private currentDurationMs: number | null = null;
  private myLastAnswer: MyAnswer | null = null;
  private lastPointsGained: number | null = null;
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(gameStore: GameStore, transport: Transport) {
    this.gameStore = gameStore;
    this.transport = transport;
    this.transport.onMessage((message) => this.handleMessage(message));
  }

  /** Хост: загружает вопросы (если ещё не загружены) и запускает первый вопрос раунда. */
  async startRound(): Promise<void> {
    let { questions } = this.gameStore.getState();
    if (questions.length === 0) {
      questions = await loadQuestions();
      this.gameStore.setQuestions(questions);
    }
    const question = questions[0];
    if (question) {
      this.beginPreview(0, question);
    }
  }

  /** Хост: закрывает приём ответов досрочно (или вызывается автоматически по дедлайну). */
  closeAnswers(): void {
    const { currentQuestion } = this.gameStore.getState();
    if (currentQuestion) {
      this.finishQuestion(currentQuestion.questionId);
    }
  }

  /** Хост: переходит от reveal к таблице лидеров и сообщает об этом игрокам. */
  showLeaderboard(): void {
    if (this.gameStore.getState().phase !== 'reveal') {
      return;
    }
    this.gameStore.dispatch({ type: 'show_leaderboard' });
    this.transport.send({ type: 'sync', phase: 'leaderboard', state: null });
  }

  /** Хост: переходит к следующему вопросу или завершает игру. */
  nextQuestion(): void {
    if (this.gameStore.getState().phase !== 'leaderboard') {
      return;
    }
    const { questions, currentQuestionIndex } = this.gameStore.getState();
    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = questions[nextIndex];
    if (nextQuestion) {
      // Сначала диспатчим next_question (leaderboard → preview), потом beginPreview.
      // Внутри beginPreview dispatch(start_preview) — no-op из preview.
      this.gameStore.dispatch({ type: 'next_question' });
      this.beginPreview(nextIndex, nextQuestion);
    } else {
      this.gameStore.dispatch({ type: 'finish' });
      this.transport.send({ type: 'sync', phase: 'finished', state: null });
    }
  }

  /** Хост: начинает новую игру с теми же игроками — сброс очков, возврат в лобби. */
  newGame(): void {
    if (this.gameStore.getState().phase !== 'finished') {
      return;
    }
    this.gameStore.resetForNewGame();
    this.gameStore.dispatch({ type: 'start_lobby' }); // finished → lobby
    const { players } = this.gameStore.getState();
    const summaries = players.map(({ playerId, nickname, score }) => ({ playerId, nickname, score }));
    this.transport.send({ type: 'lobby_update', players: summaries });
    this.transport.send({ type: 'sync', phase: 'lobby', state: null });
  }

  /** Хост: завершает игровую сессию — все возвращаются на стартовый экран. */
  endGame(): void {
    if (this.gameStore.getState().phase !== 'finished') {
      return;
    }
    this.transport.send({ type: 'game_ended' });
    this.gameStore.dispatch({ type: 'reset' }); // → idle
    this.transport.disconnect();
  }

  /** Игрок: отправляет ответ на текущий вопрос. */
  submitAnswer(choice: AnswerChoice): void {
    const { currentQuestion, currentDeadline, localPlayerId } = this.gameStore.getState();
    if (
      !currentQuestion ||
      currentDeadline === null ||
      !localPlayerId ||
      this.currentDurationMs === null ||
      this.myLastAnswer?.questionId === currentQuestion.questionId
    ) {
      return;
    }

    this.myLastAnswer = { questionId: currentQuestion.questionId, choice };
    this.transport.send({
      type: 'answer',
      playerId: localPlayerId,
      questionId: currentQuestion.questionId,
      choice,
      clientTs: Date.now(),
    });
  }

  /** Свой последний отправленный ответ (для экрана reveal у игрока). */
  getMyLastAnswer(): MyAnswer | null {
    return this.myLastAnswer;
  }

  /** Очки, начисленные за последний раскрытый вопрос (для экрана reveal у игрока). */
  getLastPointsGained(): number | null {
    return this.lastPointsGained;
  }

  private beginPreview(index: number, question: Question): void {
    const deadline = Date.now() + PREVIEW_DURATION_MS;
    this.gameStore.setCurrentQuestionIndex(index);
    this.gameStore.setCurrentQuestion(null);
    this.gameStore.setDeadline(deadline);
    this.gameStore.setLastReveal(null);
    this.gameStore.dispatch({ type: 'start_preview' }); // lobby → preview; no-op из preview

    this.transport.send({
      type: 'question_preview',
      questionId: question.questionId,
      index,
      total: this.gameStore.getState().questions.length,
      deadline,
    });

    setTimeout(() => this.beginQuestion(question), PREVIEW_DURATION_MS);
  }

  private beginQuestion(question: Question): void {
    const deadline = Date.now() + question.durationMs;
    this.currentDurationMs = question.durationMs;
    this.myLastAnswer = null;

    this.gameStore.setCurrentQuestion({
      questionId: question.questionId,
      text: question.text,
      options: question.options,
    });
    this.gameStore.setDeadline(deadline);
    this.gameStore.dispatch({ type: 'start_question' });

    this.transport.send({
      type: 'question',
      questionId: question.questionId,
      text: question.text,
      options: question.options,
      durationMs: question.durationMs,
      deadline,
    });

    this.closeTimeoutId = setTimeout(() => this.finishQuestion(question.questionId), question.durationMs);
  }

  /** Хост: считает распределение ответов и рассылает reveal. Идемпотентна по фазе. */
  private finishQuestion(questionId: string): void {
    if (this.gameStore.getState().phase !== 'question') {
      return;
    }
    if (this.closeTimeoutId !== null) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }

    this.transport.send({ type: 'answers_closed', questionId });

    const { questions, currentQuestionIndex, answers, players } = this.gameStore.getState();
    const question = questions[currentQuestionIndex];
    if (!question) {
      return;
    }

    const distribution: Record<AnswerChoice, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const answer of answers) {
      if (answer.questionId === questionId) {
        distribution[answer.choice] += 1;
      }
    }

    this.gameStore.setLastReveal({ correctIndex: question.correctIndex, distribution });
    this.gameStore.dispatch({ type: 'reveal' });

    this.transport.send({
      type: 'reveal',
      correctIndex: question.correctIndex,
      distribution,
      scoreboard: players.map(({ playerId, nickname, score }) => ({ playerId, nickname, score })),
    });
  }

  /** Хост: отвечает на request_sync текущим состоянием игры. */
  private handleRequestSync(): void {
    const { role, phase, players, currentQuestion, currentDeadline, lastReveal, currentQuestionIndex, questions } =
      this.gameStore.getState();
    if (role !== 'host') {
      return;
    }

    const payload: SyncPayload = {
      players: players.map(({ playerId, nickname, score }) => ({ playerId, nickname, score })),
      currentQuestionIndex,
      total: questions.length,
    };

    if ((phase === 'question' || phase === 'preview') && currentDeadline !== null) {
      payload.deadline = currentDeadline;
      if (currentQuestion) {
        payload.questionId = currentQuestion.questionId;
        payload.durationMs = this.currentDurationMs ?? undefined;
      }
    }

    if (phase === 'reveal' && lastReveal) {
      payload.correctIndex = lastReveal.correctIndex;
      payload.distribution = lastReveal.distribution;
    }

    this.transport.send({ type: 'sync', phase, state: payload });
  }

  private handleMessage(message: GameMessage): void {
    switch (message.type) {
      case 'question_preview':
        this.handlePreviewReceived(message);
        break;
      case 'question':
        this.handleQuestionReceived(message);
        break;
      case 'answer':
        this.handleAnswerReceived(message);
        break;
      case 'reveal':
        this.handleRevealReceived(message);
        break;
      case 'sync':
        this.handleSyncReceived(message.phase, message.state);
        break;
      case 'request_sync':
        this.handleRequestSync();
        break;
      case 'game_ended':
        this.handleGameEnded();
        break;
      default:
        break;
    }
  }

  private handlePreviewReceived(message: QuestionPreviewMessage): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально в beginPreview()
    }
    const { phase } = this.gameStore.getState();
    this.gameStore.setCurrentQuestionIndex(message.index);
    this.gameStore.setCurrentQuestion(null);
    this.gameStore.setDeadline(message.deadline);
    this.gameStore.setLastReveal(null);
    // Из leaderboard переходим через next_question, из lobby — через start_preview
    if (phase === 'leaderboard') {
      this.gameStore.dispatch({ type: 'next_question' }); // leaderboard → preview
    } else {
      this.gameStore.dispatch({ type: 'start_preview' }); // lobby → preview
    }
  }

  private handleQuestionReceived(message: QuestionMessage): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально в beginQuestion()
    }
    this.currentDurationMs = message.durationMs;
    this.myLastAnswer = null;
    this.gameStore.setCurrentQuestion({
      questionId: message.questionId,
      text: message.text,
      options: message.options,
    });
    this.gameStore.setDeadline(message.deadline);
    this.gameStore.dispatch({ type: 'start_question' });
  }

  /** Хост: проверяет и принимает ответ игрока (validateAnswer + calculateScore). */
  private handleAnswerReceived(message: AnswerMessage): void {
    const { role, currentQuestion, currentDeadline, answers, questions, currentQuestionIndex } =
      this.gameStore.getState();
    if (role !== 'host' || !currentQuestion || currentQuestion.questionId !== message.questionId) {
      return;
    }
    if (currentDeadline === null) {
      return;
    }

    const alreadyAnswered = answers.some(
      (answer) => answer.playerId === message.playerId && answer.questionId === message.questionId,
    );
    if (!validateAnswer(message.clientTs, currentDeadline, alreadyAnswered)) {
      return;
    }

    const question = questions[currentQuestionIndex];
    if (!question) {
      return;
    }

    const timeTakenMs = Math.max(0, message.clientTs - (currentDeadline - question.durationMs));
    const isCorrect = message.choice === question.correctIndex;
    const score = calculateScore(isCorrect, timeTakenMs, question.durationMs);

    const record: AnswerRecord = {
      playerId: message.playerId,
      questionId: message.questionId,
      choice: message.choice,
      clientTs: message.clientTs,
      score,
    };
    this.gameStore.recordAnswer(record);
  }

  private handleRevealReceived(message: RevealMessage): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально в finishQuestion()
    }

    const { players, localPlayerId } = this.gameStore.getState();
    const previousScore = players.find((player) => player.playerId === localPlayerId)?.score ?? 0;
    const updatedPlayers = message.scoreboard.map((player) => ({ ...player, connected: true }));
    const newScore =
      updatedPlayers.find((player) => player.playerId === localPlayerId)?.score ?? previousScore;
    this.lastPointsGained = newScore - previousScore;

    this.gameStore.setLastReveal({ correctIndex: message.correctIndex, distribution: message.distribution });
    this.gameStore.setPlayers(updatedPlayers);
    this.gameStore.dispatch({ type: 'reveal' });
  }

  private handleSyncReceived(phase: string, rawState: unknown): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально
    }

    const payload = rawState as SyncPayload | null;
    const { phase: currentPhase } = this.gameStore.getState();

    // Обновляем список игроков, если передан в payload
    if (payload?.players) {
      this.gameStore.setPlayers(payload.players.map((p) => ({ ...p, connected: true })));
    }

    switch (phase) {
      case 'lobby':
        this.gameStore.setCurrentQuestion(null);
        this.gameStore.setDeadline(null);
        this.gameStore.setLastReveal(null);
        this.gameStore.setCurrentQuestionIndex(0);
        if (currentPhase === 'finished') {
          this.gameStore.dispatch({ type: 'start_lobby' }); // finished → lobby
        } else {
          this.gameStore.forcePhase('lobby');
        }
        break;

      case 'preview':
        if (payload?.currentQuestionIndex !== undefined) {
          this.gameStore.setCurrentQuestionIndex(payload.currentQuestionIndex);
        }
        if (payload?.deadline !== undefined) {
          this.gameStore.setDeadline(payload.deadline);
        }
        this.gameStore.setCurrentQuestion(null);
        this.gameStore.setLastReveal(null);
        if (currentPhase === 'leaderboard') {
          this.gameStore.dispatch({ type: 'next_question' }); // leaderboard → preview
        } else {
          this.gameStore.forcePhase('preview');
        }
        break;

      case 'question':
        if (payload?.questionId !== undefined && payload.deadline !== undefined) {
          this.currentDurationMs = payload.durationMs ?? null;
          this.myLastAnswer = null;
          this.gameStore.setCurrentQuestion({
            questionId: payload.questionId,
            text: '',
            options: ['', '', '', ''],
          });
          this.gameStore.setDeadline(payload.deadline);
        }
        this.gameStore.forcePhase('question');
        break;

      case 'reveal':
        if (payload?.correctIndex !== undefined && payload.distribution !== undefined) {
          this.gameStore.setLastReveal({
            correctIndex: payload.correctIndex,
            distribution: payload.distribution,
          });
        }
        this.gameStore.forcePhase('reveal');
        break;

      case 'leaderboard':
        if (currentPhase === 'reveal') {
          this.gameStore.dispatch({ type: 'show_leaderboard' }); // reveal → leaderboard
        } else {
          this.gameStore.forcePhase('leaderboard');
        }
        break;

      case 'finished':
        if (currentPhase === 'leaderboard') {
          this.gameStore.dispatch({ type: 'finish' }); // leaderboard → finished
        } else {
          this.gameStore.forcePhase('finished');
        }
        break;

      default:
        break;
    }
  }

  private handleGameEnded(): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост сам инициировал endGame()
    }
    void clearState('quizparty_session');
    this.gameStore.dispatch({ type: 'reset' }); // → idle
    this.transport.disconnect();
  }
}

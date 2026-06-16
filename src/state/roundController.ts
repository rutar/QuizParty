// state/roundController.ts — оркестрация раунда: preview → question → answers_closed → reveal.
// С Transport работает только через интерфейс (net/transport.ts).

import { loadQuestions } from '../game/questions';
import { calculateScore } from '../game/scoring';
import { validateAnswer } from '../game/validator';
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
    this.gameStore.dispatch({ type: 'start_preview' });

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
        this.handleSyncReceived(message.phase);
        break;
      default:
        break;
    }
  }

  private handlePreviewReceived(message: QuestionPreviewMessage): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально в beginPreview()
    }
    this.gameStore.setCurrentQuestionIndex(message.index);
    this.gameStore.setCurrentQuestion(null);
    this.gameStore.setDeadline(message.deadline);
    this.gameStore.setLastReveal(null);
    this.gameStore.dispatch({ type: 'start_preview' });
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

  private handleSyncReceived(phase: string): void {
    if (this.gameStore.getState().role === 'host') {
      return; // хост уже обновил себя локально
    }
    if (phase === 'leaderboard') {
      this.gameStore.dispatch({ type: 'show_leaderboard' });
    }
  }
}

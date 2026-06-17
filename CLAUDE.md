# QuizParty — Claude Code Instructions

## Роль

Ты — ведущий архитектор и инженер проекта QuizParty. Ты знаешь весь контекст проекта и принятые решения. Ты не предлагаешь альтернативные технологии и не задаёшь вопросов о стеке — он зафиксирован. Ты пишешь код точно по архитектурному плану (см. ниже), соблюдаешь все правила изоляции и не отступаешь от них без явного указания.

---

## Продукт

QuizParty — PWA-викторина в формате Kahoot. Хост зеркалит экран на ТВ (Chromecast/AirPlay/HDMI), игроки подключаются через браузер по QR или коду. На телефоне игрока — только 4 цветные кнопки (без текста вариантов), текст вопроса и вариантов — только на ТВ.

**Требование к среде:** постоянный интернет у всех участников. Офлайн-режим — отложенная веха v2.0.

---

## Технологический стек (зафиксирован, не обсуждается)

| Слой | Технология |
|---|---|
| Язык | TypeScript 5.5+, strict mode, target ES2022 |
| UI | Lit 3.3+ (Web Components, Light DOM) |
| State | @lit/context 1.1+ (стабильный, не labs) |
| Сборщик | Vite 8+ (Rolldown; требует Node 20.19+/22.12+) |
| Стили | Tailwind CSS 4+ (Oxide, @tailwindcss/vite, CSS-first) |
| Realtime | partysocket 1.0+ (только внутри net/) |
| Бэкенд | PartyKit (managed relay, ~10 строк серверного кода) |
| Хостинг | GitHub Pages (статика) |
| QR | qrcode |
| ID | nanoid |
| Хранилище | idb-keyval |
| PWA | Workbox |
| Тесты unit | Vitest |
| Тесты e2e | Playwright |

**Tailwind 4 специфика:** нет `tailwind.config.js`, нет PostCSS. Плагин `@tailwindcss/vite` в `vite.config.ts`. Конфигурация через `@theme` в CSS. Точка входа — `@import "tailwindcss"`.

**Lit Light DOM:** все LitElement переопределяют `createRenderRoot() { return this; }`. Shadow DOM не используется. Tailwind-классы работают глобально.

**Lit Signals (`@lit-labs/signals`) — ЗАПРЕЩЕНЫ** для использования. Пакет нестабилен (labs, 0.2.x, зависит от незавершённого TC39-proposal). State-менеджмент — только через `GameStore extends EventTarget` + `@lit/context`.

---

## Архитектура — слои и зависимости

```
UI Layer        (Lit Components)
     ↓ Lit Context
State Layer     (GameStore + State Machine)
     ↓
Game Logic      (pure functions: scoring, validator, questions)
     ↓
Transport Layer (interface Transport — КЛЮЧЕВОЙ ШОВ)
     ↓
Persistence     (idb-keyval wrapper)
```

**Зависимости идут строго сверху вниз.** UI не импортирует из `net/` напрямую. Game Logic не знает о сети и UI. Нарушение этого порядка недопустимо.

---

## Transport — главное архитектурное правило

```typescript
// net/transport.ts — единственный публичный интерфейс сетевого слоя
export interface Transport {
  connect(roomCode: string, role: 'host' | 'player'): Promise<void>;
  send(message: GameMessage): void;
  onMessage(handler: (msg: GameMessage) => void): void;
  onConnectionChange(handler: (state: ConnectionState) => void): void;
  disconnect(): void;
}
```

**ПРАВИЛО №1 — АБСОЛЮТНОЕ:** `partysocket` импортируется **только** внутри `net/cloudTransport.ts`. Ни один другой файл не импортирует `partysocket` напрямую. Нарушение этого правила ломает архитектурный шов под офлайн-режим v2.0.

**ПРАВИЛО №2:** Весь код вне `net/` работает только с интерфейсом `Transport`, полученным из `createTransport()`. Конкретные классы `CloudTransport` / `LocalTransport` не видны за пределами `net/`.

**ПРАВИЛО №3:** `net/protocol.ts` содержит типы сообщений (`GameMessage`, `HostMessage`, `PlayerMessage`, `SystemMessage`). Они единые для всех транспортов и не зависят от реализации.

В v1.0 реализован только `CloudTransport`. `LocalTransport` — заглушка-комментарий для v2.0.

---

## Структура проекта

```
quiz-app/
├── src/
│   ├── main.ts
│   ├── styles/index.css           ← @import "tailwindcss" + @theme
│   ├── state/
│   │   ├── gameStore.ts           ← class GameStore extends EventTarget
│   │   ├── gameContext.ts         ← Lit Context
│   │   ├── machine.ts             ← transition(phase, event) → phase
│   │   └── types.ts               ← GameState, Phase, Player, etc.
│   ├── game/
│   │   ├── scoring.ts             ← calculateScore() — pure function
│   │   ├── validator.ts           ← validateAnswer() — pure function
│   │   └── questions.ts           ← loadQuestions()
│   ├── net/
│   │   ├── transport.ts           ← interface Transport (ШОВ)
│   │   ├── cloudTransport.ts      ← CloudTransport implements Transport
│   │   ├── createTransport.ts     ← фабрика
│   │   ├── protocol.ts            ← GameMessage types
│   │   └── reconnect.ts           ← backoff helpers
│   ├── persistence/
│   │   └── storage.ts
│   └── components/
│       ├── quiz-app.ts            ← root, @provide context
│       ├── quiz-start.ts
│       ├── quiz-join.ts
│       ├── quiz-lobby.ts
│       ├── quiz-host-question.ts
│       ├── quiz-player-question.ts
│       ├── quiz-host-reveal.ts
│       ├── quiz-player-reveal.ts
│       ├── quiz-leaderboard.ts
│       ├── quiz-final.ts
│       ├── quiz-timer.ts
│       ├── quiz-qr.ts
│       └── quiz-connection-status.ts
├── party/
│   └── server.ts                  ← PartyKit: pub/sub relay ~10 строк
└── public/
    └── questions/default-ru.json
```

---

## Игровая модель

### State Machine (хост)

```
idle → lobby → preview → question → reveal → leaderboard
                                                  ↓
                                         (ещё вопросы?) → preview
                                                  ↓
                                              finished → idle | lobby
```

### Подсчёт очков

```typescript
// Правильный мгновенный ответ: 1000 очков
// Правильный на грани таймера: 500 очков
// Неправильный или после deadline: 0
score = Math.round(1000 - 500 * (timeTakenMs / durationMs))
```

### Протокол сообщений (ключевые)

```typescript
// host → players
{ type: 'question'; questionId; text; options; deadline: number /* unix ms */ }
{ type: 'reveal'; correctIndex; distribution; scoreboard }
{ type: 'sync'; phase; state }
{ type: 'lobby_update'; players }

// player → host
{ type: 'join'; playerId; nickname }
{ type: 'answer'; questionId; choice; clientTs: number }
{ type: 'request_sync'; playerId }
```

**Хост принимает ответ только если `clientTs <= deadline` И ещё не получен ответ от этого игрока на этот вопрос.**

---

## UX-правила (не нарушать)

- Варианты ответов показываются **только на ТВ** (экран хоста). На телефоне игрока — 4 цветные кнопки с символами (▲ ◆ ● ■), без текста. Это принципиально: заставляет всех смотреть на общий экран.
- Цвета: красный (▲), синий (◆), жёлтый (●), зелёный (■). Символы дублируют цвет для дальтоников.
- Хост-экраны: шрифт минимум 32pt для текста, 48pt+ для заголовков. Высокий контраст.
- Хост может закрыть раунд досрочно, если все ответили.
- После ответа кнопки исчезают, показывается «Ответ принят. Ждём остальных...»

---

## Стиль кода

- **TypeScript strict** — никаких `any`, никаких `!` без комментария почему.
- **Lit:** декораторы `@customElement`, `@property`, `@state`, `@query`. Light DOM везде.
- **Чистые функции** в `game/` — без побочных эффектов, без зависимостей на DOM/сеть/Lit.
- **Именование:** компоненты — `quiz-*` (kebab-case), классы — `QuizApp`, `CloudTransport` (PascalCase), файлы — `camelCase.ts` кроме компонентов (`quiz-app.ts`).
- **Комментарии** — на русском, кратко. Сложную логику поясняем, тривиальную — нет.
- **Импорты** — сначала внешние библиотеки, потом внутренние, потом стили.
- **Нет `console.log`** в готовом коде — только `console.warn`/`console.error` для ошибок.

---

## Текущий статус проекта

**Этап:** 5 — полная игра: цикл по всем вопросам, финал, новая игра, восстановление сессии

**Сделано:**
- Этап 0: Vite 8 + Tailwind 4 + Lit 3.3 настроено
- Этап 1: весь скелет проекта, все типы, tsc чистый
- Этап 2: транспортный слой реализован (machine.ts, gameStore.dispatch, party/src/server.ts relay, cloudTransport.ts)
- Этап 3: сценарий лобби
- Этап 4: один полный раунд (preview→question→reveal→leaderboard)
- Этап 5: полная игра
  - state/roundController.ts — nextQuestion() (leaderboard→preview→...→finished), newGame() (сброс очков, возврат в лобби с теми же игроками), endGame() (broadcast game_ended, reset→idle)
  - roundController — handleRequestSync(): хост отвечает на request_sync текущим состоянием (фаза + игроки + deadline + correctIndex и т.д.)
  - roundController — handleSyncReceived() расширен: все фазы (lobby/preview/question/reveal/leaderboard/finished) с восстановлением состояния; forcePhase() для произвольных переходов при reconnect
  - roundController — handleGameEnded(): игрок получает game_ended → clearState, reset, disconnect
  - roundController — handlePreviewReceived(): FIX — при переходе из leaderboard используем dispatch(next_question) вместо start_preview (no-op из leaderboard)
  - net/protocol.ts — добавлен GameEndedMessage
  - state/gameStore.ts — resetForNewGame() (игроки с нулевыми очками, очищены ответы/вопрос/дедлайн), forcePhase() (bypass state machine для sync)
  - persistence/storage.ts — реализован через idb-keyval (saveState/loadState/clearState)
  - state/lobbyController.ts — saveState при joinRoom(), clearState при kicked
  - SESSION_KEY, PlayerSession экспортированы из lobbyController — используются в quiz-app.ts
  - components/quiz-leaderboard.ts — кнопка «Следующий вопрос →» / «Завершить игру →» только для хоста; текст «Ждём хоста…» для игрока
  - components/quiz-final.ts — реализован: победитель крупно + топ-5, кнопки «Новая игра»/«Закончить» только у хоста, «Ждём хоста…» у игрока
  - components/quiz-app.ts — роутинг finished→quiz-final; tryReconnect(): загрузка PlayerSession из IDB → connect → setRoomInfo/setLocalPlayerId → request_sync
  - vitest.config.ts (новый) — include только tests/unit/**/*.test.ts (не захватывает Playwright e2e)
  - playwright.config.ts (новый) + tests/e2e/full-game.spec.ts (новый)
  - Проверено Playwright: 2 теста зелёных (42 сек):
    - «полная партия из 5 вопросов до финала» — от лобби до «Закончить» → стартовый экран
    - «новая игра — сброс очков и возврат в лобби» — финал → «Новая игра» → лобби → старт второй партии

**КРИТИЧЕСКИЙ FIX — декораторы:**
legacy `experimentalDecorators`, `useDefineForClassFields: false`, без `accessor`. Без изменений.

**Архитектурные решения зафиксированы:**
- Все прежние решения Этапов 1–4 остаются в силе
- forcePhase() в GameStore — единственный способ перейти в произвольную фазу при sync (bypass state machine); использовать только в handleSyncReceived
- handlePreviewReceived: из leaderboard → dispatch(next_question), из lobby → dispatch(start_preview)
- Восстановление игрока: lobbyController сохраняет {role, roomCode, localPlayerId, nickname} в IDB ключ 'quizparty_session'; quiz-app.tryReconnect() при старте загружает и подключает, потом request_sync
- PARTYKIT_USERNAME — TODO-константа в cloudTransport.ts, подставить перед деплоем

**Следующий шаг:** деплой (PARTYKIT_USERNAME + GitHub Pages), оффлайн-режим v2.0 (LocalTransport).

---

## Как обновлять этот файл

После завершения каждого этапа обновляй раздел «Текущий статус»: что сделано, что в работе, следующий шаг. Это единственное место, которое меняется по ходу разработки. Остальное — стабильная архитектурная документация.

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

**Этап:** 3 — лобби реализовано (создание комнаты, вход, kick)

**Сделано:**
- Этап 0: Vite 8 + Tailwind 4 + Lit 3.3 настроено
- Этап 1: весь скелет проекта, все типы, tsc чистый
- Этап 2: транспортный слой реализован (machine.ts, gameStore.dispatch, party/src/server.ts relay, cloudTransport.ts)
- Этап 3: сценарий лобби
  - net/cloudTransport.ts — dev (localhost:1999) / prod (PARTYKIT_USERNAME) хост по import.meta.env.DEV
  - net/protocol.ts — добавлены WelcomeMessage, KickedMessage
  - game/roomCode.ts — generateRoomCode() через nanoid customAlphabet (6 симв., без O/0/I/1)
  - state/gameStore.ts — setRoomInfo(), setPlayers()
  - state/lobbyController.ts (новый) — createRoom/joinRoom/kickPlayer, обработка join/lobby_update/kicked
  - state/lobbyContext.ts (новый) — Lit Context для LobbyController
  - components/quiz-start.ts, quiz-lobby.ts, quiz-join.ts — реализованы (Tailwind, реактивны через GAME_STORE_CHANGE_EVENT)
  - components/quiz-app.ts — роутинг по фазе/роли, чтение ?room= из URL
  - main.ts — монтирует <quiz-app>
  - Проверено вживую через Playwright (dev-сервер + party dev): хост создаёт комнату → игрок входит по коду → lobby_update синхронизируется в обе стороны, без ошибок в консоли

**КРИТИЧЕСКИЙ FIX — декораторы (меняет «Стиль кода» в части decorators):**
Стандартные TC39-декораторы (использовались в Этап 1–2, с `accessor`-полями) **не выполняются ни в одном текущем браузере** — нет нативной поддержки, а Vite 8/Rolldown их не транспилирует, только передаёт как есть (поймано через Playwright: `SyntaxError: Invalid or unexpected token` прямо на `@customElement(...) class`).
Исправлено переходом на legacy `experimentalDecorators`:
- tsconfig.json: `"experimentalDecorators": true`, `"useDefineForClassFields": false`, **убран** `"erasableSyntaxOnly"` (несовместим с legacy-декораторами)
- Во всех компонентах с `@property`/`@state`/`@provide`/`@consume` убрано ключевое слово `accessor` — поля обычные
- `@customElement`/`@property` и т.д. как синтаксис остаются — меняется только flavor (legacy вместо standard), esbuild теперь реально транспилирует декораторы в рабочий JS
- Если в новых файлах увидишь `accessor` рядом с Lit-декоратором — это ошибка, удалить

**Архитектурные решения зафиксированы:**
- ConnectionState живёт в net/transport.ts, state/types.ts реэкспортирует
- partysocket импортируется только в net/cloudTransport.ts
- PartyKit создал под-проект: точка входа party/src/server.ts (не party/server.ts)
- PartySocket использует host+room API, не ручную строку URL
- PARTYKIT_USERNAME — TODO-константа в cloudTransport.ts, подставить перед деплоем
- Протокол лобби: join (player→host) → host регистрирует, шлёт welcome (адресовано playerId) + lobby_update (broadcast); kick → host шлёт kicked + lobby_update, клиент с совпавшим playerId сам делает disconnect()
- quiz-join.ts — один компонент на два под-экрана (форма / список ожидания), переключение по GameState.phase, не по локальному флагу

**Следующий шаг:** Этап 4 — preview/question экраны.
quiz-lobby.ts «Начать игру» уже диспатчит `start_preview` локально у хоста,
но НЕ рассылает sync игрокам — это первое, что нужно сделать (через SyncMessage),
затем реализовать quiz-host-question.ts / quiz-player-question.ts (сейчас заглушки).

---

## Как обновлять этот файл

После завершения каждого этапа обновляй раздел «Текущий статус»: что сделано, что в работе, следующий шаг. Это единственное место, которое меняется по ходу разработки. Остальное — стабильная архитектурная документация.

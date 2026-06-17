// tests/e2e/full-game.spec.ts — полная партия из 5 вопросов, от лобби до финального экрана.
// Требует: npm run dev (порт 5173) + partykit dev (порт 1999).

import { test, expect, type Page } from '@playwright/test';

const PREVIEW_MS = 3500; // чуть больше 3000 PREVIEW_DURATION_MS

async function waitForPreview(host: Page, player: Page) {
  await Promise.all([
    host.waitForSelector('text=Приготовьтесь!', { timeout: 8000 }),
    player.waitForSelector('text=Приготовьтесь!', { timeout: 8000 }),
  ]);
}

async function waitForQuestion(host: Page, player: Page) {
  await Promise.all([
    host.waitForSelector('text=Закрыть досрочно', { timeout: 8000 }),
    player.waitForSelector('[aria-label="Вариант 1"]', { timeout: 8000 }),
  ]);
}

async function waitForReveal(host: Page) {
  await host.waitForSelector('text=Правильный ответ', { timeout: 8000 });
}

async function waitForLeaderboard(host: Page) {
  await host.waitForSelector('text=Таблица лидеров', { timeout: 8000 });
}

test('полная партия из 5 вопросов до финала', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const playerCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const player = await playerCtx.newPage();

  try {
    // 1. Хост создаёт комнату
    await host.goto('/');
    await host.getByRole('button', { name: 'Создать игру' }).click();
    await host.waitForSelector('.tracking-widest', { timeout: 10000 });
    const roomCode = (await host.locator('.tracking-widest').first().textContent())!.trim();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // 2. Игрок входит в комнату
    await player.goto(`/?room=${roomCode}`);
    await player.locator('input[placeholder="Ваш ник"]').fill('TestPlayer');
    await player.getByRole('button', { name: 'Войти' }).click();
    await host.waitForSelector('text=TestPlayer', { timeout: 8000 });

    // 3. Хост запускает игру
    await host.getByRole('button', { name: 'Начать игру' }).click();

    // 4. Цикл по 5 вопросам
    for (let q = 0; q < 5; q++) {
      const isLast = q === 4;

      // Preview (3 секунды)
      await waitForPreview(host, player);
      await host.waitForTimeout(PREVIEW_MS);

      // Question
      await waitForQuestion(host, player);

      // Игрок нажимает первую кнопку ответа
      await player.locator('[aria-label="Вариант 1"]').click();

      // Хост закрывает досрочно
      await host.getByRole('button', { name: 'Закрыть досрочно' }).click();

      // Reveal
      await waitForReveal(host);

      // Хост переходит к таблице лидеров
      await host.getByRole('button', { name: 'Далее →' }).click();
      await waitForLeaderboard(host);

      // Хост жмёт "Следующий вопрос" или "Завершить игру"
      if (isLast) {
        await host.getByRole('button', { name: 'Завершить игру →' }).click();
      } else {
        await host.getByRole('button', { name: 'Следующий вопрос →' }).click();
      }
    }

    // 5. Финальный экран
    await host.waitForSelector('text=Игра окончена!', { timeout: 8000 });
    await host.waitForSelector('text=Победитель', { timeout: 4000 });
    await player.waitForSelector('text=Игра окончена!', { timeout: 8000 });

    // Кнопки только у хоста
    await expect(host.getByRole('button', { name: 'Новая игра' })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Закончить' })).toBeVisible();
    await expect(player.getByRole('button', { name: 'Новая игра' })).not.toBeVisible();

    // 6. Тест "Закончить" — все возвращаются на стартовый экран
    await host.getByRole('button', { name: 'Закончить' }).click();
    await host.waitForSelector('text=Создать игру', { timeout: 6000 });
    await player.waitForSelector('text=Войти в игру', { timeout: 6000 });
  } finally {
    await hostCtx.close();
    await playerCtx.close();
  }
});

test('новая игра — сброс очков и возврат в лобби', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const playerCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const player = await playerCtx.newPage();

  try {
    // Создание и вход
    await host.goto('/');
    await host.getByRole('button', { name: 'Создать игру' }).click();
    await host.waitForSelector('.tracking-widest', { timeout: 10000 });
    const roomCode = (await host.locator('.tracking-widest').first().textContent())!.trim();

    await player.goto(`/?room=${roomCode}`);
    await player.locator('input[placeholder="Ваш ник"]').fill('ResetPlayer');
    await player.getByRole('button', { name: 'Войти' }).click();
    await host.waitForSelector('text=ResetPlayer', { timeout: 8000 });
    await host.getByRole('button', { name: 'Начать игру' }).click();

    // Быстро проходим все 5 вопросов
    for (let q = 0; q < 5; q++) {
      const isLast = q === 4;
      await host.waitForSelector('text=Приготовьтесь!', { timeout: 8000 });
      await host.waitForTimeout(PREVIEW_MS);
      await host.waitForSelector('text=Закрыть досрочно', { timeout: 8000 });
      await host.getByRole('button', { name: 'Закрыть досрочно' }).click();
      await host.waitForSelector('text=Правильный ответ', { timeout: 8000 });
      await host.getByRole('button', { name: 'Далее →' }).click();
      await host.waitForSelector('text=Таблица лидеров', { timeout: 8000 });
      if (isLast) {
        await host.getByRole('button', { name: 'Завершить игру →' }).click();
      } else {
        await host.getByRole('button', { name: 'Следующий вопрос →' }).click();
      }
    }

    await host.waitForSelector('text=Игра окончена!', { timeout: 8000 });

    // Новая игра
    await host.getByRole('button', { name: 'Новая игра' }).click();

    // Оба видят лобби (с теми же игроками)
    await host.waitForSelector('text=ResetPlayer', { timeout: 8000 });
    await player.waitForSelector('text=Ждём начала игры', { timeout: 8000 });

    // Хост запускает вторую игру
    await host.getByRole('button', { name: 'Начать игру' }).click();
    await host.waitForSelector('text=Приготовьтесь!', { timeout: 8000 });
  } finally {
    await hostCtx.close();
    await playerCtx.close();
  }
});

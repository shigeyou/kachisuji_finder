import { test, expect, Page, Route } from '@playwright/test';

/**
 * ネットワーク破壊テスト
 *
 * 目的: ネットワーク異常でアプリを壊す
 * - レスポンス遅延
 * - 500/503/429エラー注入
 * - 接続断→復帰
 * - タイムアウト
 */

const BASE_URL = 'http://localhost:3006';

async function setupErrorCollection(page: Page) {
  const errors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(`PAGE_ERROR: ${err.message}`);
  });
  page.on('requestfailed', (request) => {
    networkErrors.push(`NETWORK_FAIL: ${request.url()} - ${request.failure()?.errorText}`);
  });

  return { errors, networkErrors };
}

test.describe('ネットワーク破壊テスト - 遅延注入', () => {
  test.setTimeout(300000);

  test('ND-001: API呼び出しに5秒遅延を注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    // APIリクエストに5秒遅延を注入
    await page.route('**/api/**', async (route: Route) => {
      console.log('Delaying request:', route.request().url());
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // 勝ち筋探索タブに移動
    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    // 探索を開始
    const textarea = page.locator('textarea').first();
    await textarea.fill('遅延テスト');

    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();

      // ローディング状態が表示されるか確認
      const showsLoading = await page.locator('.animate-spin, text=探索中, text=処理中').isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Shows loading state during delay:', showsLoading);

      await page.waitForTimeout(10000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-001-5s-delay.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-002: API呼び出しに15秒遅延を注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    await page.route('**/api/**', async (route: Route) => {
      console.log('Delaying 15s:', route.request().url());
      await new Promise(resolve => setTimeout(resolve, 15000));
      await route.continue();
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('長時間遅延テスト');

    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(20000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-002-15s-delay.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-003: ランダム遅延（0-10秒）を注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    const delays: number[] = [];

    await page.route('**/api/**', async (route: Route) => {
      const delay = Math.floor(Math.random() * 10000);
      delays.push(delay);
      console.log(`Random delay ${delay}ms for:`, route.request().url());
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // 複数のタブを切り替えてAPIを呼び出す
    const tabs = ['SWOT', 'RAG情報', 'ランキング'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log('Applied delays:', delays);
    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-003-random-delay.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });
});

test.describe('ネットワーク破壊テスト - エラー注入', () => {
  test.setTimeout(300000);

  test('ND-004: 10%の確率で500エラーを注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    let injectedErrors = 0;
    let totalRequests = 0;

    await page.route('**/api/**', async (route: Route) => {
      totalRequests++;
      if (Math.random() < 0.1) {
        injectedErrors++;
        console.log('Injecting 500 error for:', route.request().url());
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error (injected)' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // 複数の操作を実行
    const tabs = ['SWOT', 'RAG情報', 'ランキング', '勝ち筋探索'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log(`Injected 500 errors: ${injectedErrors}/${totalRequests}`);

    // アプリがまだ動作しているか確認
    const bodyVisible = await page.locator('body').isVisible();
    console.log('App still functional:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-004-500-injection.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-005: 50%の確率で500エラーを注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    let injectedErrors = 0;
    let totalRequests = 0;

    await page.route('**/api/**', async (route: Route) => {
      totalRequests++;
      if (Math.random() < 0.5) {
        injectedErrors++;
        console.log('Injecting 500 error for:', route.request().url());
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error (injected)' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    const tabs = ['SWOT', 'RAG情報', 'ランキング'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log(`Injected 500 errors: ${injectedErrors}/${totalRequests}`);

    const bodyVisible = await page.locator('body').isVisible();
    console.log('App still functional:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-005-500-50percent.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-006: 429 Too Many Requests を注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    let requestCount = 0;

    await page.route('**/api/**', async (route: Route) => {
      requestCount++;
      if (requestCount > 5) {
        console.log('Injecting 429 for:', route.request().url());
        await route.fulfill({
          status: 429,
          headers: { 'Retry-After': '60' },
          body: JSON.stringify({ error: 'Too Many Requests' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // たくさんのリクエストを発生させる
    const tabs = ['SWOT', 'RAG情報', 'ランキング', '勝ち筋探索', 'シン・勝ち筋'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log(`Total requests: ${requestCount}, 429s injected after 5th`);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-006-429-injection.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-007: 503 Service Unavailable を注入', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    await page.route('**/api/**', async (route: Route) => {
      if (Math.random() < 0.3) {
        console.log('Injecting 503 for:', route.request().url());
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service Unavailable' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-007-503-injection.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });
});

test.describe('ネットワーク破壊テスト - 接続断', () => {
  test.setTimeout(300000);

  test('ND-008: リクエスト中にabort', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    let abortedCount = 0;

    await page.route('**/api/**', async (route: Route) => {
      if (Math.random() < 0.3) {
        abortedCount++;
        console.log('Aborting request:', route.request().url());
        await route.abort('connectionfailed');
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    const tabs = ['SWOT', 'RAG情報', 'ランキング'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('Aborted requests:', abortedCount);

    const bodyVisible = await page.locator('body').isVisible();
    console.log('App still functional:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-008-abort.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-009: オフライン→オンライン復帰', async ({ page, context }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('Going offline...');

    // オフラインモードに
    await context.setOffline(true);

    // オフライン中に操作
    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click().catch(() => {});
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-009-offline.png' });

    console.log('Going back online...');

    // オンラインに復帰
    await context.setOffline(false);
    await page.waitForTimeout(2000);

    // リロードして復帰
    await page.reload();
    await page.waitForLoadState('networkidle');

    const bodyVisible = await page.locator('body').isVisible();
    console.log('Recovered from offline:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-009-online-recovery.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-010: 断続的なオフライン/オンライン', async ({ page, context }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 5回オフライン/オンラインを切り替え
    for (let i = 0; i < 5; i++) {
      console.log(`Cycle ${i + 1}: Going offline...`);
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      console.log(`Cycle ${i + 1}: Going online...`);
      await context.setOffline(false);
      await page.waitForTimeout(1000);
    }

    // 最終的にオンラインを確認
    await context.setOffline(false);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const bodyVisible = await page.locator('body').isVisible();
    console.log('App functional after network cycling:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-010-network-cycling.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });
});

test.describe('ネットワーク破壊テスト - 複合条件', () => {
  test.setTimeout(300000);

  test('ND-011: 遅延＋エラー＋abortの組み合わせ', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);
    const stats = { delayed: 0, errored: 0, aborted: 0, normal: 0 };

    await page.route('**/api/**', async (route: Route) => {
      const random = Math.random();

      if (random < 0.2) {
        // 20%: 5秒遅延
        stats.delayed++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.continue();
      } else if (random < 0.4) {
        // 20%: 500エラー
        stats.errored++;
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' }),
        });
      } else if (random < 0.5) {
        // 10%: abort
        stats.aborted++;
        await route.abort('connectionfailed');
      } else {
        // 50%: 正常
        stats.normal++;
        await route.continue();
      }
    });

    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // 複数の操作を実行
    const tabs = ['SWOT', 'RAG情報', 'ランキング', '勝ち筋探索'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log('Network injection stats:', stats);

    const bodyVisible = await page.locator('body').isVisible();
    console.log('App still functional:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-011-combined.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });

  test('ND-012: 探索中にネットワークエラー', async ({ page }) => {
    const { errors, networkErrors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('ネットワークエラーテスト');

    // 探索APIに対してエラーを注入
    await page.route('**/api/explore**', async (route: Route) => {
      console.log('Injecting error for explore API');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Explore failed' }),
      });
    });

    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(10000);
    }

    // エラー表示を確認
    const hasErrorDisplay = await page.locator('text=エラー, text=失敗, text=error').first().isVisible().catch(() => false);
    console.log('Shows error message:', hasErrorDisplay);

    await page.screenshot({ path: 'test-results/destructive-artifacts/nd-012-explore-error.png' });
    console.log('Console errors:', errors);
    console.log('Network errors:', networkErrors);
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * ストレステスト
 *
 * 目的: 繰り返し操作でアプリを壊す
 * - 同一フロー200回連続
 * - メモリリーク検出
 * - パフォーマンス劣化検出
 */

const BASE_URL = 'http://localhost:3006';

async function setupErrorCollection(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(`PAGE_ERROR: ${err.message}`);
  });
  return { errors };
}

async function measureMemory(page: Page): Promise<number> {
  try {
    const metrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    return metrics;
  } catch {
    return 0;
  }
}

test.describe('ストレステスト - タブ切替', () => {
  test.setTimeout(1800000); // 30分

  test('ST-001: タブ切替200回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const tabs = ['はじめに', 'RAG情報', 'SWOT', '勝ち筋探索', 'ランキング'];
    const results: { iteration: number; duration: number; errors: number }[] = [];

    const initialMemory = await measureMemory(page);
    console.log('Initial memory:', initialMemory);

    for (let i = 0; i < 200; i++) {
      const tabIndex = i % tabs.length;
      const tabName = tabs[tabIndex];

      const startTime = Date.now();
      const errorsBefore = errors.length;

      const tab = page.locator(`button:has-text("${tabName}")`).first();
      await tab.click().catch(() => {});
      await page.waitForTimeout(100);

      const duration = Date.now() - startTime;
      const newErrors = errors.length - errorsBefore;

      results.push({ iteration: i + 1, duration, errors: newErrors });

      if ((i + 1) % 50 === 0) {
        const currentMemory = await measureMemory(page);
        console.log(`Iteration ${i + 1}: memory=${currentMemory}, errors=${errors.length}`);
      }
    }

    const finalMemory = await measureMemory(page);
    console.log('Final memory:', finalMemory);
    console.log('Memory increase:', finalMemory - initialMemory);

    // パフォーマンス統計
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    console.log(`Duration stats: avg=${avgDuration.toFixed(1)}ms, min=${minDuration}ms, max=${maxDuration}ms`);
    console.log('Total errors:', errors.length);

    // 最後の10回と最初の10回を比較（パフォーマンス劣化チェック）
    const first10Avg = durations.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const last10Avg = durations.slice(-10).reduce((a, b) => a + b, 0) / 10;
    console.log(`Performance degradation: first10=${first10Avg.toFixed(1)}ms, last10=${last10Avg.toFixed(1)}ms`);

    if (last10Avg > first10Avg * 2) {
      console.log('⚠️ WARNING: Significant performance degradation detected!');
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/st-001-tab-200.png' });
  });

  test('ST-002: RAGドキュメント開閉100回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const ragTab = page.locator('button:has-text("RAG情報")');
    await ragTab.click();
    await page.waitForTimeout(2000);

    const docButton = page.locator('button').filter({ hasText: /\.(pdf|pptx|txt)/ }).first();

    if (await docButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialMemory = await measureMemory(page);

      for (let i = 0; i < 100; i++) {
        // 開く
        await docButton.click().catch(() => {});
        await page.waitForTimeout(200);

        // 閉じる
        const closeButton = page.locator('button:has-text("✕"), button:has-text("閉じる")').first();
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(200);

        if ((i + 1) % 25 === 0) {
          const currentMemory = await measureMemory(page);
          console.log(`Modal open/close ${i + 1}: memory=${currentMemory}`);
        }
      }

      const finalMemory = await measureMemory(page);
      console.log(`Memory: initial=${initialMemory}, final=${finalMemory}, diff=${finalMemory - initialMemory}`);
    }

    console.log('Total errors:', errors.length);
    await page.screenshot({ path: 'test-results/destructive-artifacts/st-002-modal-100.png' });
  });
});

test.describe('ストレステスト - スクロール', () => {
  test.setTimeout(600000);

  test('ST-003: 高速スクロール500回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ランキングタブ（長いリストがある）
    const rankingTab = page.locator('button:has-text("ランキング")');
    await rankingTab.click();
    await page.waitForTimeout(2000);

    const initialMemory = await measureMemory(page);

    for (let i = 0; i < 500; i++) {
      // ランダムな方向にスクロール
      const direction = Math.random() > 0.5 ? 500 : -500;
      await page.mouse.wheel(0, direction);

      if ((i + 1) % 100 === 0) {
        const currentMemory = await measureMemory(page);
        console.log(`Scroll ${i + 1}: memory=${currentMemory}, errors=${errors.length}`);
      }
    }

    const finalMemory = await measureMemory(page);
    console.log(`Memory: initial=${initialMemory}, final=${finalMemory}`);
    console.log('Total errors:', errors.length);

    await page.screenshot({ path: 'test-results/destructive-artifacts/st-003-scroll-500.png' });
  });
});

test.describe('ストレステスト - フォーム操作', () => {
  test.setTimeout(600000);

  test('ST-004: テキスト入力/削除100回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();

    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      const initialMemory = await measureMemory(page);

      for (let i = 0; i < 100; i++) {
        // ランダムな長さのテキストを入力
        const length = Math.floor(Math.random() * 1000) + 100;
        const text = 'テスト'.repeat(length / 3);

        await textarea.fill(text);
        await page.waitForTimeout(50);

        // 削除
        await textarea.fill('');
        await page.waitForTimeout(50);

        if ((i + 1) % 25 === 0) {
          const currentMemory = await measureMemory(page);
          console.log(`Input/clear ${i + 1}: memory=${currentMemory}, errors=${errors.length}`);
        }
      }

      const finalMemory = await measureMemory(page);
      console.log(`Memory: initial=${initialMemory}, final=${finalMemory}`);
    }

    console.log('Total errors:', errors.length);
    await page.screenshot({ path: 'test-results/destructive-artifacts/st-004-input-100.png' });
  });

  test('ST-005: スライダー操作200回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const scoreTab = page.locator('button:has-text("スコア設定")');
    await scoreTab.click();
    await page.waitForTimeout(1000);

    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();

    if (sliderCount > 0) {
      const initialMemory = await measureMemory(page);

      for (let i = 0; i < 200; i++) {
        const sliderIndex = i % sliderCount;
        const value = Math.floor(Math.random() * 100);

        await sliders.nth(sliderIndex).fill(String(value));
        await page.waitForTimeout(25);

        if ((i + 1) % 50 === 0) {
          const currentMemory = await measureMemory(page);
          console.log(`Slider ${i + 1}: memory=${currentMemory}, errors=${errors.length}`);
        }
      }

      const finalMemory = await measureMemory(page);
      console.log(`Memory: initial=${initialMemory}, final=${finalMemory}`);
    }

    console.log('Total errors:', errors.length);
    await page.screenshot({ path: 'test-results/destructive-artifacts/st-005-slider-200.png' });
  });
});

test.describe('ストレステスト - ページリロード', () => {
  test.setTimeout(600000);

  test('ST-006: ページリロード50回', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);
    const loadTimes: number[] = [];

    for (let i = 0; i < 50; i++) {
      const startTime = Date.now();

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);

      if ((i + 1) % 10 === 0) {
        const avgLoadTime = loadTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
        console.log(`Reload ${i + 1}: last10Avg=${avgLoadTime.toFixed(0)}ms, errors=${errors.length}`);
      }
    }

    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);

    console.log(`Load time stats: avg=${avgLoadTime.toFixed(0)}ms, max=${maxLoadTime}ms`);
    console.log('Total errors:', errors.length);

    // 最後の10回と最初の10回を比較
    const first10 = loadTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const last10 = loadTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;

    if (last10 > first10 * 1.5) {
      console.log('⚠️ WARNING: Load time degradation detected!');
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/st-006-reload-50.png' });
  });
});

test.describe('ストレステスト - 長時間実行', () => {
  test.setTimeout(300000); // 5分

  test('ST-007: 2分間連続操作', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const tabs = ['はじめに', 'RAG情報', 'SWOT', '勝ち筋探索', 'ランキング'];
    const startTime = Date.now();
    const duration = 2 * 60 * 1000; // 2分（実用的な時間に短縮）

    let iteration = 0;
    const memorySnapshots: { time: number; memory: number }[] = [];

    while (Date.now() - startTime < duration) {
      iteration++;

      // ランダムな操作
      const operation = Math.floor(Math.random() * 4);

      switch (operation) {
        case 0: // タブ切替
          const tabIndex = Math.floor(Math.random() * tabs.length);
          const tab = page.locator(`button:has-text("${tabs[tabIndex]}")`).first();
          await tab.click().catch(() => {});
          break;

        case 1: // スクロール
          await page.mouse.wheel(0, Math.random() > 0.5 ? 300 : -300);
          break;

        case 2: // テキスト入力（探索タブ時）
          const textarea = page.locator('textarea').first();
          if (await textarea.isVisible().catch(() => false)) {
            await textarea.fill('ランダムテスト' + Math.random());
          }
          break;

        case 3: // ボタンクリック
          const buttons = page.locator('button');
          const count = await buttons.count();
          if (count > 0) {
            const randomButton = buttons.nth(Math.floor(Math.random() * count));
            await randomButton.click({ force: true }).catch(() => {});
          }
          break;
      }

      await page.waitForTimeout(500);

      // 1分ごとにスナップショット
      if (iteration % 120 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        const memory = await measureMemory(page);
        memorySnapshots.push({ time: elapsed, memory });
        console.log(`Minute ${elapsed}: memory=${memory}, errors=${errors.length}, iterations=${iteration}`);
      }
    }

    console.log('=== 2 Minute Test Complete ===');
    console.log('Total iterations:', iteration);
    console.log('Total errors:', errors.length);
    console.log('Memory snapshots:', memorySnapshots);

    // メモリリークの傾向をチェック
    if (memorySnapshots.length >= 2) {
      const firstMemory = memorySnapshots[0].memory;
      const lastMemory = memorySnapshots[memorySnapshots.length - 1].memory;
      const increase = lastMemory - firstMemory;
      const percentIncrease = (increase / firstMemory) * 100;

      console.log(`Memory change: ${firstMemory} -> ${lastMemory} (${percentIncrease.toFixed(1)}% increase)`);

      if (percentIncrease > 50) {
        console.log('⚠️ WARNING: Potential memory leak detected!');
      }
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/st-007-30min.png' });
  });
});

test.describe('ストレステスト - API負荷', () => {
  test.setTimeout(600000);

  test('ST-008: seed API 100回連続呼び出し', async ({ request }) => {
    const results: { status: number; duration: number }[] = [];

    for (let i = 0; i < 100; i++) {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/seed`);
      const duration = Date.now() - startTime;

      results.push({ status: response.status(), duration });

      if ((i + 1) % 20 === 0) {
        const recentAvg = results.slice(-20).reduce((a, b) => a + b.duration, 0) / 20;
        const successRate = results.filter(r => r.status === 200).length / results.length;
        console.log(`Request ${i + 1}: avgDuration=${recentAvg.toFixed(0)}ms, successRate=${(successRate * 100).toFixed(1)}%`);
      }
    }

    const avgDuration = results.reduce((a, b) => a + b.duration, 0) / results.length;
    const successCount = results.filter(r => r.status === 200).length;

    console.log(`Final: avgDuration=${avgDuration.toFixed(0)}ms, success=${successCount}/100`);
  });

  test('ST-009: 複数エンドポイント同時呼び出し', async ({ request }) => {
    const endpoints = ['/api/seed', '/api/rag', '/api/ranking', '/api/history'];
    const results: { endpoint: string; status: number; duration: number }[] = [];

    for (let round = 0; round < 20; round++) {
      const promises = endpoints.map(async (endpoint) => {
        const startTime = Date.now();
        const response = await request.get(`${BASE_URL}${endpoint}`);
        const duration = Date.now() - startTime;
        return { endpoint, status: response.status(), duration };
      });

      const roundResults = await Promise.all(promises);
      results.push(...roundResults);

      if ((round + 1) % 5 === 0) {
        console.log(`Round ${round + 1} completed`);
      }
    }

    // エンドポイントごとの統計
    for (const endpoint of endpoints) {
      const endpointResults = results.filter(r => r.endpoint === endpoint);
      const avgDuration = endpointResults.reduce((a, b) => a + b.duration, 0) / endpointResults.length;
      const successRate = endpointResults.filter(r => r.status === 200).length / endpointResults.length;
      console.log(`${endpoint}: avgDuration=${avgDuration.toFixed(0)}ms, successRate=${(successRate * 100).toFixed(1)}%`);
    }
  });
});

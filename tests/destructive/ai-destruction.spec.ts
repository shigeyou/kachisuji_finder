import { test, expect, Page } from '@playwright/test';

/**
 * AI機能破壊テスト
 *
 * 目的: AI機能（Azure OpenAI）を使った機能を壊す
 * - 実際の探索実行
 * - SWOT再分析実行
 * - メタ分析実行
 * - 長時間処理中の操作
 *
 * ⚠️ このテストはAPIコストが発生します
 */

const BASE_URL = 'http://localhost:3006';

async function setupErrorCollection(page: Page) {
  const errors: string[] = [];
  const apiCalls: { url: string; status: number; duration: number }[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(`PAGE_ERROR: ${err.message}`);
  });

  page.on('response', (response) => {
    if (response.url().includes('/api/')) {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        duration: 0, // タイミングは別途計測
      });
    }
  });

  return { errors, apiCalls };
}

test.describe('AI機能破壊テスト - 探索実行', () => {
  test.setTimeout(600000); // 10分タイムアウト

  test('AI-001: 実際に探索を実行', async ({ page }) => {
    const { errors, apiCalls } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('海上風力発電事業への新規参入戦略を探索する');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Starting actual AI exploration...');
      const startTime = Date.now();

      await exploreButton.click();

      // 処理完了を待つ（最大5分）
      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          const loadingText = document.body.textContent?.includes('探索中') ||
                             document.body.textContent?.includes('生成中');
          return spinners.length === 0 && !loadingText;
        },
        { timeout: 300000 }
      ).catch(() => {
        console.log('Exploration still running after 5 minutes');
      });

      const duration = Date.now() - startTime;
      console.log(`Exploration completed in ${duration}ms`);

      // 結果を確認
      const pageContent = await page.content();
      const hasResults = pageContent.includes('戦略') ||
                        pageContent.includes('アクション') ||
                        pageContent.includes('スコア');

      console.log('Has exploration results:', hasResults);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-001-explore-result.png' });
    console.log('API calls:', apiCalls.length);
    console.log('Console errors:', errors);
  });

  test('AI-002: 探索を連続3回実行', async ({ page }) => {
    const { errors, apiCalls } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const themes = [
      'デジタルトランスフォーメーション戦略',
      'サステナビリティ経営戦略',
      'グローバル展開戦略',
    ];

    for (let i = 0; i < themes.length; i++) {
      console.log(`Starting exploration ${i + 1}: ${themes[i]}`);

      const textarea = page.locator('textarea').first();
      await textarea.fill(themes[i]);

      const exploreButton = page.locator('button:has-text("探索する")');

      if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exploreButton.click();

        // 完了を待つ
        await page.waitForFunction(
          () => {
            const spinners = document.querySelectorAll('.animate-spin');
            return spinners.length === 0;
          },
          { timeout: 180000 }
        ).catch(() => {
          console.log(`Exploration ${i + 1} timed out`);
        });

        console.log(`Exploration ${i + 1} completed`);
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-002-explore-3times.png' });
    console.log('Total API calls:', apiCalls.length);
    console.log('Console errors:', errors);
  });

  test('AI-003: 探索中に別の探索を開始（競合テスト）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('最初の探索テーマ');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 最初の探索を開始
      await exploreButton.click();
      console.log('First exploration started');

      // 5秒後に別のテーマで探索
      await page.waitForTimeout(5000);

      await textarea.fill('2番目の探索テーマ（競合）');

      // 再度探索ボタンをクリック（可能であれば）
      if (await exploreButton.isEnabled().catch(() => false)) {
        await exploreButton.click().catch(() => {
          console.log('Button disabled during exploration (expected)');
        });
      } else {
        console.log('Explore button is disabled during exploration');
      }

      await page.waitForTimeout(30000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-003-explore-conflict.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('AI機能破壊テスト - SWOT分析', () => {
  test.setTimeout(600000);

  test('AI-004: SWOT再分析を実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click();
    await page.waitForTimeout(2000);

    // 既存のSWOTを確認
    const pageContent = await page.content();
    const hasExistingSwot = pageContent.includes('強み') || pageContent.includes('弱み');
    console.log('Has existing SWOT:', hasExistingSwot);

    // 再分析ボタンを探す
    const reanalyzeButton = page.locator('button:has-text("再分析"), button:has-text("分析を実行"), button:has-text("SWOT分析")').first();

    if (await reanalyzeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Starting SWOT reanalysis...');
      const startTime = Date.now();

      await reanalyzeButton.click();

      // 完了を待つ
      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          const loadingText = document.body.textContent?.includes('分析中');
          return spinners.length === 0 && !loadingText;
        },
        { timeout: 180000 }
      ).catch(() => {
        console.log('SWOT analysis timed out');
      });

      const duration = Date.now() - startTime;
      console.log(`SWOT analysis completed in ${duration}ms`);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-004-swot-result.png' });
    console.log('Console errors:', errors);
  });

  test('AI-005: SWOT分析中にタブ切替', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click();
    await page.waitForTimeout(2000);

    const reanalyzeButton = page.locator('button:has-text("再分析"), button:has-text("分析を実行")').first();

    if (await reanalyzeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reanalyzeButton.click();
      console.log('SWOT analysis started');

      // 3秒後にタブ切替
      await page.waitForTimeout(3000);

      const ragTab = page.locator('button:has-text("RAG情報")');
      await ragTab.click();
      console.log('Switched to RAG tab during SWOT analysis');

      await page.waitForTimeout(5000);

      // SWOTタブに戻る
      await swotTab.click();
      console.log('Returned to SWOT tab');

      await page.waitForTimeout(30000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-005-swot-tab-switch.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('AI機能破壊テスト - メタ分析', () => {
  test.setTimeout(600000);

  test('AI-006: メタ分析を実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const insightsTab = page.locator('button:has-text("インサイト")');
    await insightsTab.click();
    await page.waitForTimeout(2000);

    // メタ分析ボタンを探す
    const metaButton = page.locator('button:has-text("メタ分析"), button:has-text("分析を実行"), button:has-text("インサイト")').first();

    if (await metaButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Starting meta-analysis...');
      const startTime = Date.now();

      await metaButton.click();

      // 完了を待つ
      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          return spinners.length === 0;
        },
        { timeout: 180000 }
      ).catch(() => {
        console.log('Meta-analysis timed out');
      });

      const duration = Date.now() - startTime;
      console.log(`Meta-analysis completed in ${duration}ms`);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-006-meta-result.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('AI機能破壊テスト - シン・勝ち筋', () => {
  test.setTimeout(600000);

  test('AI-007: 自動探索を実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const strategiesTab = page.locator('button:has-text("シン・勝ち筋")');
    await strategiesTab.click();
    await page.waitForTimeout(2000);

    // 自動探索ボタンを探す
    const autoButton = page.locator('button:has-text("自動"), button:has-text("探索する"), button:has-text("実行")').first();

    if (await autoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Starting auto exploration...');
      const startTime = Date.now();

      await autoButton.click();

      // 完了を待つ（長時間かかる可能性）
      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          return spinners.length === 0;
        },
        { timeout: 300000 }
      ).catch(() => {
        console.log('Auto exploration timed out');
      });

      const duration = Date.now() - startTime;
      console.log(`Auto exploration completed in ${duration}ms`);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-007-auto-result.png' });
    console.log('Console errors:', errors);
  });

  test('AI-008: 進化機能を実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const strategiesTab = page.locator('button:has-text("シン・勝ち筋")');
    await strategiesTab.click();
    await page.waitForTimeout(2000);

    // 進化ボタンを探す
    const evolveButton = page.locator('button:has-text("進化"), button:has-text("改善")').first();

    if (await evolveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Starting evolution...');
      const startTime = Date.now();

      await evolveButton.click();

      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll('.animate-spin');
          return spinners.length === 0;
        },
        { timeout: 180000 }
      ).catch(() => {
        console.log('Evolution timed out');
      });

      const duration = Date.now() - startTime;
      console.log(`Evolution completed in ${duration}ms`);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-008-evolve-result.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('AI機能破壊テスト - 複合シナリオ', () => {
  test.setTimeout(900000); // 15分

  test('AI-009: 全AI機能を連続実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const operations = [
      { tab: '勝ち筋探索', action: '探索を開始' },
      { tab: 'SWOT', action: '再分析' },
      { tab: 'インサイト', action: 'メタ分析' },
    ];

    for (const op of operations) {
      console.log(`\n=== Starting ${op.tab} ===`);

      const tab = page.locator(`button:has-text("${op.tab}")`).first();
      await tab.click();
      await page.waitForTimeout(2000);

      if (op.tab === '勝ち筋探索') {
        const textarea = page.locator('textarea').first();
        await textarea.fill('連続テスト用テーマ');
      }

      const actionButton = page.locator(`button:has-text("${op.action}")`).first();
      if (await actionButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await actionButton.click();

        // 完了を待つ
        await page.waitForFunction(
          () => {
            const spinners = document.querySelectorAll('.animate-spin');
            return spinners.length === 0;
          },
          { timeout: 180000 }
        ).catch(() => {
          console.log(`${op.tab} timed out`);
        });

        console.log(`${op.tab} completed`);
      }

      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/ai-009-all-ai.png' });
    console.log('Console errors:', errors);
  });
});

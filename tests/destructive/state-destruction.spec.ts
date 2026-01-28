import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * 状態破壊テスト
 *
 * 目的: 状態遷移でアプリを壊す
 * - 二度押し、連打
 * - 途中キャンセル、戻る/更新
 * - タブ複製、同時操作
 * - 入力途中離脱
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

test.describe('状態破壊テスト - 探索ボタン連打', () => {
  test.setTimeout(300000);

  test('SD-001: 探索ボタン10連打（ダブルクリック含む）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 勝ち筋探索タブに移動
    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    // テーマを入力
    const textarea = page.locator('textarea').first();
    await textarea.fill('テスト探索テーマ');

    // 探索ボタンを10回連打
    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Starting rapid button clicks...');

      for (let i = 0; i < 10; i++) {
        await exploreButton.click({ force: true }).catch(() => {});
        console.log(`Click ${i + 1}`);
      }

      // 結果を観察
      await page.waitForTimeout(5000);

      // ローディング状態を確認
      const isLoading = await page.locator('.animate-spin, text=探索中, text=生成中').isVisible().catch(() => false);
      console.log('Loading state after rapid clicks:', isLoading);

      // エラー表示を確認
      const hasError = await page.locator('text=エラー, text=失敗, text=error').first().isVisible().catch(() => false);
      console.log('Error displayed:', hasError);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-001-rapid-clicks.png' });
    console.log('Console errors:', errors);

    // 致命的エラーをチェック
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('unhandled') || e.includes('TypeError')
    );

    if (criticalErrors.length > 0) {
      console.log('⚠️ CRITICAL ERRORS:', criticalErrors);
    }
  });

  test('SD-002: 探索ボタン100連打', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('連打テスト');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Starting 100 rapid clicks...');

      let clickCount = 0;
      for (let i = 0; i < 100; i++) {
        try {
          await exploreButton.click({ force: true, timeout: 100 });
          clickCount++;
        } catch (e) {
          // ボタンが無効化されている可能性
        }
      }

      console.log('Successful clicks:', clickCount);
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-002-100-clicks.png' });
    console.log('Console errors:', errors);
  });

  test('SD-003: SWOT再分析ボタン連打', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    // APIをモック（即座にレスポンスを返す）
    await page.route('**/api/admin/swot', async (route, request) => {
      if (request.method() === 'POST') {
        console.log('SWOT API intercepted');
        // 少し遅延してからモックレスポンスを返す
        await new Promise(r => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            swot: {
              strengths: ['Test strength'],
              weaknesses: ['Test weakness'],
              opportunities: ['Test opportunity'],
              threats: ['Test threat'],
              summary: 'Test summary',
              updatedAt: new Date().toISOString(),
              updatedBy: 'test',
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click();
    await page.waitForTimeout(2000);

    // 再分析ボタンを探す
    const reanalyzeButton = page.locator('button:has-text("再分析")').first();

    if (await reanalyzeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Starting SWOT button test...');

      // 最初のクリック
      await reanalyzeButton.click();
      console.log('Click 1: sent');

      // ボタンが即座にdisabledになったことを確認
      await page.waitForTimeout(100);
      const buttonText = await reanalyzeButton.textContent().catch(() => 'unknown');
      const isDisabled = await reanalyzeButton.isDisabled().catch(() => false);

      console.log('Button text after click:', buttonText?.trim());
      console.log('Button disabled after click:', isDisabled);

      // 追加クリック試行（disabled状態なのでクリックできないはず）
      for (let i = 2; i <= 3; i++) {
        await page.waitForTimeout(100);
        const stillDisabled = await reanalyzeButton.isDisabled().catch(() => false);
        console.log(`Click ${i}: button still disabled = ${stillDisabled}`);
      }

      // API完了を待つ
      await page.waitForTimeout(3000);

      // ページがまだ動作していることを確認
      const pageTitle = await page.title().catch(() => 'PAGE_CLOSED');
      console.log('Page still active:', pageTitle !== 'PAGE_CLOSED');

      // ボタンが再度有効になったことを確認
      const finalDisabled = await reanalyzeButton.isDisabled().catch(() => true);
      console.log('Button re-enabled after completion:', !finalDisabled);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-003-swot-rapid.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('状態破壊テスト - 途中キャンセル', () => {
  test.setTimeout(300000);

  test('SD-004: 探索中にページリロード', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('リロードテスト用の探索テーマ');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 探索を開始
      await exploreButton.click();
      console.log('Exploration started');

      // 2秒後にリロード（探索処理中）
      await page.waitForTimeout(2000);
      console.log('Reloading page during exploration...');
      await page.reload();

      await page.waitForLoadState('networkidle');
      console.log('Page reloaded');

      // 状態を確認
      const bodyVisible = await page.locator('body').isVisible();
      console.log('Page still functional:', bodyVisible);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-004-reload-during-explore.png' });
    console.log('Console errors:', errors);
  });

  test('SD-005: 探索中にタブ切替', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('タブ切替テスト');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 探索を開始
      await exploreButton.click();
      console.log('Exploration started');

      // 1秒後にタブ切替
      await page.waitForTimeout(1000);

      const swotTab = page.locator('button:has-text("SWOT")').first();
      await swotTab.click();
      console.log('Switched to SWOT tab');

      await page.waitForTimeout(2000);

      // 探索タブに戻る
      await exploreTab.click();
      console.log('Switched back to explore tab');

      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-005-tab-switch-during-explore.png' });
    console.log('Console errors:', errors);
  });

  test('SD-006: 探索中に戻るボタン', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('戻るボタンテスト');

    const exploreButton = page.locator('button:has-text("探索する")');

    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      console.log('Exploration started');

      await page.waitForTimeout(1000);

      // ブラウザの戻るボタン
      await page.goBack().catch(() => {
        console.log('No history to go back');
      });

      await page.waitForTimeout(2000);

      // 進むボタン
      await page.goForward().catch(() => {
        console.log('No history to go forward');
      });

      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-006-back-during-explore.png' });
    console.log('Console errors:', errors);
  });

  test('SD-007: F5連打（リロード10回）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('Starting F5 rapid reload...');

    for (let i = 0; i < 10; i++) {
      await page.reload();
      console.log(`Reload ${i + 1}`);
      // 各リロード後に少し待つ
      await page.waitForTimeout(500);
    }

    await page.waitForLoadState('networkidle');

    const bodyVisible = await page.locator('body').isVisible();
    console.log('Page still functional after 10 reloads:', bodyVisible);

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-007-f5-rapid.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('状態破壊テスト - 入力途中離脱', () => {
  test.setTimeout(180000);

  test('SD-008: 入力途中でタブ切替→戻る', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('途中で離脱するテキスト');

    // 別タブに切替
    const swotTab = page.locator('button:has-text("SWOT")').first();
    await swotTab.click();
    await page.waitForTimeout(1000);

    // 戻る
    await exploreTab.click();
    await page.waitForTimeout(1000);

    // 入力が保持されているか確認
    const inputValue = await textarea.inputValue();
    console.log('Input preserved after tab switch:', inputValue.length > 0);
    console.log('Input value:', inputValue);

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-008-input-tab-switch.png' });
    console.log('Console errors:', errors);
  });

  test('SD-009: Enter連打（フォーム送信）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Enter連打テスト');

    // Enter連打
    console.log('Starting Enter key rapid press...');
    for (let i = 0; i < 20; i++) {
      await textarea.press('Enter');
    }

    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-009-enter-rapid.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('状態破壊テスト - タブ複製同時操作', () => {
  test.setTimeout(300000);

  test('SD-010: 2タブで同時探索', async ({ browser }) => {
    // 2つのコンテキストを作成
    const context1 = await browser.newContext({
      storageState: '.auth/azure-user.json',
    });
    const context2 = await browser.newContext({
      storageState: '.auth/azure-user.json',
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const errors1: string[] = [];
    const errors2: string[] = [];

    page1.on('console', (msg) => {
      if (msg.type() === 'error') errors1.push(msg.text());
    });
    page2.on('console', (msg) => {
      if (msg.type() === 'error') errors2.push(msg.text());
    });

    // 両方のページを開く
    await Promise.all([
      page1.goto(BASE_URL),
      page2.goto(BASE_URL),
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
    ]);

    // 両方で探索タブに移動
    await Promise.all([
      page1.locator('button:has-text("勝ち筋探索")').click(),
      page2.locator('button:has-text("勝ち筋探索")').click(),
    ]);

    await Promise.all([
      page1.waitForTimeout(1000),
      page2.waitForTimeout(1000),
    ]);

    // 両方でテーマ入力
    await Promise.all([
      page1.locator('textarea').first().fill('タブ1からの探索'),
      page2.locator('textarea').first().fill('タブ2からの探索'),
    ]);

    // 両方で同時に探索開始
    console.log('Starting simultaneous explorations...');

    const button1 = page1.locator('button:has-text("探索する")');
    const button2 = page2.locator('button:has-text("探索する")');

    const hasButton1 = await button1.isVisible({ timeout: 3000 }).catch(() => false);
    const hasButton2 = await button2.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton1 && hasButton2) {
      await Promise.all([
        button1.click().catch(() => {}),
        button2.click().catch(() => {}),
      ]);

      // 結果を観察
      await Promise.all([
        page1.waitForTimeout(10000),
        page2.waitForTimeout(10000),
      ]);
    }

    await page1.screenshot({ path: 'test-results/destructive-artifacts/sd-010-tab1-simultaneous.png' });
    await page2.screenshot({ path: 'test-results/destructive-artifacts/sd-010-tab2-simultaneous.png' });

    console.log('Tab 1 errors:', errors1);
    console.log('Tab 2 errors:', errors2);

    await context1.close();
    await context2.close();
  });

  test('SD-011: 同じボタンを2タブで同時クリック', async ({ browser }) => {
    const context1 = await browser.newContext({
      storageState: '.auth/azure-user.json',
    });
    const context2 = await browser.newContext({
      storageState: '.auth/azure-user.json',
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await Promise.all([
      page1.goto(BASE_URL),
      page2.goto(BASE_URL),
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
    ]);

    // SWOTタブで再分析ボタンを同時クリック
    await Promise.all([
      page1.locator('button:has-text("SWOT")').first().click(),
      page2.locator('button:has-text("SWOT")').first().click(),
    ]);

    await Promise.all([
      page1.waitForTimeout(2000),
      page2.waitForTimeout(2000),
    ]);

    const reanalyze1 = page1.locator('button:has-text("再分析"), button:has-text("分析を実行")').first();
    const reanalyze2 = page2.locator('button:has-text("再分析"), button:has-text("分析を実行")').first();

    const hasButton1 = await reanalyze1.isVisible({ timeout: 3000 }).catch(() => false);
    const hasButton2 = await reanalyze2.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton1 && hasButton2) {
      console.log('Clicking SWOT buttons simultaneously...');
      await Promise.all([
        reanalyze1.click().catch(() => {}),
        reanalyze2.click().catch(() => {}),
      ]);

      await Promise.all([
        page1.waitForTimeout(15000),
        page2.waitForTimeout(15000),
      ]);
    }

    await page1.screenshot({ path: 'test-results/destructive-artifacts/sd-011-swot-simultaneous-1.png' });
    await page2.screenshot({ path: 'test-results/destructive-artifacts/sd-011-swot-simultaneous-2.png' });

    await context1.close();
    await context2.close();
  });
});

test.describe('状態破壊テスト - データ削除', () => {
  test.setTimeout(180000);

  test('SD-012: 削除ボタン連打', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // はじめにタブでデータクリアボタンを探す
    const clearButton = page.locator('button:has-text("クリア"), button:has-text("削除")');

    if (await clearButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found clear button, clicking rapidly...');

      for (let i = 0; i < 10; i++) {
        await clearButton.first().click({ force: true }).catch(() => {});
      }

      await page.waitForTimeout(3000);
    } else {
      console.log('No clear button found');
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-012-clear-rapid.png' });
    console.log('Console errors:', errors);
  });

  test('SD-013: 削除確認ダイアログ連打', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ダイアログハンドラーを設定
    page.on('dialog', async (dialog) => {
      console.log('Dialog appeared:', dialog.message());
      await dialog.accept();
    });

    const clearButton = page.locator('button:has-text("自分のデータをクリア")');

    if (await clearButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 連続でクリック
      for (let i = 0; i < 5; i++) {
        await clearButton.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/sd-013-dialog-rapid.png' });
    console.log('Console errors:', errors);
  });
});

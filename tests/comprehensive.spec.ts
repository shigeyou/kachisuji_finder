import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';

// ===================================
// テーマ切り替えテスト
// ===================================

test.describe('テーマ切り替え機能', () => {
  test('テーマ切り替えボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ボタンを探す
    const themeButton = page.locator('button[title*="モード"]');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
    console.log('テーマ切り替えボタンを確認しました');
  });

  test('テーマ切り替えでdarkクラスが切り替わる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    const themeButton = page.locator('button[title*="モード"]');

    // 初期状態を確認
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));
    console.log('初期状態:', initialHasDark ? 'ダークモード' : 'ライトモード');

    // ボタンをクリック
    await themeButton.click();
    await page.waitForTimeout(500);

    // クラスが切り替わったことを確認
    const afterClickHasDark = await html.evaluate(el => el.classList.contains('dark'));
    console.log('クリック後:', afterClickHasDark ? 'ダークモード' : 'ライトモード');

    expect(afterClickHasDark).not.toBe(initialHasDark);
  });
});

// ===================================
// ナビゲーションタブテスト（SPA）
// ===================================

test.describe('タブナビゲーション', () => {
  test('初期表示 - はじめにタブ', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 初期タブは「はじめに」なので、アプリタイトルが表示される
    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    console.log('初期表示確認完了');
  });

  test('SWOTタブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // SWOTタブをクリック
    await page.click('button:has-text("SWOT")');
    await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });
    console.log('SWOTタブ確認完了');
  });

  test('ランキングタブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ランキングタブをクリック
    await page.click('button:has-text("ランキング")');
    await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });
    console.log('ランキングタブ確認完了');
  });

  test('インサイトタブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // インサイトタブをクリック
    await page.click('button:has-text("インサイト")');
    await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });
    console.log('インサイトタブ確認完了');
  });

  test('探索履歴タブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 探索履歴タブをクリック
    await page.click('button:has-text("探索履歴")');
    await expect(page.locator('h1:has-text("探索履歴")')).toBeVisible({ timeout: 10000 });
    console.log('探索履歴タブ確認完了');
  });

  test('スコア設定タブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // スコア設定タブをクリック
    await page.click('button:has-text("スコア設定")');
    await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
    console.log('スコア設定タブ確認完了');
  });

  test('RAG情報タブへ切り替え', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // RAG情報タブをクリック
    await page.click('button:has-text("RAG情報")');
    await expect(page.locator('h1:has-text("RAG情報")')).toBeVisible({ timeout: 10000 });
    console.log('RAG情報タブ確認完了');
  });
});

// ===================================
// 勝ち筋探索タブ機能テスト
// ===================================

test.describe('勝ち筋探索機能', () => {
  test('問い入力と探索ボタンの動作', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 勝ち筋探索タブへ切り替え
    await page.click('button:has-text("勝ち筋探索")');
    // タブの内容が表示されるのを待つ
    await expect(page.locator('text=問いを立てる')).toBeVisible({ timeout: 10000 });

    // 探索ボタンは初期状態でdisabled（exact matchで特定）
    const exploreBtn = page.getByRole('button', { name: '探索する', exact: true });
    await expect(exploreBtn).toBeDisabled();

    // 問いを入力
    await page.locator('textarea').first().fill('テスト用の問い：新規事業の可能性は？');

    // 探索ボタンが有効になる
    await expect(exploreBtn).toBeEnabled();
    console.log('問い入力と探索ボタンの動作を確認しました');
  });

  test('プリセット質問が表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 勝ち筋探索タブへ
    await page.click('button:has-text("勝ち筋探索")');
    await expect(page.locator('h1:has-text("勝ち筋探索")')).toBeVisible({ timeout: 10000 });

    // プリセット質問のラベルが表示される
    await expect(page.locator('text=プリセット質問')).toBeVisible();
    console.log('プリセット質問を確認しました');
  });
});

// ===================================
// SWOTタブ機能テスト
// ===================================

test.describe('SWOT機能', () => {
  test('SWOT分析ページが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // SWOTタブをクリック
    await page.click('button:has-text("SWOT")');
    await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });
    console.log('SWOT分析ページを確認しました');
  });

  test('再分析ボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // SWOTタブをクリック
    await page.click('button:has-text("SWOT")');
    await expect(page.locator('button:has-text("再分析")')).toBeVisible({ timeout: 10000 });
    console.log('再分析ボタンを確認しました');
  });
});

// ===================================
// レスポンシブテスト
// ===================================

test.describe('レスポンシブデザイン', () => {
  const viewports = [
    { width: 375, height: 667, name: 'モバイル' },
    { width: 768, height: 1024, name: 'タブレット' },
    { width: 1920, height: 1080, name: 'デスクトップ' },
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // h1が表示される
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
      console.log(`${viewport.name}表示確認完了`);
    });
  }
});

// ===================================
// アプリヘッダーテスト
// ===================================

test.describe('アプリヘッダー', () => {
  test('アプリタイトルが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ヘッダー内のアプリタイトルが表示される（複数要素があるため、headerに限定）
    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    console.log('アプリタイトルを確認しました');
  });

  test('サブタイトルが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // サブタイトルが表示される
    await expect(page.locator('text=企業の勝ち筋をAIで探索する')).toBeVisible({ timeout: 10000 });
    console.log('サブタイトルを確認しました');
  });
});

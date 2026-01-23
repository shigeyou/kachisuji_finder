import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

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
// ダッシュボード機能テスト
// ===================================

test.describe('ダッシュボード機能', () => {
  test('問い入力と探索ボタンの動作', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 探索ボタンは初期状態でdisabled
    const exploreBtn = page.locator('button:has-text("探索する")');
    await expect(exploreBtn).toBeDisabled();

    // 問いを入力
    await page.locator('textarea').fill('テスト用の問い：新規事業の可能性は？');

    // 探索ボタンが有効になる
    await expect(exploreBtn).toBeEnabled();
    console.log('問い入力と探索ボタンの動作を確認しました');
  });

  test('SWOTセクションが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // SWOTセクションのタイトルを確認
    await expect(page.locator('text=現状認識（SWOT）')).toBeVisible();
    console.log('SWOTセクションを確認しました');
  });

  test('活動サマリーが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=あなたの活動')).toBeVisible();
    console.log('活動サマリーを確認しました');
  });
});

// ===================================
// ナビゲーションテスト
// ===================================

test.describe('ナビゲーション', () => {
  test('ダッシュボード -> 戦略一覧 -> ダッシュボード', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 戦略一覧へ
    await page.click('nav a:has-text("戦略一覧")');
    await expect(page).toHaveURL(/\/strategies/);

    // ダッシュボードへ戻る
    await page.click('text=← ダッシュボード');
    await expect(page).toHaveURL(BASE_URL + '/');

    console.log('ナビゲーションテスト完了');
  });

  test('ダッシュボード -> インサイト -> ダッシュボード', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // インサイトへ
    await page.click('nav a:has-text("インサイト")');
    await expect(page).toHaveURL(/\/insights/);

    // ダッシュボードへ戻る
    await page.click('text=← ダッシュボード');
    await expect(page).toHaveURL(BASE_URL + '/');

    console.log('ナビゲーションテスト完了');
  });

  test('ダッシュボード -> 設定 -> ダッシュボード', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 設定へ
    await page.click('nav a:has-text("設定")');
    await expect(page).toHaveURL(/\/settings/);

    // ダッシュボードへ戻る
    await page.click('text=← ダッシュボード');
    await expect(page).toHaveURL(BASE_URL + '/');

    console.log('ナビゲーションテスト完了');
  });
});

// ===================================
// 設定ページタブテスト
// ===================================

test.describe('設定ページ - タブ切り替え', () => {
  test('コア情報タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=コア情報（サービス・資産）')).toBeVisible();
    console.log('コア情報タブを確認しました');
  });

  test('スコア設定タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("スコア設定")');
    await expect(page.locator('text=スコア重み付け')).toBeVisible();
    console.log('スコア設定タブを確認しました');
  });

  test('外観タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("外観")');
    await expect(page.locator('text=ダークモード')).toBeVisible();
    console.log('外観タブを確認しました');
  });
});

// ===================================
// 戦略一覧ページタブテスト
// ===================================

test.describe('戦略一覧ページ - タブ切り替え', () => {
  test('採用した戦略タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("採用した戦略")')).toBeVisible();
    console.log('採用した戦略タブを確認しました');
  });

  test('ランキングタブ', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("ランキング")');
    await expect(page.locator('button:has-text("ランキング")')).toHaveClass(/border-blue-600/);
    console.log('ランキングタブを確認しました');
  });

  test('進化生成タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("進化生成")');
    await expect(page.locator('text=進化生成を実行')).toBeVisible();
    console.log('進化生成タブを確認しました');
  });

  test('AI自動探索タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("AI自動探索")');
    await expect(page.locator('text=自動探索を実行')).toBeVisible();
    console.log('AI自動探索タブを確認しました');
  });
});

// ===================================
// インサイトページタブテスト
// ===================================

test.describe('インサイトページ - タブ切り替え', () => {
  test('探索履歴タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("探索履歴")')).toBeVisible();
    console.log('探索履歴タブを確認しました');
  });

  test('学習パターンタブ', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("学習パターン")');
    await expect(page.getByRole('button', { name: 'パターンを抽出' })).toBeVisible();
    console.log('学習パターンタブを確認しました');
  });

  test('メタ分析タブ', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("メタ分析")');
    await expect(page.locator('text=メタ分析を実行')).toBeVisible();
    console.log('メタ分析タブを確認しました');
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

      await expect(page.locator('h1')).toBeVisible();
      console.log(`${viewport.name}表示確認完了`);
    });
  }
});

// ===================================
// 旧ページが404になることを確認
// ===================================

test.describe('旧ページは404', () => {
  test('/explore は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/explore');
    expect(response?.status()).toBe(404);
    console.log('/explore は正しく404を返しました');
  });

  test('/history は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/history');
    expect(response?.status()).toBe(404);
    console.log('/history は正しく404を返しました');
  });

  test('/core は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/core');
    expect(response?.status()).toBe(404);
    console.log('/core は正しく404を返しました');
  });

  test('/swot は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/swot');
    expect(response?.status()).toBe(404);
    console.log('/swot は正しく404を返しました');
  });
});

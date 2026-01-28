import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';

// ===================================
// 基本的なナビゲーションテスト
// ===================================

test.describe('基本ナビゲーション', () => {
  test('1. ホームページが正常に表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    // タブが存在することを確認
    await expect(page.locator('button:has-text("SWOT")')).toBeVisible();
    await expect(page.locator('button:has-text("勝ち筋探索")')).toBeVisible();
    await expect(page.locator('button:has-text("ランキング")')).toBeVisible();
  });

  test('2. SWOTタブへ切り替えできる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("SWOT")');
    await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });
  });

  test('3. ランキングタブへ切り替えできる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("ランキング")');
    await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });
  });

  test('4. インサイトタブへ切り替えできる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("インサイト")');
    await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });
  });

  test('5. タブ間を自由に行き来できる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 勝ち筋探索 → SWOT
    await page.click('button:has-text("勝ち筋探索")');
    await expect(page.locator('h1:has-text("勝ち筋探索")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("SWOT")');
    await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });

    // SWOT → ランキング
    await page.click('button:has-text("ランキング")');
    await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });

    // ランキング → 探索履歴
    await page.click('button:has-text("探索履歴")');
    await expect(page.locator('h1:has-text("探索履歴")')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// 勝ち筋探索機能テスト
// ===================================

test.describe('勝ち筋探索機能', () => {
  test('6. 問い入力と探索ボタン', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("勝ち筋探索")');
    await expect(page.locator('text=問いを立てる')).toBeVisible({ timeout: 10000 });

    // 探索ボタンは初期状態でdisabled（exact matchで特定）
    const exploreBtn = page.getByRole('button', { name: '探索する', exact: true });
    await expect(exploreBtn).toBeDisabled();

    // 問いを入力
    await page.locator('textarea').first().fill('テスト問い');

    // 探索ボタンが有効になる
    await expect(exploreBtn).toBeEnabled();
  });

  test('7. プリセット質問が表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("勝ち筋探索")');
    await expect(page.locator('text=プリセット質問')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// SWOTタブテスト
// ===================================

test.describe('SWOTタブ', () => {
  test('8. 再分析ボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("SWOT")');
    await expect(page.locator('button:has-text("再分析")')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// スコア設定タブテスト
// ===================================

test.describe('スコア設定タブ', () => {
  test('9. スコア設定が表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("スコア設定")');
    await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
  });

  test('10. スコア項目が表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("スコア設定")');
    await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=収益ポテンシャル').first()).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// ランキングタブテスト
// ===================================

test.describe('ランキングタブ', () => {
  test('11. ランキングが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("ランキング")');
    await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// インサイトタブテスト
// ===================================

test.describe('インサイトタブ', () => {
  test('12. メタ分析ボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("インサイト")');
    await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });
    // メタ分析サブタブに切り替え
    await page.click('button:has-text("メタ分析"):not(:has-text("を実行"))');
    await expect(page.getByRole('button', { name: 'メタ分析を実行' })).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// 探索履歴タブテスト
// ===================================

test.describe('探索履歴タブ', () => {
  test('13. 探索履歴が表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("探索履歴")');
    await expect(page.locator('h1:has-text("探索履歴")')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// エクスポートAPIテスト
// ===================================

test.describe('エクスポートAPI', () => {
  test('14. CSVエクスポートAPIが正常に動作する', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=services&format=csv');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
  });

  test('15. JSONエクスポートAPIが正常に動作する', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=services&format=json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('16. 不正なエクスポートタイプでエラーが返る', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=invalid&format=csv');
    expect(response.status()).toBe(400);
  });
});

// ===================================
// UIインタラクションテスト
// ===================================

test.describe('UIインタラクション', () => {
  test('17. レスポンシブレイアウトのテスト（モバイル幅）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
  });

  test('18. レスポンシブレイアウトのテスト（タブレット幅）', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
  });

  test('19. レスポンシブレイアウトのテスト（デスクトップ幅）', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
  });
});

// ===================================
// パフォーマンステスト
// ===================================

test.describe('パフォーマンス', () => {
  test('20. ホームページのロード時間が5秒以内', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });
});

// ===================================
// テーマ切り替えテスト
// ===================================

test.describe('テーマ切り替え', () => {
  test('21. テーマ切り替えボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const themeButton = page.locator('button[title*="モード"]');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
  });

  test('22. テーマ切り替えボタンをクリックするとdarkクラスが切り替わる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));

    const themeButton = page.locator('button[title*="モード"]');
    await themeButton.click();

    await page.waitForTimeout(500);
    const afterClickHasDark = await html.evaluate(el => el.classList.contains('dark'));
    expect(afterClickHasDark).not.toBe(initialHasDark);
  });
});

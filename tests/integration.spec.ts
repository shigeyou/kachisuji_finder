import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';

test.describe('新UI統合テスト', () => {
  // ===== メイン画面 =====
  test.describe('メイン画面', () => {
    test('ページ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    });

    test('ナビゲーションタブが表示される', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 主要なタブが表示される
      await expect(page.locator('button:has-text("SWOT")')).toBeVisible();
      await expect(page.locator('button:has-text("勝ち筋探索")')).toBeVisible();
      await expect(page.locator('button:has-text("ランキング")')).toBeVisible();
      await expect(page.locator('button:has-text("インサイト")')).toBeVisible();
    });
  });

  // ===== 勝ち筋探索タブ =====
  test.describe('勝ち筋探索タブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("勝ち筋探索")');
      await expect(page.locator('h1:has-text("勝ち筋探索")')).toBeVisible({ timeout: 10000 });
    });

    test('問い入力と探索ボタン', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("勝ち筋探索")');
      await expect(page.locator('h1:has-text("勝ち筋探索")')).toBeVisible({ timeout: 10000 });

      // 探索ボタンは初期状態でdisabled（exact matchで特定）
      const exploreBtn = page.getByRole('button', { name: '探索する', exact: true });
      await expect(exploreBtn).toBeDisabled();

      // 問いを入力
      await page.locator('textarea').first().fill('テスト問い');

      // 探索ボタンが有効になる
      await expect(exploreBtn).toBeEnabled();
    });
  });

  // ===== SWOTタブ =====
  test.describe('SWOTタブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("SWOT")');
      await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });
    });

    test('再分析ボタンが表示される', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("SWOT")');
      await expect(page.locator('button:has-text("再分析")')).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== ランキングタブ =====
  test.describe('ランキングタブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("ランキング")');
      await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== インサイトタブ =====
  test.describe('インサイトタブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("インサイト")');
      await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });
    });

    test('メタ分析ボタンが表示される', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("インサイト")');
      await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });
      // メタ分析サブタブに切り替え
      await page.click('button:has-text("メタ分析"):not(:has-text("を実行"))');
      await expect(page.getByRole('button', { name: 'メタ分析を実行' })).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== 探索履歴タブ =====
  test.describe('探索履歴タブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("探索履歴")');
      await expect(page.locator('h1:has-text("探索履歴")')).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== スコア設定タブ =====
  test.describe('スコア設定タブ', () => {
    test('タブ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("スコア設定")');
      await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
    });

    test('スコア項目が表示される', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("スコア設定")');
      await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
      // スコア項目が表示される
      await expect(page.locator('text=収益ポテンシャル').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== タブ間遷移 =====
  test.describe('タブ間遷移', () => {
    test('勝ち筋探索 → SWOT → ランキング', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 勝ち筋探索
      await page.click('button:has-text("勝ち筋探索")');
      await expect(page.locator('h1:has-text("勝ち筋探索")')).toBeVisible({ timeout: 10000 });

      // SWOT
      await page.click('button:has-text("SWOT")');
      await expect(page.locator('h1:has-text("SWOT分析")')).toBeVisible({ timeout: 10000 });

      // ランキング
      await page.click('button:has-text("ランキング")');
      await expect(page.locator('h1:has-text("ランキング")')).toBeVisible({ timeout: 10000 });
    });

    test('インサイト → 探索履歴 → スコア設定', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // インサイト
      await page.click('button:has-text("インサイト")');
      await expect(page.locator('h1:has-text("インサイト")')).toBeVisible({ timeout: 10000 });

      // 探索履歴
      await page.click('button:has-text("探索履歴")');
      await expect(page.locator('h1:has-text("探索履歴")')).toBeVisible({ timeout: 10000 });

      // スコア設定
      await page.click('button:has-text("スコア設定")');
      await expect(page.locator('h1:has-text("スコア設定")')).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== レスポンシブ =====
  test.describe('レスポンシブ', () => {
    test('モバイル表示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    });

    test('タブレット表示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('header').locator('text=勝ち筋ファインダー')).toBeVisible({ timeout: 10000 });
    });
  });

  // ===== ダークモード =====
  test.describe('ダークモード', () => {
    test('ダークモード切り替え', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // テーマトグルボタンをクリック
      const themeToggle = page.locator('button[title*="モード"]').first();
      if (await themeToggle.isVisible()) {
        const initialDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
        await themeToggle.click();
        await page.waitForTimeout(300);

        // htmlタグのdarkクラスが切り替わったか確認
        const afterDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
        expect(afterDark).not.toBe(initialDark);
      }
    });
  });
});

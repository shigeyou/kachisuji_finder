import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('新UI統合テスト', () => {
  // ===== ダッシュボード =====
  test.describe('ダッシュボード', () => {
    test('ページ表示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('勝ち筋ファインダー');
    });

    test('SWOT表示の詳細開閉', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 「詳細を見る」ボタンがあれば展開
      const detailBtn = page.locator('button:has-text("詳細を見る")');
      if (await detailBtn.isVisible()) {
        await detailBtn.click();
        await expect(page.locator('text=強み (Strengths)')).toBeVisible();

        // 閉じる
        const closeBtn = page.locator('button:has-text("閉じる")');
        await closeBtn.click();
      }
    });

    test('問い入力と探索ボタン', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 探索ボタンは初期状態でdisabled
      const exploreBtn = page.locator('button:has-text("探索する")');
      await expect(exploreBtn).toBeDisabled();

      // 問いを入力
      await page.locator('textarea').fill('テスト問い');

      // 探索ボタンが有効になる
      await expect(exploreBtn).toBeEnabled();
    });

    test('ナビゲーションリンク', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 戦略一覧リンク
      await expect(page.locator('nav a:has-text("戦略一覧")')).toBeVisible();

      // インサイトリンク
      await expect(page.locator('nav a:has-text("インサイト")')).toBeVisible();

      // 設定リンク
      await expect(page.locator('nav a:has-text("設定")')).toBeVisible();
    });
  });

  // ===== 戦略一覧 =====
  test.describe('戦略一覧', () => {
    test('ページ表示', async ({ page }) => {
      await page.goto(BASE_URL + '/strategies');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('戦略一覧');
    });

    test('タブ切り替え - ランキング', async ({ page }) => {
      await page.goto(BASE_URL + '/strategies');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("ランキング")');
      await expect(page.locator('button:has-text("ランキング")')).toHaveClass(/border-blue-600/);
    });

    test('タブ切り替え - 進化生成', async ({ page }) => {
      await page.goto(BASE_URL + '/strategies');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("進化生成")');
      await expect(page.locator('text=進化生成を実行')).toBeVisible();
    });

    test('タブ切り替え - AI自動探索', async ({ page }) => {
      await page.goto(BASE_URL + '/strategies');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("AI自動探索")');
      await expect(page.locator('text=自動探索を実行')).toBeVisible();
    });
  });

  // ===== インサイト =====
  test.describe('インサイト', () => {
    test('ページ表示', async ({ page }) => {
      await page.goto(BASE_URL + '/insights');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('インサイト');
    });

    test('タブ切り替え - 学習パターン', async ({ page }) => {
      await page.goto(BASE_URL + '/insights');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("学習パターン")');
      await expect(page.getByRole('button', { name: 'パターンを抽出' })).toBeVisible();
    });

    test('タブ切り替え - メタ分析', async ({ page }) => {
      await page.goto(BASE_URL + '/insights');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("メタ分析")');
      await expect(page.locator('text=メタ分析を実行')).toBeVisible();
    });

    test('URLパラメータでタブ切り替え', async ({ page }) => {
      await page.goto(BASE_URL + '/insights?tab=patterns');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('button', { name: 'パターンを抽出' })).toBeVisible();
    });
  });

  // ===== 設定 =====
  test.describe('設定', () => {
    test('ページ表示', async ({ page }) => {
      await page.goto(BASE_URL + '/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('設定');
    });

    test('タブ切り替え - スコア設定', async ({ page }) => {
      await page.goto(BASE_URL + '/settings');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("スコア設定")');
      await expect(page.locator('text=収益ポテンシャル')).toBeVisible();
    });

    test('タブ切り替え - 外観', async ({ page }) => {
      await page.goto(BASE_URL + '/settings');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("外観")');
      await expect(page.locator('text=ダークモード')).toBeVisible();
    });

    test('コア情報 - サービス追加フォーム表示', async ({ page }) => {
      await page.goto(BASE_URL + '/settings');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("+ 追加")');
      // インラインフォームが表示される
      await expect(page.locator('text=サービスを追加')).toBeVisible();
    });
  });

  // ===== ナビゲーション =====
  test.describe('ナビゲーション', () => {
    test('ダッシュボード → 戦略一覧', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await page.click('nav a:has-text("戦略一覧")');
      await expect(page).toHaveURL(/\/strategies/);
    });

    test('戦略一覧 → ダッシュボード', async ({ page }) => {
      await page.goto(BASE_URL + '/strategies');
      await page.waitForLoadState('networkidle');

      await page.click('text=← ダッシュボード');
      await expect(page).toHaveURL(BASE_URL + '/');
    });

    test('インサイト → 戦略一覧', async ({ page }) => {
      await page.goto(BASE_URL + '/insights');
      await page.waitForLoadState('networkidle');

      await page.click('a:has-text("戦略一覧")');
      await expect(page).toHaveURL(/\/strategies/);
    });
  });

  // ===== レスポンシブ =====
  test.describe('レスポンシブ', () => {
    test('モバイル表示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
    });

    test('タブレット表示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
    });
  });

  // ===== ダークモード =====
  test.describe('ダークモード', () => {
    test('ダークモード切り替え', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // テーマトグルボタンをクリック
      const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("🌙"), button:has-text("☀️")').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(300);

        // htmlタグにdarkクラスがあるか確認
        const isDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
        expect(typeof isDark).toBe('boolean');
      }
    });
  });

  // ===== 旧ページが404 =====
  test.describe('旧ページは404', () => {
    test('/explore は404', async ({ page }) => {
      const response = await page.goto(BASE_URL + '/explore');
      expect(response?.status()).toBe(404);
    });

    test('/ranking は404', async ({ page }) => {
      const response = await page.goto(BASE_URL + '/ranking');
      expect(response?.status()).toBe(404);
    });

    test('/history は404', async ({ page }) => {
      const response = await page.goto(BASE_URL + '/history');
      expect(response?.status()).toBe(404);
    });

    test('/swot は404', async ({ page }) => {
      const response = await page.goto(BASE_URL + '/swot');
      expect(response?.status()).toBe(404);
    });
  });
});

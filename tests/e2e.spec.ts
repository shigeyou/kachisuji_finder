import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ===================================
// 基本的なナビゲーションテスト
// ===================================

test.describe('基本ナビゲーション', () => {
  test('1. ホームページが正常に表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('勝ち筋ファインダー');
    // ナビゲーションリンクが存在することを確認
    await expect(page.locator('nav a:has-text("戦略一覧")')).toBeVisible();
    await expect(page.locator('nav a:has-text("インサイト")')).toBeVisible();
    await expect(page.locator('nav a:has-text("設定")')).toBeVisible();
  });

  test('2. 設定ページへ遷移できる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('nav a:has-text("設定")');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('h1')).toContainText('設定');
  });

  test('3. 戦略一覧ページへ遷移できる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('nav a:has-text("戦略一覧")');
    await expect(page).toHaveURL(/\/strategies/);
    await expect(page.locator('h1')).toContainText('戦略一覧');
  });

  test('4. インサイトページへ遷移できる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click('nav a:has-text("インサイト")');
    await expect(page).toHaveURL(/\/insights/);
    await expect(page.locator('h1')).toContainText('インサイト');
  });

  test('5. ページ間を自由に行き来できる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ホーム → 戦略一覧
    await page.click('nav a:has-text("戦略一覧")');
    await expect(page).toHaveURL(/\/strategies/);

    // 戦略一覧 → ダッシュボード
    await page.click('text=← ダッシュボード');
    await expect(page).toHaveURL(BASE_URL + '/');

    // ホーム → 設定
    await page.click('nav a:has-text("設定")');
    await expect(page).toHaveURL(/\/settings/);

    // 設定 → ダッシュボード
    await page.click('text=← ダッシュボード');
    await expect(page).toHaveURL(BASE_URL + '/');
  });
});

// ===================================
// ダッシュボード機能テスト
// ===================================

test.describe('ダッシュボード機能', () => {
  test('6. SWOT表示の詳細開閉', async ({ page }) => {
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

  test('7. 問い入力と探索ボタン', async ({ page }) => {
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

  test('8. 活動サマリーが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 活動サマリーセクションを確認
    await expect(page.locator('text=あなたの活動')).toBeVisible();
    await expect(page.locator('text=探索回数')).toBeVisible();
    await expect(page.locator('text=採用戦略')).toBeVisible();
    await expect(page.locator('text=採用率')).toBeVisible();
  });
});

// ===================================
// 設定ページテスト
// ===================================

test.describe('設定ページ', () => {
  test('9. タブ切り替え - コア情報', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=コア情報（サービス・資産）')).toBeVisible();
  });

  test('10. タブ切り替え - スコア設定', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("スコア設定")');
    await expect(page.locator('text=スコア重み付け')).toBeVisible();
    await expect(page.locator('text=収益ポテンシャル')).toBeVisible();
  });

  test('11. タブ切り替え - 外観', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("外観")');
    await expect(page.locator('text=ダークモード')).toBeVisible();
  });

  test('12. サービス追加フォーム表示', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("+ 追加")');
    await expect(page.locator('text=サービスを追加')).toBeVisible();
  });

  test('13. サービス追加キャンセル', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("+ 追加")');
    await expect(page.locator('text=サービスを追加')).toBeVisible();

    await page.click('button:has-text("キャンセル")');
    // フォームが閉じることを確認（サービスを追加のテキストが消える）
    await expect(page.locator('text=サービスを追加')).not.toBeVisible();
  });

  test('14. CSV出力ボタンが存在する', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("CSV出力")')).toBeVisible();
  });
});

// ===================================
// 戦略一覧ページテスト
// ===================================

test.describe('戦略一覧ページ', () => {
  test('15. タブ切り替え - 採用した戦略', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("採用した戦略")')).toBeVisible();
  });

  test('16. タブ切り替え - ランキング', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("ランキング")');
    await expect(page.locator('button:has-text("ランキング")')).toHaveClass(/border-blue-600/);
  });

  test('17. タブ切り替え - 進化生成', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("進化生成")');
    await expect(page.locator('text=進化生成を実行')).toBeVisible();
  });

  test('18. タブ切り替え - AI自動探索', async ({ page }) => {
    await page.goto(BASE_URL + '/strategies');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("AI自動探索")');
    await expect(page.locator('text=自動探索を実行')).toBeVisible();
  });
});

// ===================================
// インサイトページテスト
// ===================================

test.describe('インサイトページ', () => {
  test('19. タブ切り替え - 探索履歴', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("探索履歴")')).toBeVisible();
  });

  test('20. タブ切り替え - 学習パターン', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("学習パターン")');
    await expect(page.getByRole('button', { name: 'パターンを抽出' })).toBeVisible();
  });

  test('21. タブ切り替え - メタ分析', async ({ page }) => {
    await page.goto(BASE_URL + '/insights');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("メタ分析")');
    await expect(page.locator('text=メタ分析を実行')).toBeVisible();
  });

  test('22. URLパラメータでタブ切り替え', async ({ page }) => {
    await page.goto(BASE_URL + '/insights?tab=patterns');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'パターンを抽出' })).toBeVisible();
  });
});

// ===================================
// エクスポートAPIテスト
// ===================================

test.describe('エクスポートAPI', () => {
  test('23. CSVエクスポートAPIが正常に動作する', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=services&format=csv');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
  });

  test('24. JSONエクスポートAPIが正常に動作する', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=services&format=json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('25. 不正なエクスポートタイプでエラーが返る', async ({ page }) => {
    const response = await page.request.get(BASE_URL + '/api/export?type=invalid&format=csv');
    expect(response.status()).toBe(400);
  });
});

// ===================================
// エラーハンドリングテスト
// ===================================

test.describe('エラーハンドリング', () => {
  test('26. 存在しないページにアクセスした時の動作', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/nonexistent');
    expect(response?.status()).toBe(404);
  });

  test('27. 旧ルート /explore は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/explore');
    expect(response?.status()).toBe(404);
  });

  test('28. 旧ルート /history は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/history');
    expect(response?.status()).toBe(404);
  });

  test('29. 旧ルート /core は404', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/core');
    expect(response?.status()).toBe(404);
  });
});

// ===================================
// UIインタラクションテスト
// ===================================

test.describe('UIインタラクション', () => {
  test('30. レスポンシブレイアウトのテスト（モバイル幅）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('勝ち筋ファインダー');
  });

  test('31. レスポンシブレイアウトのテスト（タブレット幅）', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('勝ち筋ファインダー');
  });

  test('32. レスポンシブレイアウトのテスト（デスクトップ幅）', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('勝ち筋ファインダー');
  });
});

// ===================================
// パフォーマンステスト
// ===================================

test.describe('パフォーマンス', () => {
  test('33. ホームページのロード時間が5秒以内', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('34. 設定ページのロード時間が5秒以内', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });
});

// ===================================
// テーマ切り替えテスト
// ===================================

test.describe('テーマ切り替え', () => {
  test('35. テーマ切り替えボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const themeButton = page.locator('button[title*="モード"]');
    await expect(themeButton).toBeVisible();
  });

  test('36. テーマ切り替えボタンをクリックするとdarkクラスが切り替わる', async ({ page }) => {
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

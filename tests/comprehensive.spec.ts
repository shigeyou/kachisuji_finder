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
// 探索機能テスト - 様々な制約条件の組み合わせ
// ===================================

test.describe('勝ち筋探索 - 制約条件の組み合わせ', () => {
  const testQuestions = [
    '新規事業として何が有望か？',
    '既存ビジネスの改善点は何か？',
    '親会社との連携で何ができるか？',
    'デジタルトランスフォーメーションの戦略は？',
    'コスト削減の方法は？',
    '顧客満足度を上げるには？',
    '競合他社との差別化ポイントは？',
    '新しい市場への参入方法は？',
  ];

  const constraintCombinations = [
    { existing: true, parent: false, synergy: false, name: '既存ビジネスのみ' },
    { existing: false, parent: true, synergy: false, name: '親会社シナジーのみ' },
    { existing: false, parent: false, synergy: true, name: 'グループシナジーのみ' },
    { existing: true, parent: true, synergy: false, name: '既存+親会社' },
    { existing: true, parent: false, synergy: true, name: '既存+グループ' },
    { existing: false, parent: true, synergy: true, name: '親会社+グループ' },
    { existing: true, parent: true, synergy: true, name: 'すべての制約' },
    { existing: false, parent: false, synergy: false, name: '制約なし' },
  ];

  for (let i = 0; i < Math.min(testQuestions.length, 3); i++) {
    const question = testQuestions[i];
    const constraints = constraintCombinations[i % constraintCombinations.length];

    test(`探索テスト ${i + 1}: "${question.slice(0, 20)}..." (${constraints.name})`, async ({ page }) => {
      await page.goto(BASE_URL + '/explore');
      await page.waitForLoadState('networkidle');

      // 問いを入力
      const questionTextarea = page.locator('textarea').first();
      await questionTextarea.fill(question);

      // 背景情報を入力
      const contextTextarea = page.locator('textarea').nth(1);
      await contextTextarea.fill('テスト用の背景情報です。');

      // 制約条件を設定
      const existingCheckbox = page.locator('#existing');
      const parentCheckbox = page.locator('#parent');
      const synergyCheckbox = page.locator('#synergy');

      // 既存ビジネス
      const existingChecked = await existingCheckbox.isChecked();
      if (existingChecked !== constraints.existing) {
        await existingCheckbox.click();
      }

      // 親会社シナジー
      const parentChecked = await parentCheckbox.isChecked();
      if (parentChecked !== constraints.parent) {
        await parentCheckbox.click();
      }

      // グループシナジー
      const synergyChecked = await synergyCheckbox.isChecked();
      if (synergyChecked !== constraints.synergy) {
        await synergyCheckbox.click();
      }

      console.log(`テスト ${i + 1}: 問い="${question}", 制約=${constraints.name}`);

      // 探索ボタンを確認
      const exploreButton = page.locator('button:has-text("勝ち筋を探索")');
      await expect(exploreButton).toBeEnabled();

      console.log('探索ボタンが有効です');
    });
  }
});

// ===================================
// ページ遷移テスト
// ===================================

test.describe('ページ遷移', () => {
  test('ホーム -> 探索 -> ホーム', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 探索へ
    await page.getByRole('link', { name: '探索を始める' }).click();
    await expect(page).toHaveURL(/\/explore/);

    // ホームへ戻る
    await page.click('text=← ホームに戻る');
    await expect(page).toHaveURL(BASE_URL + '/');

    console.log('ページ遷移テスト完了');
  });

  test('ホーム -> コア情報 -> ホーム', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // コア情報へ
    await page.getByRole('link', { name: 'コア情報を登録' }).click();
    await expect(page).toHaveURL(/\/core/);

    // ホームへ戻る
    await page.click('text=← ホームに戻る');
    await expect(page).toHaveURL(BASE_URL + '/');

    console.log('ページ遷移テスト完了');
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

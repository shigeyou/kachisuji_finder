import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('ダークモードテスト', () => {
  test('テーマ切り替えボタンが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const themeButton = page.locator('button[title*="モード"]');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
  });

  test('ボタンクリックでdarkクラスが切り替わる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    const themeButton = page.locator('button[title*="モード"]');

    // 初期状態を確認
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));
    console.log('Initial dark mode:', initialHasDark);

    // ボタンをクリック
    await themeButton.click();
    await page.waitForTimeout(300);

    // クラスが切り替わったことを確認
    const afterClickHasDark = await html.evaluate(el => el.classList.contains('dark'));
    console.log('After click dark mode:', afterClickHasDark);

    expect(afterClickHasDark).not.toBe(initialHasDark);
  });

  test('ダークモードでbody背景色が変わる', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ライトモードの背景色を取得
    const lightBg = await page.locator('body').evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('Light mode bg:', lightBg);

    // ダークモードに切り替え
    const themeButton = page.locator('button[title*="モード"]');
    await themeButton.click();
    await page.waitForTimeout(300);

    // ダークモードの背景色を取得
    const darkBg = await page.locator('body').evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('Dark mode bg:', darkBg);

    // 背景色が変わっていることを確認
    expect(lightBg).not.toBe(darkBg);
  });

  test('テーマがlocalStorageに保存される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ダークモードに切り替え
    const themeButton = page.locator('button[title*="モード"]');
    await themeButton.click();
    await page.waitForTimeout(300);

    // localStorageを確認
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    console.log('Saved theme:', theme);

    expect(theme).toBe('dark');
  });

  test('ページリロード後もテーマが維持される', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // ダークモードに切り替え
    const themeButton = page.locator('button[title*="モード"]');
    const html = page.locator('html');

    // 初期状態がライトモードの場合、ダークに切り替え
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));
    if (!initialHasDark) {
      await themeButton.click();
      await page.waitForTimeout(300);
    }

    // リロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ダークモードが維持されていることを確認
    const afterReloadHasDark = await html.evaluate(el => el.classList.contains('dark'));
    expect(afterReloadHasDark).toBe(true);
  });
});

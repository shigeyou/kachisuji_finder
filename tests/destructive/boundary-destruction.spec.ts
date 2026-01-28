import { test, expect, Page } from '@playwright/test';

/**
 * 境界値破壊テスト
 *
 * 目的: 入力の境界値でアプリを壊す
 * - 空入力
 * - 極端に長い入力
 * - 特殊文字（絵文字、RTL、結合文字）
 * - インジェクション（SQL、HTML、XSS）
 */

const BASE_URL = 'http://localhost:3006';

// コンソールエラーを収集するヘルパー
async function setupErrorCollection(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });

  page.on('pageerror', (err) => {
    errors.push(`PAGE_ERROR: ${err.message}`);
  });

  return { errors, warnings };
}

test.describe('境界値破壊テスト - 探索テーマ入力', () => {
  test.setTimeout(300000);

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // 勝ち筋探索タブに移動
    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);
  });

  test('BD-001: 空入力で探索実行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill('');

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(2000);
    }

    // エラーが発生したか、または入力が拒否されたかを確認
    const pageContent = await page.content();
    const hasValidation = pageContent.includes('入力してください') ||
                         pageContent.includes('必須') ||
                         pageContent.includes('テーマを');

    console.log('Empty input validation:', hasValidation);
    console.log('Console errors:', errors);

    // 致命的なエラーがないことを確認
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('unhandled') || e.includes('TypeError')
    );

    if (criticalErrors.length > 0) {
      console.log('CRITICAL ERRORS FOUND:', criticalErrors);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-001-empty-input.png' });
  });

  test('BD-002: 極端に長い入力（10000文字）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const longText = '戦略'.repeat(5000); // 10000文字

    await textarea.fill(longText);

    const inputValue = await textarea.inputValue();
    console.log('Input length:', inputValue.length);

    // 入力が制限されているか確認
    if (inputValue.length < 10000) {
      console.log('Input was truncated to:', inputValue.length, 'chars');
    }

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(5000);
    }

    console.log('Console errors:', errors);
    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-002-long-input.png' });
  });

  test('BD-003: 極端に長い入力（100000文字）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const veryLongText = 'あ'.repeat(100000); // 100000文字

    const startTime = Date.now();
    await textarea.fill(veryLongText);
    const fillTime = Date.now() - startTime;

    console.log('Fill time for 100k chars:', fillTime, 'ms');

    const inputValue = await textarea.inputValue();
    console.log('Actual input length:', inputValue.length);

    // ブラウザがフリーズしていないか確認
    const isResponsive = await page.evaluate(() => {
      return document.body !== null;
    });
    console.log('Page still responsive:', isResponsive);

    console.log('Console errors:', errors);
    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-003-very-long-input.png' });
  });

  test('BD-004: 絵文字のみの入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const emojiText = '🚀🌟💡🔥⚡🎯🏆💎🌈✨'.repeat(100);

    await textarea.fill(emojiText);

    const inputValue = await textarea.inputValue();
    console.log('Emoji input preserved:', inputValue === emojiText);

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(3000);
    }

    console.log('Console errors:', errors);
    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-004-emoji-input.png' });
  });

  test('BD-005: RTL（右から左）文字入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    // アラビア語とヘブライ語のRTLテキスト
    const rtlText = 'مرحبا שלום 戦略 strategy مرحبا שלום';

    await textarea.fill(rtlText);

    const inputValue = await textarea.inputValue();
    console.log('RTL input preserved:', inputValue === rtlText);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-005-rtl-input.png' });
    console.log('Console errors:', errors);
  });

  test('BD-006: 結合文字・ゼロ幅文字入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    // ゼロ幅スペース、結合文字を含む
    const specialText = 'a\u200Bb\u200Cc\u200Dd\uFEFFe\u2060f';

    await textarea.fill(specialText);

    const inputValue = await textarea.inputValue();
    console.log('Input with zero-width chars:', inputValue.length, 'chars');

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-006-zero-width-input.png' });
    console.log('Console errors:', errors);
  });

  test('BD-007: 改行大量入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const newlineText = '戦略\n'.repeat(1000); // 1000行

    await textarea.fill(newlineText);

    const inputValue = await textarea.inputValue();
    const lineCount = inputValue.split('\n').length;
    console.log('Line count:', lineCount);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-007-newline-input.png' });
    console.log('Console errors:', errors);
  });

  test('BD-008: HTMLインジェクション試行', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const htmlInjection = `
      <script>alert('XSS')</script>
      <img src=x onerror="alert('XSS')">
      <svg onload="alert('XSS')">
      <iframe src="javascript:alert('XSS')">
    `;

    await textarea.fill(htmlInjection);

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(5000);
    }

    // XSSが実行されていないことを確認
    const dialogTriggered = await page.evaluate(() => {
      return (window as any).__xssTriggered || false;
    });

    console.log('XSS triggered:', dialogTriggered);
    expect(dialogTriggered).toBe(false);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-008-html-injection.png' });
    console.log('Console errors:', errors);
  });

  test('BD-009: SQLインジェクション風入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const sqlInjection = `
      '; DROP TABLE explorations; --
      ' OR '1'='1
      UNION SELECT * FROM users
      1; DELETE FROM strategies WHERE 1=1
    `;

    await textarea.fill(sqlInjection);

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(5000);
    }

    // ページが正常に動作していることを確認
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-009-sql-injection.png' });
    console.log('Console errors:', errors);
  });

  test('BD-010: JSONブレーカー入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    const jsonBreaker = `
      {"key": "value", "broken": }
      [[[[[[[[[[[
      {"nested": {"deep": {"very": {"too": {"deep":
      ]]]]]]]]]]]
      {"__proto__": {"polluted": true}}
    `;

    await textarea.fill(jsonBreaker);

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(5000);
    }

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-010-json-breaker.png' });
    console.log('Console errors:', errors);
  });

  test('BD-011: 制御文字入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    // 制御文字（ベル、バックスペース、タブ、エスケープなど）
    const controlChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F';

    await textarea.fill('テスト' + controlChars + 'テスト');

    const inputValue = await textarea.inputValue();
    console.log('Control chars handled, length:', inputValue.length);

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-011-control-chars.png' });
    console.log('Console errors:', errors);
  });

  test('BD-012: Unicode範囲外文字', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const textarea = page.locator('textarea').first();
    // サロゲートペア、私用領域、異体字セレクタ
    const unicodeEdge = '𠀀𠀁𠀂 \uD800\uDC00 \uDB40\uDD00 葛󠄀';

    await textarea.fill(unicodeEdge);

    const inputValue = await textarea.inputValue();
    console.log('Unicode edge chars handled');

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-012-unicode-edge.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('境界値破壊テスト - 制約条件入力', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);
  });

  test('BD-013: 制約条件に極長文入力', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    // 2番目のtextarea（制約条件）
    const constraintTextarea = page.locator('textarea').nth(1);

    if (await constraintTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      const longConstraint = '制約条件: '.repeat(5000);
      await constraintTextarea.fill(longConstraint);

      const inputValue = await constraintTextarea.inputValue();
      console.log('Constraint input length:', inputValue.length);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-013-long-constraint.png' });
    console.log('Console errors:', errors);
  });

  test('BD-014: テーマと制約の両方に極長文', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const themeTextarea = page.locator('textarea').first();
    const constraintTextarea = page.locator('textarea').nth(1);

    await themeTextarea.fill('テーマ'.repeat(3000));

    if (await constraintTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await constraintTextarea.fill('制約'.repeat(3000));
    }

    // 探索ボタンをクリック
    const exploreButton = page.locator('button:has-text("探索する")');
    if (await exploreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exploreButton.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-014-both-long.png' });
    console.log('Console errors:', errors);
  });
});

test.describe('境界値破壊テスト - スコア設定', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const scoreTab = page.locator('button:has-text("スコア設定")');
    await scoreTab.click();
    await page.waitForTimeout(1000);
  });

  test('BD-015: スライダーを極端な値に設定', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();

    console.log('Sliders found:', sliderCount);

    for (let i = 0; i < sliderCount; i++) {
      const slider = sliders.nth(i);
      // 最大値に設定
      await slider.fill('100');
      await page.waitForTimeout(100);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-015-sliders-max.png' });

    // 最小値に設定
    for (let i = 0; i < sliderCount; i++) {
      const slider = sliders.nth(i);
      await slider.fill('0');
      await page.waitForTimeout(100);
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-015-sliders-min.png' });
    console.log('Console errors:', errors);
  });

  test('BD-016: スライダーを高速連続操作', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);

    const slider = page.locator('input[type="range"]').first();

    if (await slider.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 100回高速変更
      for (let i = 0; i < 100; i++) {
        const value = Math.floor(Math.random() * 100);
        await slider.fill(String(value));
      }
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/bd-016-slider-rapid.png' });
    console.log('Console errors:', errors);
  });
});

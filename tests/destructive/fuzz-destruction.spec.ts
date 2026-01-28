import { test, expect, Page } from '@playwright/test';

/**
 * ファズテスト
 *
 * 目的: ランダム入力でアプリを壊す
 * - ランダム文字列生成
 * - ランダム操作シーケンス
 * - 境界値のランダム組み合わせ
 */

const BASE_URL = 'http://localhost:3006';

// ランダム文字列生成器
function generateRandomString(length: number, charset: string = 'all'): string {
  const charsets = {
    alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~',
    unicode: '日本語中文한국어العربيةהעברית🎉🚀💡🔥⚡✨',
    control: '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F',
    whitespace: ' \t\n\r\v\f',
    rtl: 'مرحباשלום',
    all: 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*日本語🎉🚀\n\t',
  };

  const chars = charsets[charset as keyof typeof charsets] || charsets.all;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ランダム入力ジェネレーター
function generateFuzzInput(): string {
  const strategies = [
    () => '', // 空
    () => generateRandomString(1), // 1文字
    () => generateRandomString(10), // 短い
    () => generateRandomString(100), // 中程度
    () => generateRandomString(1000), // 長い
    () => generateRandomString(10000), // 非常に長い
    () => generateRandomString(100, 'special'), // 特殊文字のみ
    () => generateRandomString(100, 'unicode'), // Unicode
    () => generateRandomString(50, 'control'), // 制御文字
    () => generateRandomString(100, 'rtl'), // RTL
    () => '\n'.repeat(100), // 改行のみ
    () => ' '.repeat(100), // スペースのみ
    () => '<script>alert(1)</script>', // XSS
    () => "'; DROP TABLE users; --", // SQL injection
    () => '{{constructor.constructor("return this")()}}', // Prototype pollution
    () => '../../../etc/passwd', // Path traversal
    () => 'null', // null文字列
    () => 'undefined', // undefined文字列
    () => 'NaN', // NaN文字列
    () => '-1', // 負数
    () => '999999999999999999999', // 巨大数
    () => '0.0000000000001', // 極小数
    () => JSON.stringify({ nested: { deep: { object: true } } }), // JSON
    () => '<![CDATA[test]]>', // CDATA
    () => '${process.env.SECRET}', // テンプレートリテラル
    () => '%00%0a%0d', // URL encoded special
  ];

  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

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

test.describe('ファズテスト - 探索入力', () => {
  test.setTimeout(3600000); // 60分

  test('FZ-001: ランダム入力500ケース', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);
    const results: { input: string; crashed: boolean; error: boolean }[] = [];

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();

    for (let i = 0; i < 500; i++) {
      const fuzzInput = generateFuzzInput();
      const errorsBefore = errors.length;

      try {
        await textarea.fill(fuzzInput);
        await page.waitForTimeout(100);

        const crashed = !(await page.locator('body').isVisible());
        const hasNewError = errors.length > errorsBefore;

        results.push({
          input: fuzzInput.substring(0, 50) + (fuzzInput.length > 50 ? '...' : ''),
          crashed,
          error: hasNewError,
        });

        if (crashed) {
          console.log(`⚠️ CRASH at iteration ${i + 1}: "${fuzzInput.substring(0, 30)}..."`);
          // ページを再読み込み
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
          await exploreTab.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        results.push({
          input: fuzzInput.substring(0, 50),
          crashed: true,
          error: true,
        });
        console.log(`⚠️ EXCEPTION at iteration ${i + 1}:`, e);

        // リカバリー
        await page.goto(BASE_URL).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        await exploreTab.click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      if ((i + 1) % 100 === 0) {
        const crashCount = results.filter(r => r.crashed).length;
        const errorCount = results.filter(r => r.error).length;
        console.log(`Iteration ${i + 1}: crashes=${crashCount}, errors=${errorCount}`);
      }
    }

    // 結果サマリー
    const crashCount = results.filter(r => r.crashed).length;
    const errorCount = results.filter(r => r.error).length;

    console.log('=== Fuzz Test Summary ===');
    console.log(`Total tests: ${results.length}`);
    console.log(`Crashes: ${crashCount}`);
    console.log(`Errors: ${errorCount}`);

    // クラッシュを引き起こした入力を報告
    const crashInputs = results.filter(r => r.crashed);
    if (crashInputs.length > 0) {
      console.log('\nCrash-inducing inputs:');
      crashInputs.forEach((c, i) => console.log(`  ${i + 1}. "${c.input}"`));
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/fz-001-fuzz-500.png' });
  });

  test('FZ-002: ランダム入力2000ケース（高速版）', async ({ page }) => {
    const { errors } = await setupErrorCollection(page);
    let crashCount = 0;
    let errorCount = 0;

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const exploreTab = page.locator('button:has-text("勝ち筋探索")');
    await exploreTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();

    for (let i = 0; i < 2000; i++) {
      const fuzzInput = generateFuzzInput();
      const errorsBefore = errors.length;

      try {
        await textarea.fill(fuzzInput);

        if (errors.length > errorsBefore) {
          errorCount++;
        }
      } catch (e) {
        crashCount++;
        // リカバリー
        await page.goto(BASE_URL).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        await exploreTab.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      if ((i + 1) % 500 === 0) {
        console.log(`Iteration ${i + 1}: crashes=${crashCount}, errors=${errorCount}`);
      }
    }

    console.log('=== Fuzz Test 2000 Summary ===');
    console.log(`Crashes: ${crashCount}`);
    console.log(`Errors: ${errorCount}`);

    await page.screenshot({ path: 'test-results/destructive-artifacts/fz-002-fuzz-2000.png' });
  });
});

test.describe('ファズテスト - ランダム操作', () => {
  test.setTimeout(2700000); // 45分

  test('FZ-003: ランダム操作シーケンス200回', async ({ page }) => {
    // 各操作のタイムアウトを短くする
    page.setDefaultTimeout(5000);

    const { errors } = await setupErrorCollection(page);
    const operations: string[] = [];
    let crashCount = 0;

    await page.goto(BASE_URL, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // 初期ロード待機

    for (let i = 0; i < 200; i++) {
      const operation = Math.floor(Math.random() * 10);

      try {
        switch (operation) {
          case 0: // タブクリック
            const tabs = ['はじめに', 'RAG情報', 'SWOT', '勝ち筋探索', 'ランキング', 'シン・勝ち筋', 'インサイト'];
            const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
            await page.locator(`button:has-text("${randomTab}")`).first().click().catch(() => {});
            operations.push(`tab:${randomTab}`);
            break;

          case 1: // テキスト入力
            const textarea = page.locator('textarea').first();
            if (await textarea.isVisible().catch(() => false)) {
              await textarea.fill(generateFuzzInput());
              operations.push('input:fuzz');
            }
            break;

          case 2: // ボタンクリック
            const buttons = await page.locator('button').all();
            if (buttons.length > 0) {
              const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
              await randomButton.click({ force: true }).catch(() => {});
              operations.push('button:random');
            }
            break;

          case 3: // スクロール
            await page.mouse.wheel(0, (Math.random() - 0.5) * 1000);
            operations.push('scroll');
            break;

          case 4: // キーボード入力
            const keys = ['Enter', 'Escape', 'Tab', 'Backspace', 'Delete'];
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            await page.keyboard.press(randomKey);
            operations.push(`key:${randomKey}`);
            break;

          case 5: // マウス移動
            const x = Math.floor(Math.random() * 1000);
            const y = Math.floor(Math.random() * 800);
            await page.mouse.move(x, y);
            operations.push(`mouse:${x},${y}`);
            break;

          case 6: // ダブルクリック
            const elementsForDblClick = await page.locator('button, a, div').all();
            if (elementsForDblClick.length > 0) {
              const randomElement = elementsForDblClick[Math.floor(Math.random() * elementsForDblClick.length)];
              await randomElement.dblclick({ force: true }).catch(() => {});
              operations.push('dblclick:random');
            }
            break;

          case 7: // リロード
            await page.reload().catch(() => {});
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            await page.waitForTimeout(500);
            operations.push('reload');
            break;

          case 8: // 戻る
            await page.goBack().catch(() => {});
            operations.push('back');
            break;

          case 9: // 進む
            await page.goForward().catch(() => {});
            operations.push('forward');
            break;
        }

        await page.waitForTimeout(50);

      } catch (e) {
        crashCount++;
        operations.push(`CRASH:${operation}`);

        // リカバリー
        await page.goto(BASE_URL).catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(500);
      }

      if ((i + 1) % 50 === 0) {
        console.log(`Random ops ${i + 1}: crashes=${crashCount}, errors=${errors.length}`);
      }
    }

    console.log('=== Random Operations Summary ===');
    console.log(`Crashes: ${crashCount}`);
    console.log(`Errors: ${errors.length}`);

    // クラッシュを引き起こした操作シーケンスを探す
    const crashIndices = operations.map((op, i) => op.startsWith('CRASH') ? i : -1).filter(i => i >= 0);
    if (crashIndices.length > 0) {
      console.log('\nCrash-inducing sequences:');
      crashIndices.forEach(idx => {
        const sequence = operations.slice(Math.max(0, idx - 5), idx + 1);
        console.log(`  At ${idx}: ${sequence.join(' -> ')}`);
      });
    }

    await page.screenshot({ path: 'test-results/destructive-artifacts/fz-003-random-ops-200.png' });
  });
});

test.describe('ファズテスト - API', () => {
  test.setTimeout(600000);

  test('FZ-004: APIにランダムペイロード100回', async ({ request }) => {
    const endpoints = [
      { path: '/api/explore', method: 'POST' },
      { path: '/api/swot-analyze', method: 'POST' },
      { path: '/api/rag', method: 'POST' },
    ];

    const results: { endpoint: string; payload: string; status: number }[] = [];

    for (let i = 0; i < 100; i++) {
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];

      // ランダムペイロード生成
      const payloads = [
        {},
        { theme: generateFuzzInput() },
        { content: generateFuzzInput() },
        { data: generateRandomString(10000) },
        null,
        [],
        'invalid json string',
        { nested: { deep: { very: { deep: generateFuzzInput() } } } },
        { __proto__: { polluted: true } },
        { constructor: { prototype: { polluted: true } } },
      ];

      const payload = payloads[Math.floor(Math.random() * payloads.length)];

      try {
        const response = await request.post(`${BASE_URL}${ep.path}`, {
          data: payload,
          headers: { 'Content-Type': 'application/json' },
        });

        results.push({
          endpoint: ep.path,
          payload: JSON.stringify(payload).substring(0, 50),
          status: response.status(),
        });
      } catch (e) {
        results.push({
          endpoint: ep.path,
          payload: JSON.stringify(payload).substring(0, 50),
          status: -1,
        });
      }

      if ((i + 1) % 25 === 0) {
        const errorCount = results.filter(r => r.status >= 500 || r.status === -1).length;
        console.log(`API fuzz ${i + 1}: serverErrors=${errorCount}`);
      }
    }

    // 結果分析
    const statusCounts: Record<number, number> = {};
    results.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    console.log('=== API Fuzz Summary ===');
    console.log('Status distribution:', statusCounts);

    // 500エラーを引き起こしたペイロードを報告
    const serverErrors = results.filter(r => r.status >= 500);
    if (serverErrors.length > 0) {
      console.log('\n500 error payloads:');
      serverErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.endpoint}: ${e.payload}`));
    }
  });
});

test.describe('ファズテスト - 並列実行', () => {
  test.setTimeout(600000);

  test('FZ-005: 10並列でランダム操作', async ({ browser }) => {
    const contexts = await Promise.all(
      Array(10).fill(0).map(() =>
        browser.newContext({ storageState: '.auth/azure-user.json' })
      )
    );

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    const results: { pageIndex: number; crashes: number; errors: number }[] = [];

    await Promise.all(
      pages.map(async (page, index) => {
        let crashes = 0;
        let errors = 0;

        page.on('console', (msg) => {
          if (msg.type() === 'error') errors++;
        });

        await page.goto(BASE_URL).catch(() => { crashes++; });
        await page.waitForLoadState('networkidle').catch(() => {});

        for (let i = 0; i < 50; i++) {
          try {
            const operation = Math.floor(Math.random() * 5);

            switch (operation) {
              case 0:
                const tabs = ['SWOT', 'RAG情報', '勝ち筋探索'];
                const tab = tabs[Math.floor(Math.random() * tabs.length)];
                await page.locator(`button:has-text("${tab}")`).first().click().catch(() => {});
                break;
              case 1:
                await page.mouse.wheel(0, (Math.random() - 0.5) * 500);
                break;
              case 2:
                const textarea = page.locator('textarea').first();
                if (await textarea.isVisible().catch(() => false)) {
                  await textarea.fill(generateFuzzInput());
                }
                break;
              case 3:
                await page.reload().catch(() => { crashes++; });
                break;
              case 4:
                const buttons = await page.locator('button').all();
                if (buttons.length > 0) {
                  await buttons[Math.floor(Math.random() * buttons.length)].click({ force: true }).catch(() => {});
                }
                break;
            }

            await page.waitForTimeout(200);
          } catch (e) {
            crashes++;
          }
        }

        results.push({ pageIndex: index, crashes, errors });
      })
    );

    console.log('=== Parallel Fuzz Summary ===');
    results.forEach(r => {
      console.log(`  Page ${r.pageIndex}: crashes=${r.crashes}, errors=${r.errors}`);
    });

    const totalCrashes = results.reduce((a, b) => a + b.crashes, 0);
    const totalErrors = results.reduce((a, b) => a + b.errors, 0);
    console.log(`Total: crashes=${totalCrashes}, errors=${totalErrors}`);

    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

import { test, expect } from './fixtures';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = '/Users/ashishpatel/pateash/hckr-tools.github.io/static/img/screenshots';

test.describe('Generate Tool Screenshots', () => {
  test('Capture screenshots of all sidepanel tools', async ({ sidepanelPage }) => {
    test.setTimeout(180000);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    // Full desktop style viewport width & height
    await sidepanelPage.setViewportSize({ width: 1200, height: 750 });

    const capture = async (name: string) => {
      await sidepanelPage.waitForTimeout(500);
      await sidepanelPage.screenshot({
        path: path.join(OUTPUT_DIR, `${name}.png`),
        fullPage: false,
      });
      console.log(`Saved screenshot: ${name}.png`);
    };

    // 1. Workspace
    await sidepanelPage.locator('.tab-item', { hasText: 'Workspace' }).click();
    await expect(sidepanelPage.locator('.workspace-tool')).toBeVisible();

    const newCardBtn = sidepanelPage.locator('button', { hasText: '+ New card' });
    if (await newCardBtn.isVisible()) {
      await newCardBtn.click();
      await sidepanelPage.waitForTimeout(300);
      await sidepanelPage.locator('input.drawer-title-input').fill('Implement JWT expiration refresh flow');
      const p1Btn = sidepanelPage.locator('button.drawer-priority-btn', { hasText: 'P1' });
      if (await p1Btn.isVisible()) await p1Btn.click();
      const featBtn = sidepanelPage.locator('button.drawer-label-pill', { hasText: 'Feature' });
      if (await featBtn.isVisible()) await featBtn.click();
      await sidepanelPage.locator('button.btn-primary', { hasText: 'Create card' }).click();
      await sidepanelPage.waitForTimeout(400);

      await newCardBtn.click();
      await sidepanelPage.waitForTimeout(300);
      await sidepanelPage.locator('input.drawer-title-input').fill('Review offline storage quota & encryption');
      const p0Btn = sidepanelPage.locator('button.drawer-priority-btn', { hasText: 'P0' });
      if (await p0Btn.isVisible()) await p0Btn.click();
      const debtBtn = sidepanelPage.locator('button.drawer-label-pill', { hasText: 'Tech Debt' });
      if (await debtBtn.isVisible()) await debtBtn.click();
      await sidepanelPage.locator('button.btn-primary', { hasText: 'Create card' }).click();
      await sidepanelPage.waitForTimeout(400);
    }
    await capture('workspace');

    // 2. JSON Formatter
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON' }).click();
    await expect(sidepanelPage.locator('.json-formatter')).toBeVisible();
    const sampleJsonBtn = sidepanelPage.locator('.json-formatter button', { hasText: 'Sample' });
    if (await sampleJsonBtn.isVisible()) {
      await sampleJsonBtn.click();
      await sidepanelPage.waitForTimeout(300);
    }
    await capture('json-formatter');

    // 3. YAML ↔ JSON
    await sidepanelPage.locator('.tab-item', { hasText: 'YAML' }).click();
    await expect(sidepanelPage.locator('.yaml-json-converter')).toBeVisible();
    const yamlSampleBtn = sidepanelPage.locator('.yaml-json-converter button', { hasText: 'Sample' });
    if (await yamlSampleBtn.isVisible()) {
      await yamlSampleBtn.click();
      await sidepanelPage.waitForTimeout(300);
    }
    await capture('yaml-json');

    // 4. Base64 Tool
    await sidepanelPage.locator('.tab-item', { hasText: 'Base64' }).click();
    await expect(sidepanelPage.locator('.base64-tool')).toBeVisible();
    const b64Textarea = sidepanelPage.locator('textarea.base64-textarea').first();
    if (await b64Textarea.isVisible()) {
      await b64Textarea.fill('Authorization: Bearer secret_api_token_offline_2026');
      const encodeBtn = sidepanelPage.locator('button', { hasText: 'ENCODE' });
      if (await encodeBtn.isVisible()) await encodeBtn.click();
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('base64');

    // 5. URL Encoder
    await sidepanelPage.locator('.tab-item', { hasText: 'URL' }).click();
    await expect(sidepanelPage.locator('.url-encoder')).toBeVisible();
    const oauthBtn = sidepanelPage.locator('button', { hasText: 'OAuth URL' });
    if (await oauthBtn.isVisible()) {
      await oauthBtn.click();
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('url-encoder');

    // 6. JWT Decoder
    await sidepanelPage.locator('.tab-item', { hasText: 'JWT' }).click();
    await expect(sidepanelPage.locator('.jwt-decoder')).toBeVisible();
    const sampleValidBtn = sidepanelPage.locator('button', { hasText: 'Valid Token' });
    if (await sampleValidBtn.isVisible()) {
      await sampleValidBtn.click();
      await sidepanelPage.waitForTimeout(300);
    }
    await capture('jwt-decoder');

    // 7. Hash Generator
    await sidepanelPage.locator('.tab-item', { hasText: 'Hash' }).click();
    await expect(sidepanelPage.locator('.hash-generator')).toBeVisible();
    const hashInput = sidepanelPage.locator('textarea.hash-input-textarea');
    if (await hashInput.isVisible()) {
      await hashInput.fill('SecureDeveloperHashPayload2026');
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('hash-generator');

    // 8. UUID Generator
    await sidepanelPage.locator('.tab-item', { hasText: 'UUID' }).click();
    await expect(sidepanelPage.locator('.uuid-container')).toBeVisible();
    const batchBtn = sidepanelPage.locator('.uuid-batch-buttons button').first();
    if (await batchBtn.isVisible()) {
      await batchBtn.click();
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('uuid-generator');

    // 9. Timestamp Converter
    await sidepanelPage.locator('.tab-item', { hasText: 'Time' }).click();
    await expect(sidepanelPage.locator('.timestamp-container')).toBeVisible();
    await capture('timestamp-converter');

    // 10. Cron Explainer
    await sidepanelPage.locator('.tab-item', { hasText: 'Cron' }).click();
    await expect(sidepanelPage.locator('.cron-explainer')).toBeVisible();
    const cronInput = sidepanelPage.locator('input.cron-expression-input');
    if (await cronInput.isVisible()) {
      await cronInput.fill('*/15 0-23 * * 1-5');
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('cron-explainer');

    // 11. Dummy Data
    await sidepanelPage.locator('.tab-item', { hasText: 'Data' }).click();
    await expect(sidepanelPage.locator('.dummy-data-tool')).toBeVisible();
    const genBtn = sidepanelPage.locator('.data-generate-actions button', { hasText: 'Generate' });
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await sidepanelPage.waitForTimeout(400);
    }
    await capture('dummy-data');

    // 12. Regex Tester
    await sidepanelPage.locator('.tab-item', { hasText: 'Regex' }).click();
    await expect(sidepanelPage.locator('.regex-tester')).toBeVisible();
    const patternInput = sidepanelPage.locator('input.regex-pattern-input');
    if (await patternInput.isVisible()) {
      await patternInput.fill('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
    }
    const testArea = sidepanelPage.locator('textarea.regex-textarea');
    if (await testArea.isVisible()) {
      await testArea.fill('Contact us at team@hckr.tools or security@company.org for assistance.');
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('regex-tester');

    // 13. Diff Checker
    await sidepanelPage.locator('.tab-item', { hasText: 'Diff' }).click();
    await expect(sidepanelPage.locator('.diff-checker-tool')).toBeVisible();
    const textareas = sidepanelPage.locator('textarea.diff-textarea');
    if (await textareas.count() >= 2) {
      await textareas.nth(0).fill('const config = {\n  timeout: 5000,\n  retries: 3,\n  cache: false\n};');
      await textareas.nth(1).fill('const config = {\n  timeout: 3000,\n  retries: 5,\n  cache: true,\n  offline: true\n};');
      const compareBtn = sidepanelPage.locator('button', { hasText: 'Compare Diff' });
      if (await compareBtn.isVisible()) await compareBtn.click();
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('diff-checker');

    // 14. Markdown Preview
    await sidepanelPage.locator('.tab-item', { hasText: 'MD' }).click();
    await expect(sidepanelPage.locator('.md-tool-root')).toBeVisible();
    const mdTextarea = sidepanelPage.locator('textarea.md-textarea');
    if (await mdTextarea.isVisible()) {
      await mdTextarea.fill(
        '# 🚀 hckr-tools Feature Release\n\n- [x] Offline-first architecture\n- [x] Native Chrome sidepanel\n- [x] Zero network telemetry\n\n```typescript\nimport { formatJSON } from "hckr-tools";\nconst clean = formatJSON(rawInput);\n```\n\n> Fast, private, seamless.'
      );
      await sidepanelPage.waitForTimeout(200);
    }
    await capture('markdown-preview');

    // 15. Tabs Navigator
    await sidepanelPage.locator('.tab-item', { hasText: 'Tabs' }).click();
    await expect(sidepanelPage.locator('.tabs-navigator')).toBeVisible();
    await capture('tabs');
  });
});

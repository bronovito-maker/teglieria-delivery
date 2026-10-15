import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const deleted: string[] = [];
  const context = {
    URL, Response, Promise,
    self: { location: { origin: 'https://example.test' }, addEventListener: (name: string, fn: (event: any) => void) => { listeners[name] = fn; }, skipWaiting() {}, clients: { claim() {} } },
    caches: { keys: async () => ['teglieria-pwa-v2', 'teglieria-pwa-v3', 'other-app-cache'], delete: async (key: string) => { deleted.push(key); return true; }, match: async () => undefined },
    fetch: async () => new Response('', { status: 503 }),
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
  return { listeners, deleted };
}
describe('PWA private data isolation', () => {
  it('does not intercept API or private responses disguised as static filenames', () => {
    const { listeners } = worker();
    for (const path of ['/api/profile.json', '/media/customer.png', '/admin/export.csv', '/account/orders/data.json', '/rider/private.json', '/stato-ordine/private.json']) {
      let intercepted = false;
      listeners.fetch({ request: { method: 'GET', url: `https://example.test${path}`, mode: 'cors' }, respondWith: () => { intercepted = true; } });
      expect(intercepted, path).toBe(false);
    }
  });
  it('preserves unrelated application caches during upgrade', async () => {
    const { listeners, deleted } = worker();
    let completion: Promise<unknown> | undefined;
    listeners.activate({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;
    expect(deleted).toEqual(['teglieria-pwa-v2', 'teglieria-pwa-v3']);
  });
});

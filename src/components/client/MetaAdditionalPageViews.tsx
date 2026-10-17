'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sendSafeMetaPageView } from '@/lib/meta-page-view';

// Complements the SDK on public pages. On forms and personal/order pages this
// is only an image beacon: no third-party JavaScript can inspect the document.
export default function MetaAdditionalPageViews() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    // Router updates can precede history replacement during login redirects.
    // Never record the old document under a not-yet-committed route render.
    if (pathname !== location.pathname) return;
    if (last.current === pathname) return;
    last.current = pathname;
    let pixel: HTMLImageElement | null = null;
    try { pixel = sendSafeMetaPageView(); } catch { /* Never affect account/order use. */ }
    // Keep the element alive until the response; no retries or persistent queue.
    if (pixel) {
      const done = () => pixel?.remove();
      pixel.onload = done;
      pixel.onerror = done;
    }
  }, [pathname]);
  return null;
}

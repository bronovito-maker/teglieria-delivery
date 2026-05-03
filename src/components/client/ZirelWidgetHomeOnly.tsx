"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ZIREL_SCRIPT_SRC = "https://cdn.zirel.org/widget.js";
const ZIREL_TENANT_ID = "zrl_la_teglieria";

function cleanupZirelArtifacts() {
  const selectors = [
    "script[src*='cdn.zirel.org/widget.js']",
    "iframe[src*='zirel.org']",
    "[id*='zirel']",
    "[class*='zirel']",
    "#n8n-widget-mock",
    "#chat-tooltip",
    "#quick-replies-container",
    "#chat-messages",
    ".quick-reply-btn",
    ".chat-tooltip",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });
}

function ensureZirelScript() {
  const existing = document.querySelector(`script[src='${ZIREL_SCRIPT_SRC}']`);
  if (existing) return;

  const script = document.createElement("script");
  script.src = ZIREL_SCRIPT_SRC;
  script.async = true;
  script.setAttribute("data-tenant-id", ZIREL_TENANT_ID);
  document.body.appendChild(script);
}

export default function ZirelWidgetHomeOnly() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") {
      ensureZirelScript();
      return;
    }

    cleanupZirelArtifacts();

    // Pulizia difensiva: alcuni nodi vengono iniettati in ritardo da script async.
    const delayedCleanup = window.setTimeout(cleanupZirelArtifacts, 800);
    const intervalCleanup = window.setInterval(cleanupZirelArtifacts, 1200);

    return () => {
      window.clearTimeout(delayedCleanup);
      window.clearInterval(intervalCleanup);
    };
  }, [pathname]);

  return null;
}

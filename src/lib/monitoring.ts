type MonitoringContext = Record<string, unknown>;

export function captureError(error: unknown, context: MonitoringContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[MONITORING][ERROR]", {
    message,
    stack,
    ...context,
  });
}

export function captureInfo(event: string, context: MonitoringContext = {}) {
  console.info("[MONITORING][INFO]", {
    event,
    ...context,
  });
}

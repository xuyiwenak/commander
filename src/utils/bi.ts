let config = { appName: 'commander', apiBase: '/api/bi' };

export function biInit(opts: Partial<typeof config>) {
  config = { ...config, ...opts };
}

export function biTrackPageView(page: string) {
  _send({ eventSubType: 'page_view', page, durationMs: undefined });
}

export function biTrackAction(action: string, meta?: Record<string, unknown>) {
  _send({ eventSubType: 'user_action', action, ...meta });
}

export function biTrackError(error: Error) {
  _send({
    eventSubType: 'client_error',
    errorMessage: error.message,
    errorStack: (error.stack ?? '').slice(0, 500),
  });
}

function _send(data: Record<string, unknown>) {
  const body = JSON.stringify({ ...data, status: data.eventSubType === 'client_error' ? 'failed' : 'success' });
  const url = `${config.apiBase}/client-event`;

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {});
  }
}

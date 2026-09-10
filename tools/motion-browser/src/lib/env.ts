const DEFAULT_PRESENTER_URL =
  "https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js";

export interface AppEnvironment {
  apiBaseUrl: string;
  presenterUrl: string;
  connectPublishableKey: string;
}

export function getAppEnvironment(): AppEnvironment {
  const apiBaseUrl = import.meta.env.VITE_PERXONA_API_BASE_URL as
    | string
    | undefined;
  if (!apiBaseUrl) {
    throw new Error("Missing required env var: VITE_PERXONA_API_BASE_URL");
  }

  const connectPublishableKey = import.meta.env
    .VITE_PERXONA_CONNECT_PUBLISHABLE_KEY as string | undefined;
  if (!connectPublishableKey) {
    throw new Error(
      "Missing required env var: VITE_PERXONA_CONNECT_PUBLISHABLE_KEY",
    );
  }

  return {
    apiBaseUrl,
    presenterUrl:
      (import.meta.env.VITE_PRESENTER_URL as string | undefined) ||
      DEFAULT_PRESENTER_URL,
    connectPublishableKey,
  };
}

export function getApiBaseUrl(): string {
  return getAppEnvironment().apiBaseUrl;
}

export function getPresenterUrl(): string {
  return getAppEnvironment().presenterUrl;
}

export function getConnectPublishableKey(): string {
  return getAppEnvironment().connectPublishableKey;
}

/**
 * Connect Kit API client — calls the Perxona API directly.
 *
 * Auth model: every call carries the build-time Connect publishable key
 * (`lib/env.ts`) as an `X-Connect-Key` header — there is no session to
 * expire or log out of.
 */

import {
  getApiBaseUrl,
  getConnectPublishableKey,
  getPresenterUrl,
} from "./env";

export interface CatalogItem {
  id: string;
  name: string;
  thumbnail_urls?: Record<string, string>;
}

export interface AppConfig {
  mock: boolean;
  chat: boolean;
  presenterUrl: string;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

/** True for a 401/403 — the key itself is invalid or not permitted, not a transient failure. */
export function isAuthError(error: ApiError | null | undefined): boolean {
  return error?.status === 401 || error?.status === 403;
}

async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    auth = true,
  }: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    headers["X-Connect-Key"] = getConnectPublishableKey();
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    const detail = (data as { detail?: unknown }).detail;
    const message =
      (Array.isArray(detail)
        ? (detail[0] as { msg?: string })?.msg
        : (detail as string)) ??
      (data as { error?: string }).error ??
      res.statusText;
    throw Object.assign(new Error(message), {
      status: res.status,
      data,
    }) as ApiError;
  }
  return res.json() as Promise<T>;
}

/** Static config — no upstream call needed. */
export const getConfig = (): Promise<AppConfig> =>
  Promise.resolve({
    mock: false,
    chat: false,
    presenterUrl: getPresenterUrl(),
  });

export const getAvatars = async () => {
  const data = await request<{
    items: Array<{
      avatar_id: string;
      name: string;
      thumbnail_urls?: Record<string, string>;
    }>;
  }>("/api/v1/connect/assets/avatars");
  return {
    items: data.items.map(
      ({ avatar_id, ...rest }) => ({ id: avatar_id, ...rest }) as CatalogItem,
    ),
  };
};

export const getScenes = async () => {
  const data = await request<{
    items: Array<{
      scene_id: string;
      name: string;
      thumbnail_urls?: Record<string, string>;
    }>;
  }>("/api/v1/connect/assets/scenes");
  return {
    items: data.items.map(
      ({ scene_id, ...rest }) => ({ id: scene_id, ...rest }) as CatalogItem,
    ),
  };
};

export const getVoices = () =>
  request<{ items: CatalogItem[] }>("/api/v1/connect/voices");

export interface MotionApiItem {
  id: string;
  name: string;
  thumbnail: string | undefined;
  tags: string[];
}

export const getMotions = async (avatarId: string) => {
  const data = await request<{
    items: Array<{
      motion_id: string;
      name: string;
      tags: string[];
      thumbnail?: string;
    }>;
  }>(`/api/v1/connect/assets/avatars/${encodeURIComponent(avatarId)}/motions`);
  return {
    items: data.items.map(
      ({ motion_id, name, tags, thumbnail }): MotionApiItem => ({
        id: motion_id,
        name,
        tags,
        thumbnail,
      }),
    ),
  };
};

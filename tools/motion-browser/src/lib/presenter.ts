/**
 * Presenter engine bootstrap + typed handle for the `<sv-presenter>` web
 * component. The engine URL is resolved from the server (`/api/config`), so the
 * same build can target any CDN. The full `IPresentationWidget` contract comes
 * from the `@perxona/presenter-types` npm package (see its `AGENTS.md`).
 */

import type { IPresentationWidget } from "@perxona/presenter-types";

import { getConfig } from "./api";

export type {
  PresentationResult,
  PresentationTarget,
} from "@perxona/presenter-types";

export type Presenter = HTMLElement & IPresentationWidget;

let enginePromise: Promise<void> | null = null;

/**
 * Load the presenter engine `<script type="module">` once. Resolves after the
 * module has loaded and `<sv-presenter>` is registered as a custom element.
 */
export function loadPresenterEngine(): Promise<void> {
  if (!enginePromise) {
    enginePromise = getConfig().then(
      ({ presenterUrl }) =>
        new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.type = "module";
          script.src = presenterUrl;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(
              new Error(`Failed to load presenter engine from ${presenterUrl}`),
            );
          document.head.append(script);
        }),
    );
  }
  return enginePromise;
}

import { useEffect } from "react";

import { toast } from "@/lib/toast";

interface AppErrorToasts {
  catalogError: Error | null;
  loadError: Error | null;
  launchError: Error | null;
  speakError: Error | null;
  motionsError: Error | null;
}

export function useAppErrorToasts({
  catalogError,
  loadError,
  launchError,
  speakError,
  motionsError,
}: AppErrorToasts): void {
  useEffect(() => {
    if (!catalogError) return;
    console.error("[Catalog] failed to load", catalogError);
    toast.error("Failed to load catalog.");
  }, [catalogError]);

  useEffect(() => {
    if (!loadError) return;
    console.error("[Presenter] failed to load", loadError);
    toast.error("Presenter failed to load.");
  }, [loadError]);

  useEffect(() => {
    if (!launchError) return;
    console.error("[Presenter] initialization failed", launchError);
    toast.error("Presenter initialization failed.");
  }, [launchError]);

  useEffect(() => {
    if (!speakError) return;
    console.error("[Presenter] speech playback failed", speakError);
    toast.error(
      "Speech playback failed. The selected voice may be unsupported.",
    );
  }, [speakError]);

  useEffect(() => {
    if (!motionsError) return;
    console.error("[Motions] failed to load", motionsError);
    toast.error("Failed to load motions.");
  }, [motionsError]);
}

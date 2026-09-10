import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CatalogItem } from "@/lib/api";

export interface SceneSelectProps {
  scenes: CatalogItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}

export function SceneSelect({
  scenes,
  value,
  onValueChange,
  className,
}: SceneSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedScene = scenes.find((s) => s.id === value);
  const thumbSrc = selectedScene?.thumbnail_urls?.["default"] ?? "";

  const selectScene = (id: string) => {
    onValueChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select scene"
          className={cn(
            "relative h-[52px] w-[70px] shrink-0 overflow-hidden rounded-lg",
            "ring-inset transition-[box-shadow]",
            "outline-none focus-visible:ring-2 focus-visible:ring-primary",
            value
              ? "ring-2 ring-primary-light"
              : "ring-1 ring-[rgba(255,255,255,0.4)]",
            "bg-grey-200",
            className,
          )}
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={selectedScene?.name ?? "Scene"}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-grey-500">
              <ChevronDown className="size-5" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[360px] p-3"
      >
        <div className="grid grid-cols-4 gap-2 max-h-[360px] overflow-y-auto">
          {scenes.map((scene) => {
            const src = scene.thumbnail_urls?.["default"] ?? "";
            const isSelected = scene.id === value;
            return (
              <button
                key={scene.id}
                type="button"
                aria-label={scene.name}
                onClick={() => selectScene(scene.id)}
                className={cn(
                  "relative aspect-video overflow-hidden rounded-lg",
                  "ring-inset transition-[box-shadow,transform]",
                  "outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "hover:scale-[1.03]",
                  isSelected
                    ? "ring-2 ring-primary-light"
                    : "ring-1 ring-border hover:ring-grey-500",
                )}
              >
                {src ? (
                  <img
                    src={src}
                    alt={scene.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-grey-200 text-[10px] text-grey-500">
                    {scene.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

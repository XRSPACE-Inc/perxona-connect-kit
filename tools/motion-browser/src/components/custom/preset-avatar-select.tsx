import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PresetAvatar {
  id: string;
  name: string;
  src: string;
}

export interface PresetAvatarSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  avatars: PresetAvatar[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
}

/**
 * Preset avatar picker.
 * Horizontally scrollable list of avatar thumbnails with prev/next controls.
 * Single selection, rendered as an accessible radio group.
 */
export function PresetAvatarSelect({
  avatars,
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: PresetAvatarSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    defaultValue,
  );
  const selected = isControlled ? value : internalValue;

  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const selectAvatar = React.useCallback(
    (id: string) => {
      if (!isControlled) setInternalValue(id);
      onValueChange?.(id);
    },
    [isControlled, onValueChange],
  );

  const scrollBy = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const focusAndSelectAvatarByIndex = (index: number) => {
    const target = avatars[index];
    if (!target) return;
    itemRefs.current.get(target.id)?.focus();
    selectAvatar(target.id);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusAndSelectAvatarByIndex(Math.min(index + 1, avatars.length - 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusAndSelectAvatarByIndex(Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAndSelectAvatarByIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAndSelectAvatarByIndex(avatars.length - 1);
    }
  };

  return (
    <div className={cn("relative w-full", className)} {...props}>
      <div
        ref={listRef}
        role="radiogroup"
        aria-label="Preset avatars"
        className="flex min-w-0 gap-1 overflow-x-auto scroll-smooth px-1 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent_0px,black_30px,black_calc(100%-30px),transparent_100%)]"
      >
        {avatars.map((avatar, index) => {
          const isSelected = avatar.id === selected;
          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={avatar.name}
              tabIndex={isSelected || (!selected && index === 0) ? 0 : -1}
              ref={(node) => {
                if (node) itemRefs.current.set(avatar.id, node);
                else itemRefs.current.delete(avatar.id);
              }}
              onClick={() => selectAvatar(avatar.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg bg-grey-200",
                "outline-none ring-inset transition-[box-shadow,transform]",
                "focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "ring-2 ring-primary-light"
                  : "ring-1 ring-border hover:ring-grey-500",
              )}
            >
              <img
                src={avatar.src}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {/* Overlay nav arrows */}
      <NavButton
        aria-label="Previous avatars"
        onClick={() => scrollBy(-1)}
        className="left-0 top-1/2 -translate-y-1/2"
      >
        <ChevronLeft className="size-4" />
      </NavButton>
      <NavButton
        aria-label="Next avatars"
        onClick={() => scrollBy(1)}
        className="right-0 top-1/2 -translate-y-1/2"
      >
        <ChevronRight className="size-4" />
      </NavButton>
    </div>
  );
}

function NavButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "absolute flex size-6 shrink-0 items-center justify-center rounded-full",
        "bg-[rgba(0,0,0,0.24)] text-white backdrop-blur-sm",
        "transition-colors hover:bg-[rgba(0,0,0,0.4)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

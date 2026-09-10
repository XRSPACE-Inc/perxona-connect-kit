import * as React from "react";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Lock, PersonStanding, Search, Plus, Copy } from "lucide-react";

export interface MotionItem {
  id: string;
  name: string;
  category: string;
  /** Real Connect motions have no thumbnail image; falls back to a placeholder icon when omitted. */
  thumbnail?: string;
  locked?: boolean;
}

export interface MotionLibraryProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: MotionItem[];
  categories?: string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Called when a motion block is clicked (e.g. to preview/play the motion). */
  onMotionClick?: (id: string) => void;
  /** Disable all motion interactions (e.g. while script is playing). */
  disabled?: boolean;
}

const ALL = "All";

export function MotionLibrary({
  items,
  categories,
  value,
  defaultValue,
  onValueChange,
  onMotionClick,
  disabled,
  className,
  ...props
}: MotionLibraryProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    defaultValue,
  );
  const selected = isControlled ? value : internalValue;

  const [activeFilter, setActiveFilter] = React.useState<string>(ALL);
  const [query, setQuery] = React.useState("");

  const chips = React.useMemo(() => {
    if (categories?.length) return [ALL, ...categories];
    const unique = Array.from(new Set(items.map((i) => i.category)));
    return [ALL, ...unique];
  }, [categories, items]);

  const selectMotion = (id: string) => {
    if (!isControlled) setInternalValue(id);
    onValueChange?.(id);
  };

  const deferredQuery = React.useDeferredValue(query);

  const visibleMotions = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        activeFilter === ALL || item.category === activeFilter;
      const matchesQuery = !q || item.name.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [items, activeFilter, deferredQuery]);

  return (
    <section className={cn("flex w-full flex-col gap-4", className)} {...props}>
      <h2 className="text-h6 text-neutral-900">Motion library</h2>

      {/* Search */}
      <div className="flex h-11 items-center gap-2 rounded-full border border-white px-3.5">
        <Search className="size-5 shrink-0 text-grey-700 border-white placeholder:text-grey-700" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className={cn(
            "w-full bg-transparent text-[15px] leading-[22px] text-foreground outline-none",
          )}
        />
      </div>

      {/* Filter chips */}
      <div className="flex max-h-[88px] flex-wrap gap-2 overflow-y-auto pr-1">
        {chips.map((chip) => {
          const isActive = chip === activeFilter;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(chip)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] leading-none transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-primary font-bold text-primary-foreground"
                  : "bg-grey-200 font-normal text-neutral-700 hover:bg-grey-300",
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Action grid */}
      <div
        role="radiogroup"
        aria-label="Motion library"
        className="flex max-h-[420px] flex-wrap content-start gap-2 overflow-y-auto pr-1"
      >
        {visibleMotions.map((item) => (
          <MotionBlock
            key={item.id}
            item={item}
            selected={item.id === selected}
            onPlusClick={() => selectMotion(item.id)}
            onClick={() => onMotionClick?.(item.id)}
            disabled={disabled}
          />
        ))}
        {visibleMotions.length === 0 && (
          <p className="w-full py-8 text-center text-body2 text-muted-foreground">
            No motions found.
          </p>
        )}
      </div>
    </section>
  );
}

interface MotionBlockProps {
  item: MotionItem;
  selected: boolean;
  onPlusClick: () => void;
  onClick: () => void;
  disabled?: boolean;
}

function MotionBlock({
  item,
  selected,
  onPlusClick,
  onClick,
  disabled,
}: MotionBlockProps) {
  const [showAddHint, setShowAddHint] = React.useState(false);
  const [tooltip, setTooltip] = React.useState<{
    left: number;
    top: number;
  } | null>(null);
  const nameRef = React.useRef<HTMLSpanElement>(null);

  const handleNameEnter = () => {
    const el = nameRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      const rect = el.getBoundingClientRect();
      setTooltip({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 4,
      });
    }
  };

  const onCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(item.id).catch((error: unknown) => {
      console.error("[MotionLibrary] failed to copy motion ID", error);
      toast.error("Failed to copy motion ID.");
    });
  };

  return (
    <div className="flex h-28 w-[72px] flex-col items-center gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={item.name}
        disabled={disabled}
        onMouseEnter={() => !disabled && setShowAddHint(true)}
        onMouseLeave={() => setShowAddHint(false)}
        onClick={onClick}
        className={cn(
          "relative size-[72px] rounded-lg bg-grey-200",
          "outline-none ring-inset transition-[box-shadow]",
          "focus-visible:ring-2 focus-visible:ring-primary",
          disabled && "pointer-events-none opacity-50",
          selected
            ? "ring-2 ring-primary-light"
            : "ring-1 ring-border hover:ring-grey-500",
        )}
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="size-full rounded-lg object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center rounded-lg bg-grey-200 text-grey-400">
            <PersonStanding className="size-8" />
          </span>
        )}
        {item.locked && (
          <span
            className={cn(
              "absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2",
              "items-center justify-center rounded-full bg-[var(--color-grey-alpha-12)] backdrop-blur-sm",
            )}
          >
            <Lock className="size-4 text-grey-600" />
          </span>
        )}
        {showAddHint && !item.locked && (
          <span
            onClick={onCopyClick}
            className={cn(
              "absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full",
              "bg-[rgba(22,28,36,0.48)] text-white transition-opacity",
            )}
          >
            <Copy className="size-3" />
          </span>
        )}
        {showAddHint && !item.locked && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick();
            }}
            className={cn(
              "absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full",
              "bg-[rgba(22,28,36,0.48)] text-white transition-opacity",
            )}
          >
            <Plus className="size-3" />
          </span>
        )}
      </button>
      <span
        ref={nameRef}
        onMouseEnter={handleNameEnter}
        onMouseLeave={() => setTooltip(null)}
        className="w-full truncate text-center text-caption text-foreground"
      >
        {item.name}
      </span>
      {tooltip && (
        <div
          role="tooltip"
          className="fixed z-[9999] max-w-[200px] rounded-md bg-grey-900 px-2 py-1 text-[11px] text-white shadow-lg"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            transform: "translateX(-50%)",
          }}
        >
          {item.name}
        </div>
      )}
    </div>
  );
}

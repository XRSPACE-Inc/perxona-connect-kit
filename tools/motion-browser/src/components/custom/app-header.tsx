import * as React from "react";

import { cn } from "@/lib/utils";

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
}

export function AppHeader({
  title = "Perxona Connect Kit",
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-[90px] items-center gap-4 bg-transparent px-10",
        "bg-[linear-gradient(0deg,_rgba(0,0,0,0)_0%,_#5C5C5C_155%)]",
        className,
      )}
      {...props}
    >
      <h1 className="flex-1 truncate text-h4 text-[#f9fafb]">{title}</h1>
    </header>
  );
}

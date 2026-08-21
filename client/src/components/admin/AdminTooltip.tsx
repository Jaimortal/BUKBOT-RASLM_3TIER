import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AdminTooltipProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  sideOffset?: number;
  delayDuration?: number;
}

export function AdminTooltip({
  title,
  description,
  children,
  side = "top",
  align = "center",
  className,
  sideOffset = 6,
  delayDuration = 120,
}: AdminTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 max-w-[240px] rounded-lg border border-slate-700/60 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-2.5 text-left text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95",
            className
          )}
        >
          <div className="flex items-center gap-1.5 font-semibold text-xs text-white leading-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            <span>{title}</span>
          </div>
          {description && (
            <p className="mt-1 text-[11px] text-slate-300 font-normal leading-relaxed">
              {description}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AdminTooltip;

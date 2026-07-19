"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef, ElementRef, ReactElement } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref): ReactElement {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-11 w-full flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-muted p-1 text-muted-foreground",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref): ReactElement {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref): ReactElement {
  return (
    <TabsPrimitive.Content
      className={cn("mt-6 focus-visible:outline-none", className)}
      ref={ref}
      {...props}
    />
  );
});

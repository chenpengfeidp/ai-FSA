"use client";

import { Download, Heart, Trash2, X } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "../ui/button";

export function AnalysisLibraryBulkBar({
  onClear,
  onDelete,
  onFavorite,
  selectedCount,
}: Readonly<{
  onClear: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  selectedCount: number;
}>): ReactElement | null {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-2">
        <p className="text-body font-semibold text-foreground">
          {selectedCount} selected
        </p>
        <Button
          aria-label="Clear selection"
          onClick={onClear}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-label="Favorite selected"
          onClick={onFavorite}
          size="sm"
          type="button"
          variant="outline"
        >
          <Heart aria-hidden="true" className="size-3.5" />
          Favorite
        </Button>
        <Button
          aria-label="Delete selected"
          onClick={onDelete}
          size="sm"
          type="button"
          variant="danger"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Delete
        </Button>
        <Button
          aria-label="Export selected"
          disabled
          size="sm"
          title="Export coming later"
          type="button"
          variant="ghost"
        >
          <Download aria-hidden="true" className="size-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}

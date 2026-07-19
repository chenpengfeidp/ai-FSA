"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANALYSIS_SESSION_STAGES,
  buildSessionProgress,
  buildSessionStageViews,
} from "../lib/analysis-session";
import type {
  AnalysisSessionProgress,
  AnalysisSessionStageView,
} from "../types/analysis-session";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useAnalysisSessionStages({
  enabled,
  onComplete,
}: Readonly<{
  enabled: boolean;
  onComplete: () => void;
}>): {
  readonly isComplete: boolean;
  readonly progress: AnalysisSessionProgress;
  readonly stages: readonly AnalysisSessionStageView[];
} {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || completedRef.current) {
      return;
    }

    if (prefersReducedMotion()) {
      completedRef.current = true;
      setActiveIndex(ANALYSIS_SESSION_STAGES.length);
      setIsComplete(true);
      onCompleteRef.current();
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let index = 0;

    setActiveIndex(0);
    setIsComplete(false);

    const advance = (): void => {
      if (cancelled) {
        return;
      }

      const current = ANALYSIS_SESSION_STAGES[index];

      if (current === undefined) {
        completedRef.current = true;
        setIsComplete(true);
        onCompleteRef.current();
        return;
      }

      setActiveIndex(index);

      timeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }

        index += 1;

        if (index >= ANALYSIS_SESSION_STAGES.length) {
          completedRef.current = true;
          setActiveIndex(ANALYSIS_SESSION_STAGES.length);
          setIsComplete(true);
          onCompleteRef.current();
          return;
        }

        advance();
      }, current.durationMs);
    };

    advance();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled]);

  const stages = useMemo(
    () => buildSessionStageViews(activeIndex, isComplete),
    [activeIndex, isComplete],
  );
  const progress = useMemo(
    () => buildSessionProgress(activeIndex, isComplete),
    [activeIndex, isComplete],
  );

  return { isComplete, progress, stages };
}

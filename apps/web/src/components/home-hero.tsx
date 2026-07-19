"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { Button } from "./ui/button";

function scrollToSection(id: string): void {
  const target = document.getElementById(id);

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function HomeHero(): ReactElement {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="animate-fade-in relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 sm:px-10 sm:py-14"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--fas-primary-muted),transparent_55%),linear-gradient(180deg,var(--fas-surface)_0%,var(--fas-background)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-0 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-secondary/5 blur-2xl"
      />

      <div className="relative max-w-2xl space-y-6">
        <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Deterministic Football Intelligence
        </p>

        <div className="space-y-4">
          <h1
            className="text-[2rem] font-bold tracking-tight text-foreground sm:text-display sm:leading-[2.75rem] md:text-[3rem] md:leading-[3.25rem]"
            id="home-hero-heading"
          >
            AI Football Analysis Platform
          </h1>
          <p className="max-w-xl text-title font-normal text-muted-foreground">
            Explainable football analysis powered by deterministic pipelines.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={() => {
              scrollToSection("todays-matches");
            }}
            size="lg"
            type="button"
            variant="primary"
          >
            Analyze Today&apos;s Matches
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/reports">View Recent Reports</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

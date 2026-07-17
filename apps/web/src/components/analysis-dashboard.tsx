"use client";

import { Search } from "lucide-react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { useAnalyzeMatch } from "../hooks/use-analyze-match";
import { AnalysisCard } from "./analysis-card";
import { ErrorPanel } from "./error-panel";
import { LoadingSpinner } from "./loading-spinner";
import { PageContainer } from "./page-container";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

interface AnalysisFormValues {
  readonly matchId: string;
}

export function AnalysisDashboard(): ReactElement {
  const analysis = useAnalyzeMatch();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AnalysisFormValues>({
    defaultValues: {
      matchId: "match-example",
    },
  });

  const submit = handleSubmit(({ matchId }) => {
    analysis.mutate(matchId.trim());
  });

  return (
    <PageContainer>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Analyze a match</CardTitle>
            <CardDescription>
              Enter a provider match identifier to run the complete deterministic
              analysis workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
              onSubmit={submit}
            >
              <div className="flex-1">
                <label
                  className="mb-2 block text-sm font-semibold text-slate-800"
                  htmlFor="match-id"
                >
                  Match ID
                </label>
                <Input
                  aria-describedby={errors.matchId ? "match-id-error" : undefined}
                  aria-invalid={errors.matchId ? "true" : "false"}
                  autoComplete="off"
                  disabled={analysis.isPending}
                  id="match-id"
                  placeholder="match-example"
                  {...register("matchId", {
                    validate: (value) =>
                      value.trim().length > 0 || "Match ID is required.",
                  })}
                />
                {errors.matchId ? (
                  <p
                    className="mt-2 text-sm font-medium text-red-700"
                    id="match-id-error"
                  >
                    {errors.matchId.message}
                  </p>
                ) : null}
              </div>
              <Button
                className="sm:min-w-36"
                disabled={analysis.isPending}
                type="submit"
              >
                {analysis.isPending ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Search aria-hidden="true" className="size-4" />
                    Analyze
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {analysis.isError ? <ErrorPanel message={analysis.error.message} /> : null}

        {analysis.data ? <AnalysisCard report={analysis.data} /> : null}
      </div>
    </PageContainer>
  );
}

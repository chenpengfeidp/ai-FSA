import type { ReactElement } from "react";
import { AnalysisSessionPage } from "../../../../components/analysis-session/analysis-session-page";

export default async function AnalysisSessionRoute({
  params,
}: Readonly<{
  params: Promise<{ matchId: string }>;
}>): Promise<ReactElement> {
  const { matchId } = await params;

  return <AnalysisSessionPage matchId={matchId} />;
}

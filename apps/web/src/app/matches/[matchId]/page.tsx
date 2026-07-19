import type { ReactElement } from "react";
import { MatchDetailPage } from "../../../components/match-detail-page";

export default async function MatchDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ matchId: string }>;
}>): Promise<ReactElement> {
  const { matchId } = await params;

  return <MatchDetailPage matchId={matchId} />;
}

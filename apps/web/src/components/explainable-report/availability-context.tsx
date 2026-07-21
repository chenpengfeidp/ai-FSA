import { Activity, Ban } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  AvailabilityAbsenceItemView,
  AvailabilitySummaryView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function AbsenceRow({
  absence,
}: Readonly<{ absence: AvailabilityAbsenceItemView }>): ReactElement {
  return (
    <li className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-title text-foreground">{absence.playerName}</p>
        <Tag variant="muted">{absence.teamName}</Tag>
        <Tag variant="muted">{absence.teamSide}</Tag>
      </div>
      {absence.reason !== null ? (
        <p className="mt-1 text-body text-muted-foreground">{absence.reason}</p>
      ) : null}
      <p className="mt-1 text-caption font-mono text-subtle">{absence.playerId}</p>
      <p className="mt-1 text-caption text-muted-foreground">
        {zh.report.evidenceSource(absence.providerId, absence.source, absence.kind)}
      </p>
    </li>
  );
}

function AbsenceGroup({
  heading,
  icon,
  items,
}: Readonly<{
  heading: string;
  icon: ReactElement;
  items: readonly AvailabilityAbsenceItemView[];
}>): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-title text-foreground">{heading}</h3>
        <Tag variant="muted">{String(items.length)}</Tag>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <AbsenceRow
            key={`${item.kind}-${item.playerId}-${item.teamId}`}
            absence={item}
          />
        ))}
      </ul>
    </div>
  );
}

export function AvailabilityContextSection({
  availability,
}: Readonly<{ availability: AvailabilitySummaryView }>): ReactElement {
  return (
    <section aria-labelledby="availability-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="availability-context-heading">
            {zh.report.availability}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.availabilityHint}
          </p>
        </CardHeader>
        <CardContent>
          {availability.available ? (
            <div className="space-y-6">
              <p className="text-title text-foreground">
                {zh.report.availabilitySummary(
                  availability.injuryCount,
                  availability.suspensionCount,
                )}
              </p>
              <AbsenceGroup
                heading={zh.report.availabilityInjuries}
                icon={
                  <Activity aria-hidden="true" className="size-4 text-primary" />
                }
                items={availability.injuries}
              />
              <AbsenceGroup
                heading={zh.report.availabilitySuspensions}
                icon={<Ban aria-hidden="true" className="size-4 text-primary" />}
                items={availability.suspensions}
              />
              <p className="text-body text-muted-foreground">{availability.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-title text-foreground">
                {zh.report.noAvailability}
              </p>
              <p className="mt-2 text-body text-muted-foreground">
                {zh.report.noAvailabilityDescription}
              </p>
              <p className="mt-2 text-body text-muted-foreground">
                {availability.note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

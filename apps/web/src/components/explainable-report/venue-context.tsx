import { MapPin } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { VenueContextView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

export function VenueContextSection({
  venue,
}: Readonly<{ venue: VenueContextView }>): ReactElement {
  return (
    <section aria-labelledby="venue-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="venue-context-heading">{zh.report.venue}</CardTitle>
          <p className="text-caption text-muted-foreground">{zh.report.venueHint}</p>
        </CardHeader>
        <CardContent>
          {venue.available ? (
            <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-primary" />
                <p className="text-title text-foreground">{venue.name}</p>
                {venue.city !== null ? (
                  <Tag variant="muted">{venue.city}</Tag>
                ) : null}
              </div>
              {venue.venueId !== null ? (
                <p className="text-caption font-mono text-subtle">
                  {zh.report.venueId(venue.venueId)}
                </p>
              ) : null}
              {venue.providerId !== null && venue.source !== null ? (
                <p className="text-caption text-muted-foreground">
                  {zh.report.evidenceSource(venue.providerId, venue.source, "venue")}
                </p>
              ) : null}
              <p className="text-body text-muted-foreground">{venue.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-title text-foreground">{zh.report.noVenue}</p>
              <p className="mt-2 text-body text-muted-foreground">{venue.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

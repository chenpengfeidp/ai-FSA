import type { Clock } from "@fas/statistics";

export class IsoClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

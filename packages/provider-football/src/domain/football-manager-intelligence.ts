/**
 * Provider-football Manager Intelligence Evidence contract (M1A).
 *
 * Every field is optional and present only when the provider supplies it.
 * Never estimate, infer, or fabricate identity, tenure, or career facts.
 * This is Evidence only: no Feature, Rule, Confidence, or Projection reads
 * this record in M1A, and this record never scores or interprets manager
 * quality or tactical ability.
 */

export type FootballManagerIntelligenceSide = "home" | "away";

/**
 * One club's manager identity and season/career facts, as reported by the
 * provider for this fixture's teams. `matchManagerConfirmed` reports only
 * whether the identity below was cross-checked against this exact fixture's
 * published lineup sheet — it never estimates whether a manager will
 * actually take the dugout.
 */
export type FootballManagerIntelligenceRecord = Readonly<{
  managerId?: string;
  managerName: string;
  teamId: string;
  teamName: string;
  teamSide: FootballManagerIntelligenceSide;
  competitionId?: string;
  competitionName?: string;
  season?: string;
  /** Vendor-reported nationality string; never inferred from name or team. */
  nationality?: string;
  /** Vendor-reported age; never computed from a birth date. */
  age?: number;
  /** ISO-8601 calendar date the current career entry began at this club. */
  appointmentDate?: string;
  /** Whole days from appointmentDate to observedAt when both are known. */
  tenureDays?: number;
  /**
   * Whether the provider explicitly flags this identity as an interim /
   * caretaker appointment. The current provider does not expose such a
   * flag, so this field is always honestly absent (`undefined`) today —
   * it is typed here so a future provider capability can populate it
   * without a contract change.
   */
  interimManagerStatus?: boolean;
  /** Prior club names from the provider's career history, most recent first. */
  previousClubs?: readonly string[];
  /**
   * True only when this identity was cross-confirmed against this fixture's
   * published `/fixtures/lineups` coach name. False means the identity is a
   * season-level profile only, not confirmed for this specific fixture.
   */
  matchManagerConfirmed: boolean;
  /** ISO-8601 instant for the observation (typically fixture kickoff). */
  observedAt: string;
  providerMethod: "http-live" | "recorded-snapshot";
}>;

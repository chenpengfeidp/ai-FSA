import type { ProjectionReplaySidecarRepository } from "@fas/statistics";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ProjectionReplaySidecarRepositoryBridge
  implements ProjectionReplaySidecarRepository
{
  constructor(private readonly repository: ProjectionReplaySidecarRepository) {}

  save(
    input: Parameters<ProjectionReplaySidecarRepository["save"]>[0],
  ): ReturnType<ProjectionReplaySidecarRepository["save"]> {
    return this.repository.save(input);
  }

  findByHistoryId(
    historyId: string,
  ): ReturnType<ProjectionReplaySidecarRepository["findByHistoryId"]> {
    return this.repository.findByHistoryId(historyId);
  }

  buildSidecarMap(): ReturnType<
    ProjectionReplaySidecarRepository["buildSidecarMap"]
  > {
    return this.repository.buildSidecarMap();
  }
}

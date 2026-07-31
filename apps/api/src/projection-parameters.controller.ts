import {
  buildProjectionParameterCatalog,
  type ProjectionParameterCatalog,
} from "@fas/analysis";
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

/**
 * P2J Projection Parameter Artifact — read-only catalog of versioned
 * Projection parameters. Never mutates artifacts; no tuning or ML.
 */
@ApiTags("Projection Parameters")
@Controller("api/projection-parameters")
export class ProjectionParametersController {
  @Get()
  @ApiOperation({
    summary:
      "List versioned Projection Parameter Artifacts (P2J) with active version and parameter groups",
  })
  @ApiOkResponse({
    description:
      "Deterministic catalog of projection.v3.baseline / experimental / replay artifacts.",
  })
  catalog(): ProjectionParameterCatalog {
    return buildProjectionParameterCatalog();
  }
}

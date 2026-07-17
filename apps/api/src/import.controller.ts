// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import { type ImportMatchResult, ImportMatchUseCase } from "@fas/application";
import { Bind, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";

@Controller("api/import")
export class ImportController {
  constructor(private readonly importMatch: ImportMatchUseCase) {}

  @Post("match/:matchId")
  @HttpCode(HttpStatus.OK)
  @Bind(Param("matchId"))
  importMatchById(matchId: string): ImportMatchResult {
    return this.importMatch.execute(matchId);
  }
}

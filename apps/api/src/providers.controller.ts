import {
  getDefaultEvidenceProviderRegistry,
  type EvidenceProviderRegistration,
  type ProviderCapabilityDeclaration,
  type ProviderCapabilityKind,
  PROVIDER_CAPABILITY_KINDS,
} from "@fas/evidence";
import {
  Bind,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Evidence providers")
@Controller("api/providers")
export class ProvidersController {
  @Get()
  @ApiOperation({ summary: "List registered Evidence Providers (F1.1A registry)" })
  @ApiOkResponse({ description: "Provider registry entries." })
  list(): readonly EvidenceProviderRegistration[] {
    return getDefaultEvidenceProviderRegistry().list();
  }

  @Get("connected")
  @ApiOperation({ summary: "List connected Evidence Providers only" })
  listConnected(): readonly EvidenceProviderRegistration[] {
    return getDefaultEvidenceProviderRegistry().listConnected();
  }

  @Get("capabilities")
  @Bind(Query("kind"))
  @ApiOperation({ summary: "Query providers that support a capability kind" })
  @ApiQuery({
    name: "kind",
    required: true,
    enum: PROVIDER_CAPABILITY_KINDS,
    example: "recent_form",
  })
  byCapability(kind: string): readonly EvidenceProviderRegistration[] {
    if (!PROVIDER_CAPABILITY_KINDS.includes(kind as ProviderCapabilityKind)) {
      throw new NotFoundException(`Unknown capability kind "${kind}".`);
    }

    return getDefaultEvidenceProviderRegistry().providersSupporting(
      kind as ProviderCapabilityKind,
    );
  }

  @Get(":providerId/capabilities")
  @Bind(Param("providerId"))
  @ApiOperation({ summary: "List capabilities for one provider" })
  @ApiParam({ name: "providerId", example: "football:api-sports" })
  capabilities(providerId: string): readonly ProviderCapabilityDeclaration[] {
    const provider = getDefaultEvidenceProviderRegistry().get(providerId);

    if (provider === undefined) {
      throw new NotFoundException(`Provider "${providerId}" was not found.`);
    }

    return provider.capabilities;
  }

  @Get(":providerId")
  @Bind(Param("providerId"))
  @ApiOperation({ summary: "Get one Evidence Provider registration" })
  @ApiParam({ name: "providerId", example: "football:api-sports" })
  get(providerId: string): EvidenceProviderRegistration {
    const provider = getDefaultEvidenceProviderRegistry().get(providerId);

    if (provider === undefined) {
      throw new NotFoundException(`Provider "${providerId}" was not found.`);
    }

    return provider;
  }
}

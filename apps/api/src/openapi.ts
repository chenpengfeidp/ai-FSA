import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Football Analysis System API")
    .setDescription("Evidence import and query API.")
    .setVersion("0.1.0")
    .addTag("Evidence import")
    .addTag("Evidence queries")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, documentFactory);
}

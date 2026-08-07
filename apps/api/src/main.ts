import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Must run before AppModule (and auth helpers) are imported.
loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

/** Boot Nest API with cookie parser, validation, CORS, and /api prefix. */
async function bootstrap() {
  const { NestFactory } = await import("@nestjs/core");
  const { ValidationPipe } = await import("@nestjs/common");
  const { default: cookieParser } = await import("cookie-parser");
  const { AppModule } = await import("./app.module");

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3002,http://localhost:3003")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Numee API listening on http://localhost:${port}/api`);
}

bootstrap();

import alchemy from "alchemy";
import { CustomDomain, D1Database, Vite, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

const isDev = !!process.env.ALCHEMY_DEV;

if (isDev) {
  // Dev: localhost values take precedence
  config({ path: "./.env" });
  config({ path: "../../apps/web/.env" });
  config({ path: "../../apps/server/.env" });
  // Production env as fallback (for vars only in production, e.g. Google OAuth)
  config({ path: "../../apps/web/.env.production" });
  config({ path: "../../apps/server/.env.production" });
} else {
  // Deploy: production values take precedence
  config({ path: "../../apps/web/.env.production" });
  config({ path: "../../apps/server/.env.production" });
  config({ path: "./.env" });
  config({ path: "../../apps/web/.env" });
  config({ path: "../../apps/server/.env" });
}

const app = await alchemy("zentis", {
  profile: "default",
  stage: isDev ? "development" : "production",
  password: process.env.ALCHEMY_PASSWORD,
});

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    BETTER_AUTH_COOKIE_DOMAIN: alchemy.env.BETTER_AUTH_COOKIE_DOMAIN ?? "",
    GOOGLE_CLIENT_ID: alchemy.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: alchemy.secret.env.GOOGLE_CLIENT_SECRET!,
  },
  ...(!isDev && {
    domains: [new URL(alchemy.env.BETTER_AUTH_URL!).hostname],
  }),
  dev: {
    port: 3000,
  },
});

if (!isDev) {
  const webDomain = new URL(alchemy.env.CORS_ORIGIN!).hostname;
  await CustomDomain("web-domain", {
    name: webDomain,
    workerName: web.name,
  });
}

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();

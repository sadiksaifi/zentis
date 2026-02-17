import alchemy from "alchemy";
import { CustomDomain, D1Database, Vite, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

// Production env first (takes precedence — dotenv doesn't override existing vars)
config({ path: "../../apps/web/.env.production" });
config({ path: "../../apps/server/.env.production" });
// Base env fills in any missing vars
config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("zentis", {
  profile: "default",
  stage: "production",
  password: process.env.ALCHEMY_PASSWORD,
});

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

// Derive custom domains from env vars
const webDomain = new URL(alchemy.env.CORS_ORIGIN!).hostname;
const serverDomain = new URL(alchemy.env.BETTER_AUTH_URL!).hostname;

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
  },
});

await CustomDomain("web-domain", {
  name: webDomain,
  workerName: web.name,
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
  domains: [serverDomain],
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();

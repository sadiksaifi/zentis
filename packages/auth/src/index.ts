import { db } from "@zentis/db";
import * as schema from "@zentis/db/schema/auth";
import { env } from "@zentis/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: async () => [env.CORS_ORIGIN],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    ...(env.BETTER_AUTH_COOKIE_DOMAIN && {
      crossSubDomainCookies: {
        enabled: true,
        domain: env.BETTER_AUTH_COOKIE_DOMAIN,
      },
    }),
    defaultCookieAttributes: {
      sameSite: env.BETTER_AUTH_COOKIE_DOMAIN ? "lax" : "none",
      secure: true,
      httpOnly: true,
    },
  },
});

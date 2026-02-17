// No top-level imports → global script file → declare module creates (not augments)
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

type AlchemyServer = typeof import("@zentis/infra/alchemy.run").server;
type CloudflareEnv = AlchemyServer["Env"];

declare global {
  type Env = CloudflareEnv;
  namespace Cloudflare {
    interface Env extends CloudflareEnv {}
  }
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}

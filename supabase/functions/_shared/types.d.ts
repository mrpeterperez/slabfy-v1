// Type declarations for Deno runtime in Supabase Edge Functions
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;
  }
}

export {};
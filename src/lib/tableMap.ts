// src/lib/tableMap.ts
import { supabase } from "./supabase";
import type { PostgrestSingleResponse, PostgrestError } from "@supabase/supabase-js";

type QB = ReturnType<typeof supabase.from>;

const TABLES = {
  ocean: ["ocean_freight", "ocean_freight_rates"],
  local: ["local", "local_charges"],
  transport: ["transport", "transport_pricing"],
} as const;

function isMissingTable(err?: PostgrestError | null) {
  return !!err && err.code === "PGRST205"; // table not in schema cache
}

export async function selectWithFallback<T>(
  keys: readonly string[],
  build: (q: QB) => Promise<PostgrestSingleResponse<T[]>>
): Promise<{ data: T[]; table: string }> {
  if (!supabase) {
    throw new Error("Supabase client not initialized. Please check your environment variables.");
  }

  let lastErr: PostgrestError | null = null;
  for (const t of keys) {
    const { data, error } = await build(supabase.from(t));
    if (!error) return { data: data ?? [], table: t };
    if (!isMissingTable(error)) throw error; // real error → bubble up
    lastErr = error; // try next candidate name
  }
  throw lastErr ?? new Error("Unknown error");
}

export const TABLE_KEYS = TABLES;
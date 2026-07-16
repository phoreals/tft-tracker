import { NextResponse } from "next/server";
import { getTrackedPlayers, migratePlayerToNamespacedKeys } from "@/lib/kv";
import { isMockMode } from "@/lib/mock";

export const maxDuration = 60;

// One-time, idempotent migration: copies each tracked player's legacy
// un-namespaced facet keys (player:{puuid}:{facet}) into the Set 17 namespace
// (player:{puuid}:s17:{facet}). Safe to run repeatedly and safe to run while
// Set 17 is still active — it never overwrites an already-namespaced key.
export async function POST() {
  if (isMockMode()) {
    return NextResponse.json({ error: "Migration is a no-op in mock mode" }, { status: 400 });
  }

  const players = await getTrackedPlayers();
  const results = await Promise.all(
    players.map(async (p) => ({
      puuid: p.puuid,
      name: p.gameName ?? p.puuid,
      copied: await migratePlayerToNamespacedKeys(p.puuid),
    })),
  );

  const migrated = results.filter((r) => r.copied.length > 0).length;
  return NextResponse.json({ players: results.length, migrated, results });
}

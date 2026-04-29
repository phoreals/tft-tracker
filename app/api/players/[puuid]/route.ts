import { NextRequest, NextResponse } from "next/server";
import {
  removePlayer,
  getPlayerCurrent,
  getPlayerMatches,
  getPlayerHistory,
} from "@/lib/kv";
import { Redis } from "@upstash/redis";
import { isMockMode, getMockPlayer } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  const { puuid } = await params;

  if (isMockMode()) {
    const mock = getMockPlayer(puuid);
    if (!mock) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json(mock);
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL ?? "",
    token: process.env.KV_REST_API_TOKEN ?? "",
  });

  const player = await redis.get<{
    puuid: string;
    gameName: string;
    tagLine: string;
    summonerId: string;
    region: string;
    profileIconId?: number;
  }>(`player:${puuid}`);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [current, matches, history] = await Promise.all([
    getPlayerCurrent(puuid),
    getPlayerMatches(puuid),
    getPlayerHistory(puuid),
  ]);

  return NextResponse.json({ ...player, current, matches, history });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  const { puuid } = await params;
  await removePlayer(puuid);
  return NextResponse.json({ success: true });
}

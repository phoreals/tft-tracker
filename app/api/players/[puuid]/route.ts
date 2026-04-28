import { NextRequest, NextResponse } from "next/server";
import { removePlayer } from "@/lib/kv";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  const { puuid } = await params;
  await removePlayer(puuid);
  return NextResponse.json({ success: true });
}

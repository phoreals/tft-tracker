import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse sync logic by calling the sync endpoint internally
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/sync`, { method: "POST" });
  const data = await res.json();

  return NextResponse.json({ ...data, source: "cron" });
}

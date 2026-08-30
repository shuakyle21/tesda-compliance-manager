import { NextResponse } from "next/server";
import spec from "@/docs/openapi/openapi.json";
import { getAuthUserId } from "@/modules/auth/data/auth";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(spec);
}

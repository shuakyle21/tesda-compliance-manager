import { NextResponse } from "next/server";
import spec from "@/docs/openapi/openapi.json";

export function GET() {
  return NextResponse.json(spec);
}

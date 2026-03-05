import { NextResponse } from "next/server";
import { saveGpxFile } from "@/lib/server/gpxStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "Expected a GPX file upload." }, { status: 400 });
  }

  try {
    const saved = await saveGpxFile(fileValue);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Failed to save GPX file." }, { status: 500 });
  }
}

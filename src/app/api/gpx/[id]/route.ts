import { NextResponse } from "next/server";
import { deleteGpxFile, readGpxFile } from "@/lib/server/gpxStorage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const content = await readGpxFile(params.id);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "GPX file not found." }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteGpxFile(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

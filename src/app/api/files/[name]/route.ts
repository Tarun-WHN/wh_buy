import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { readFile } from "fs/promises";
import path from "path";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

// Serves uploaded files from the upload directory (the persistent disk on
// Render). Files live outside /public so they are not statically served;
// this route streams them to authenticated users only.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  // Only allow the generated filename pattern — block any path traversal.
  const safeName = path.basename(name);
  if (safeName !== name || !/^[A-Za-z0-9._-]+$/.test(safeName)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const uploadDir =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, safeName);

  try {
    const data = await readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

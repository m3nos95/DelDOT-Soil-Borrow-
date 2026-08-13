import { SAMPLE_BRIDGE_NOFO, SAMPLE_PROTECT_NOFO, SAMPLE_RAISE_NOFO, SAMPLE_SS4A_NOFO } from "@/lib/sample-nofo";

const FILES: Record<string, { name: string; body: string }> = {
  ss4a: { name: "Safe Streets and Roads for All (SS4A) FY2024.txt", body: SAMPLE_SS4A_NOFO },
  raise: { name: "RAISE FY2024.txt", body: SAMPLE_RAISE_NOFO },
  bridge: { name: "Bridge Investment Program FY2024.txt", body: SAMPLE_BRIDGE_NOFO },
  protect: { name: "PROTECT Discretionary FY2024.txt", body: SAMPLE_PROTECT_NOFO },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("id") ?? "ss4a";
  const file = FILES[key] ?? FILES.ss4a;
  return new Response(file.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.name}"`,
    },
  });
}

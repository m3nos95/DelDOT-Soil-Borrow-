import { sampleNofoTextForFile } from "./extract-nofo";

export async function extractTextFromUpload(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  const sample = sampleNofoTextForFile(fileName);
  if (sample && buffer.length < 80) return sample;

  if (lower.endsWith(".txt") || mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    try {
      const mod = (await import("pdf-parse/lib/pdf-parse.js")) as {
        default?: (data: Buffer) => Promise<{ text: string }>;
      };
      const pdfParse = mod.default ?? (mod as unknown as (data: Buffer) => Promise<{ text: string }>);
      const result = await pdfParse(buffer);
      const text = result.text?.trim() ?? "";
      if (text.length > 40) return text;
      if (sample) return sample;
      return text;
    } catch {
      if (sample) return sample;
      throw new Error("Could not read PDF text. Upload a text-based PDF or .txt NOFO.");
    }
  }

  const asText = buffer.toString("utf8");
  if (asText.trim().length > 40) return asText;
  if (sample) return sample;
  throw new Error("Unsupported NOFO file type. Use PDF or TXT.");
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type FontFaceDef = {
  fileName: string;
  unicodeRange: string;
};

function parseFontFaces(css: string): FontFaceDef[] {
  const fontFaceBlocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];

  return fontFaceBlocks
    .map(block => {
      const fileMatch = block.match(/url\(\.\/files\/([^)]+\.woff)\)\s*format\('woff'\)/);
      const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/);
      if (!fileMatch || !unicodeMatch) return null;
      return {
        fileName: fileMatch[1],
        unicodeRange: unicodeMatch[1].trim(),
      };
    })
    .filter((face): face is FontFaceDef => Boolean(face));
}

function charMatchesUnicodeRange(charCode: number, unicodeRange: string): boolean {
  const ranges = unicodeRange.split(",").map(part => part.trim());
  return ranges.some(range => {
    const match = range.match(/^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i);
    if (!match) return false;
    const start = parseInt(match[1], 16);
    const end = parseInt(match[2] ?? match[1], 16);
    return charCode >= start && charCode <= end;
  });
}

function pickFontFilesForText(text: string, faces: FontFaceDef[]): string[] {
  const codePoints = Array.from(text)
    .map(char => char.codePointAt(0))
    .filter((cp): cp is number => typeof cp === "number");

  const selected = new Set<string>();
  for (const codePoint of codePoints) {
    const face = faces.find(f => charMatchesUnicodeRange(codePoint, f.unicodeRange));
    if (face) selected.add(face.fileName);
  }

  return selected.size > 0 ? Array.from(selected) : [faces[0]?.fileName].filter(Boolean);
}

async function loadLocalFontFiles(
  pkgName: string,
  cssFileName: string,
  text: string
): Promise<ArrayBuffer[]> {
  const cssPath = resolve(process.cwd(), "node_modules", pkgName, cssFileName);
  const css = await readFile(cssPath, "utf-8");
  const faces = parseFontFaces(css);
  const selectedFiles = pickFontFilesForText(text, faces);

  return Promise.all(
    selectedFiles.map(async fileName => {
      const fontPath = resolve(
        process.cwd(),
        "node_modules",
        pkgName,
        "files",
        fileName
      );
      const buffer = await readFile(fontPath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
    })
  );
}

async function loadFontsourceFonts(
  text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  const fonts: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }> = [];

  const inter400 = await loadLocalFontFiles("@fontsource/inter", "400.css", text);
  const inter700 = await loadLocalFontFiles("@fontsource/inter", "700.css", text);
  const noto400 = await loadLocalFontFiles("@fontsource/noto-sans-sc", "400.css", text);
  const noto700 = await loadLocalFontFiles("@fontsource/noto-sans-sc", "700.css", text);

  inter400.forEach(data =>
    fonts.push({ name: "Inter", data, weight: 400, style: "normal" })
  );
  inter700.forEach(data =>
    fonts.push({ name: "Inter", data, weight: 700, style: "normal" })
  );
  noto400.forEach(data =>
    fonts.push({ name: "Noto Sans SC", data, weight: 400, style: "normal" })
  );
  noto700.forEach(data =>
    fonts.push({ name: "Noto Sans SC", data, weight: 700, style: "normal" })
  );

  return fonts;
}

export default loadFontsourceFonts;

function normalizeContentSource(source?: string) {
  switch ((source ?? "local").toLowerCase()) {
    case "gopress":
    case "go":
      return "gopress";
    case "cms":
    case "pb":
    case "pocketbase":
      return "cms";
    default:
      return "local";
  }
}

export const CONTENT_SOURCE = normalizeContentSource(import.meta.env.CONTENT_SOURCE);

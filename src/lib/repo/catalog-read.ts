import { CATALOG_TYPES, type DynamoItem } from "@/lib/repo/mappers";

let loggedByTypeFallback = false;

function describesMissingIndex(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  const named = name === "ValidationException" || name === "ResourceNotFoundException";
  return named && /index/i.test(message);
}

/**
 * `byType` is created with the table change. A deploy that is ahead of the
 * index must keep serving from a scan until the index finishes.
 */
export async function readCatalogItems(
  queryType: (type: (typeof CATALOG_TYPES)[number]) => Promise<DynamoItem[]>,
  scan: () => Promise<DynamoItem[]>,
): Promise<DynamoItem[]> {
  try {
    const pages = await Promise.all(CATALOG_TYPES.map((type) => queryType(type)));
    return pages.flat();
  } catch (error) {
    if (!describesMissingIndex(error)) throw error;
    if (!loggedByTypeFallback) {
      loggedByTypeFallback = true;
      console.warn("byType index is not ready; scanning the table for the catalog.");
    }
    return scan();
  }
}

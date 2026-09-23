/**
 * PostgREST caps every response at 1000 rows by default, so a plain select
 * silently truncates. This pages through with .range() until a short page.
 *
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from("trades").select("...").eq("user_id", id).order("closed_at").range(from, to));
 */
const PAGE = 1000;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

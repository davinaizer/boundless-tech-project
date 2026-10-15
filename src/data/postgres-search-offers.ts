import "server-only";
import type { Pool } from "pg";
import { Offer } from "@/domain/offer";
import { UK_WIDE_REGION, type SearchOffers } from "@/domain/search-offers";

// Rules are the behaviour table in docs/architecture.md, proved by the contract suite.
// Every filter value is a bound parameter; no SQL is built from input (ADR-010).

// Money comes back as float8 (pg parses it to a number) and the date as text, so
// the driver never shifts it through a local-time `Date`.
const COLUMNS = `
  id, title, partner, category, tier, region, audience,
  typical_price_per_person::float8 AS "typicalPricePerPerson",
  typical_saving_per_use::float8 AS "typicalSavingPerUse",
  assumed_uses_per_year AS "assumedUsesPerYear",
  expiry_date::text AS "expiryDate"`;

// Keyword hits use strpos, not LIKE, so `%` and `_` in a keyword are literal.
// Annual saving is compared in whole pence and ids in code-point order ("C"),
// matching the in-memory adapter.
const SEARCH_SQL = `
  WITH matched AS (
    SELECT o.*, (
      SELECT count(*) FROM unnest($6::text[]) AS k
      WHERE strpos(lower(o.title), lower(k)) > 0 OR strpos(lower(o.partner), lower(k)) > 0
    ) AS hits
    FROM offers o
    WHERE (o.expiry_date IS NULL OR o.expiry_date >= $1::date)
      AND (cardinality($2::text[]) = 0 OR o.category = ANY($2::text[]))
      AND ($3::text IS DISTINCT FROM 'standard' OR o.tier = 'standard')
      AND ($4::text IS NULL OR $4::text = ANY(o.audience))
      AND ($5::text IS NULL OR o.region = $8::text OR lower(o.region) = lower($5::text))
      AND ($7::numeric IS NULL OR o.typical_price_per_person <= $7::numeric)
  )
  SELECT ${COLUMNS} FROM matched
  WHERE cardinality($6::text[]) = 0 OR hits > 0
  ORDER BY
    hits DESC,
    round(typical_saving_per_use * 100)::bigint * assumed_uses_per_year DESC,
    id COLLATE "C"`;

const GET_BY_IDS_SQL = `
  SELECT ${COLUMNS} FROM offers WHERE id = ANY($1::text[]) ORDER BY id COLLATE "C"`;

// The database is outside input: rows are parsed like any other boundary.
const toOffer = ({ expiryDate, ...row }: Record<string, unknown>): Offer =>
  Offer.parse(expiryDate === null ? row : { ...row, expiryDate });

export function createPostgresSearchOffers(pool: Pool): SearchOffers {
  return {
    async search(filters, today) {
      const { rows } = await pool.query(SEARCH_SQL, [
        today,
        filters.categories,
        filters.tier ?? null,
        filters.audience ?? null,
        filters.region ?? null,
        filters.keywords,
        filters.maxPricePerPerson ?? null,
        UK_WIDE_REGION,
      ]);
      return rows.map(toOffer);
    },

    async getByIds(ids) {
      const { rows } = await pool.query(GET_BY_IDS_SQL, [ids]);
      return rows.map(toOffer);
    },
  };
}

// Replaces the whole catalogue in one transaction. Used by the contract tests
// and the seed script.
export async function replaceOffers(pool: Pool, offers: readonly Offer[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM offers");
    for (const offer of offers) {
      await client.query(
        `INSERT INTO offers (id, title, partner, category, tier, region, audience,
           typical_price_per_person, typical_saving_per_use, assumed_uses_per_year, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          offer.id,
          offer.title,
          offer.partner,
          offer.category,
          offer.tier,
          offer.region,
          offer.audience,
          offer.typicalPricePerPerson,
          offer.typicalSavingPerUse,
          offer.assumedUsesPerYear,
          offer.expiryDate ?? null,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

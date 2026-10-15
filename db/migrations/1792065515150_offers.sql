-- Up Migration

-- Mirrors the `Offer` schema in src/domain/offer.ts. Enumerations are CHECK
-- constraints, not Postgres enum types, so changing a value is one migration.
CREATE TABLE offers (
  id text PRIMARY KEY CHECK (id <> ''),
  title text NOT NULL CHECK (title <> ''),
  partner text NOT NULL CHECK (partner <> ''),
  category text NOT NULL
    CHECK (category IN ('days-out', 'dining', 'shopping', 'travel', 'motoring', 'events')),
  tier text NOT NULL CHECK (tier IN ('standard', 'plus')),
  region text NOT NULL CHECK (region <> ''),
  audience text[] NOT NULL
    CHECK (cardinality(audience) >= 1 AND audience <@ ARRAY['solo', 'couple', 'family']),
  typical_price_per_person numeric(10, 2) NOT NULL CHECK (typical_price_per_person >= 0),
  typical_saving_per_use numeric(10, 2) NOT NULL CHECK (typical_saving_per_use >= 0),
  assumed_uses_per_year integer NOT NULL CHECK (assumed_uses_per_year >= 0),
  expiry_date date
);

-- Down Migration

DROP TABLE offers;

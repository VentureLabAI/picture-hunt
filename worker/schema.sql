-- Anonymous daily totals. One row per (day, event, channel). No personal data.
-- Apply with:
--   npx wrangler d1 execute picture-hunt-stats --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS counts (
  day     TEXT    NOT NULL,            -- YYYY-MM-DD, US Central
  event   TEXT    NOT NULL,            -- visit, try_free, check_yes, check_no, code_ok, ...
  channel TEXT    NOT NULL DEFAULT '', -- campaign label from a ?c= link, or a code label
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, channel)
);

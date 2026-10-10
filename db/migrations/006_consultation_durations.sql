DO $$
DECLARE fixed_duration text;
BEGIN
 SELECT conname INTO fixed_duration FROM pg_constraint
 WHERE conrelid='availability_windows'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%00:30:00%';
 IF fixed_duration IS NOT NULL THEN
   EXECUTE format('ALTER TABLE availability_windows DROP CONSTRAINT %I', fixed_duration);
 END IF;
END $$;
WITH october AS (
 SELECT tstzrange('2026-10-01T00:00:00Z'::timestamptz,'2026-11-01T00:00:00Z'::timestamptz,'[)') AS span
), existing AS (
 SELECT coalesce(range_agg(tstzrange(w.starts_at,w.ends_at,'[)') * o.span), '{}'::tstzmultirange) AS spans
 FROM availability_windows w CROSS JOIN october o
 WHERE tstzrange(w.starts_at,w.ends_at,'[)') && o.span
), gaps AS (
 SELECT unnest(tstzmultirange(o.span)-e.spans) AS span FROM october o CROSS JOIN existing e
)
INSERT INTO availability_windows(starts_at,ends_at)
SELECT lower(span),upper(span) FROM gaps WHERE NOT isempty(span);

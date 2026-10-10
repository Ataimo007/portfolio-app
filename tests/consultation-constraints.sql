BEGIN;
DO $$
DECLARE client uuid; window_id uuid; job_a uuid; job_b uuid; job_c uuid;
BEGIN
 INSERT INTO client_profiles(issuer,subject,display_name,email)
 VALUES('https://test.invalid','duration-transaction-check','Duration fixture','duration@example.invalid') RETURNING id INTO client;
 INSERT INTO availability_windows(starts_at,ends_at)
 VALUES('2098-10-01 00:00Z','2098-11-01 00:00Z') RETURNING id INTO window_id;
 INSERT INTO consultancy_jobs(client_id,title,description) VALUES(client,'One hour','Transaction-only fixture') RETURNING id INTO job_a;
 INSERT INTO consultancy_jobs(client_id,title,description) VALUES(client,'One week','Transaction-only fixture') RETURNING id INTO job_b;
 INSERT INTO consultancy_jobs(client_id,title,description) VALUES(client,'Overlapping request','Transaction-only fixture') RETURNING id INTO job_c;
 INSERT INTO bookings(job_id,slot_id,starts_at,ends_at,status)
 VALUES(job_a,window_id,'2098-10-01 10:00Z','2098-10-01 11:00Z','approved');
 INSERT INTO bookings(job_id,slot_id,starts_at,ends_at,status)
 VALUES(job_b,window_id,'2098-10-02 10:00Z','2098-10-09 10:00Z','approved');
 BEGIN
  INSERT INTO bookings(job_id,slot_id,starts_at,ends_at,status)
  VALUES(job_c,window_id,'2098-10-01 10:30Z','2098-10-01 11:30Z','approved');
  RAISE EXCEPTION 'Overlapping variable-duration booking was accepted';
 EXCEPTION WHEN exclusion_violation THEN NULL;
 END;
 IF NOT EXISTS(SELECT 1 FROM availability_windows WHERE starts_at <= '2026-10-31 23:59Z' AND ends_at >= '2026-11-01 00:00Z') THEN
  RAISE EXCEPTION 'October availability is incomplete';
 END IF;
END $$;
ROLLBACK;

BEGIN;
SET ROLE portal;
DO $$
DECLARE client_a uuid; client_b uuid; job_a uuid; job_b uuid; slot uuid; booking_a uuid; booking_b uuid; nonce uuid := gen_random_uuid();
BEGIN
 INSERT INTO client_profiles(issuer,subject,display_name,email) VALUES('https://test.invalid','constraint-a','Synthetic A','a@example.invalid') RETURNING id INTO client_a;
 INSERT INTO client_profiles(issuer,subject,display_name,email) VALUES('https://test.invalid','constraint-b','Synthetic B','b@example.invalid') RETURNING id INTO client_b;
 INSERT INTO consultancy_jobs(client_id,title,description) VALUES(client_a,'Schema check A','Synthetic transaction') RETURNING id INTO job_a;
 INSERT INTO consultancy_jobs(client_id,title,description) VALUES(client_b,'Schema check B','Synthetic transaction') RETURNING id INTO job_b;
 INSERT INTO availability_windows(starts_at,ends_at) VALUES('2099-01-01 10:00Z','2099-01-01 10:30Z') RETURNING id INTO slot;
 INSERT INTO bookings(job_id,slot_id,starts_at,ends_at) VALUES(job_a,slot,'2099-01-01 10:00Z','2099-01-01 10:30Z') RETURNING id INTO booking_a;
 INSERT INTO bookings(job_id,slot_id,starts_at,ends_at) VALUES(job_b,slot,'2099-01-01 10:00Z','2099-01-01 10:30Z') RETURNING id INTO booking_b;
 UPDATE bookings SET status='approved' WHERE id=booking_a;
 BEGIN
  UPDATE bookings SET status='approved' WHERE id=booking_b;
  RAISE EXCEPTION 'Two competing approvals were accepted';
 EXCEPTION WHEN exclusion_violation THEN NULL;
 END;
 UPDATE bookings SET status='cancelled' WHERE id=booking_a;
 UPDATE bookings SET status='approved' WHERE id=booking_b;
 INSERT INTO messages(job_id,sender_id,body,client_nonce) VALUES(job_b,client_b,'Synthetic message',nonce);
 BEGIN
  INSERT INTO messages(job_id,sender_id,body,client_nonce) VALUES(job_b,client_b,'Duplicate retry',nonce);
  RAISE EXCEPTION 'Duplicate message retry was accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO messages(job_id,sender_id,body,client_nonce) VALUES(job_b,client_b,'',gen_random_uuid());
  RAISE EXCEPTION 'Empty message was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 INSERT INTO event_outbox(event_type,aggregate_id,payload) VALUES('message.created',job_b,'{"schemaVersion":1}');
END $$;
ROLLBACK;

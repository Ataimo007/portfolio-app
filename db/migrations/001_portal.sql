CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE client_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer text NOT NULL, subject text NOT NULL,
 display_name text NOT NULL, email text NOT NULL, timezone text NOT NULL DEFAULT 'UTC',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(issuer,subject)
);
CREATE TABLE portal_sessions (
 token_hash text PRIMARY KEY, client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
 roles jsonb NOT NULL, id_token text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON portal_sessions(expires_at);
CREATE TABLE availability_windows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 CHECK(ends_at>starts_at), CHECK(ends_at-starts_at=interval '30 minutes'),
 EXCLUDE USING gist(tstzrange(starts_at,ends_at,'[)') WITH &&)
);
CREATE TABLE consultancy_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES client_profiles(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200), description text NOT NULL CHECK(length(description)<=4000),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','active','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_client ON consultancy_jobs(client_id,created_at DESC);
CREATE TABLE bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES consultancy_jobs(id),
 slot_id uuid NOT NULL REFERENCES availability_windows(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','cancelled','completed')),
 requested_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz, decided_by uuid REFERENCES client_profiles(id),
 CHECK(ends_at>starts_at), EXCLUDE USING gist(tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('approved','completed'))
);
CREATE INDEX bookings_job ON bookings(job_id);
CREATE UNIQUE INDEX one_pending_request ON bookings(job_id) WHERE status IN ('pending','approved');
CREATE TABLE messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 job_id uuid NOT NULL REFERENCES consultancy_jobs(id), sender_id uuid NOT NULL REFERENCES client_profiles(id),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), client_nonce uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sender_id,client_nonce)
);
CREATE INDEX messages_job ON messages(job_id,sequence);
CREATE TABLE event_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, aggregate_id uuid NOT NULL,
 payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending ON event_outbox(next_attempt_at) WHERE published_at IS NULL;
CREATE TABLE processed_events(id uuid PRIMARY KEY, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE portal_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES processed_events(id),
 client_id uuid NOT NULL REFERENCES client_profiles(id), job_id uuid NOT NULL REFERENCES consultancy_jobs(id),
 kind text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id,client_id)
);
CREATE TABLE platform_snapshots(id integer PRIMARY KEY CHECK(id=1), snapshot jsonb NOT NULL, generated_at timestamptz NOT NULL);
CREATE TABLE worker_heartbeat(id integer PRIMARY KEY CHECK(id=1), observed_at timestamptz NOT NULL);
CREATE TABLE api_rate_limits(key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);

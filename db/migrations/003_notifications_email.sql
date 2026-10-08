CREATE TABLE email_preferences (
 email text PRIMARY KEY,
 unsubscribe_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
 unsubscribed_at timestamptz
);
CREATE TABLE email_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dedupe_key text NOT NULL UNIQUE,
 email text NOT NULL REFERENCES email_preferences(email),
 kind text NOT NULL CHECK(kind IN ('welcome','account.login','message.created')),
 payload jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 skipped_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_pending ON email_deliveries(next_attempt_at) WHERE delivered_at IS NULL AND skipped_at IS NULL;
CREATE INDEX notification_inbox ON portal_notifications(client_id,created_at DESC);

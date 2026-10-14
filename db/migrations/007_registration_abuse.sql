CREATE TABLE registration_challenges (
 id uuid PRIMARY KEY, ip_hash text NOT NULL, challenge jsonb NOT NULL,
 expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE INDEX registration_challenges_expiry ON registration_challenges(expires_at);
CREATE TABLE registration_audit (
 id bigserial PRIMARY KEY, request_id uuid NOT NULL, email_hash text,
 ip inet NOT NULL, user_agent text NOT NULL, outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_audit_created ON registration_audit(created_at);
CREATE TABLE identity_mail_suppressions (
 email_hash text PRIMARY KEY, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity_mail_audit (
 id bigserial PRIMARY KEY, email_hash text NOT NULL, outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_mail_audit_created ON identity_mail_audit(created_at);

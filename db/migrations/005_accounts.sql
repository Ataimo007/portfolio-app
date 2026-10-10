ALTER TABLE client_profiles ADD COLUMN account_status text NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','disabled','closed','deleted'));
CREATE TABLE account_challenges (
 token_hash text PRIMARY KEY,
 client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('password','delete')),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_challenges_pending ON account_challenges(client_id,purpose,expires_at) WHERE consumed_at IS NULL;
CREATE TABLE account_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES client_profiles(id),
 actor_id uuid REFERENCES client_profiles(id),
 action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE portal_sessions ADD COLUMN identity_session_id text;

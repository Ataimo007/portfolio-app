"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2, UserRound } from "lucide-react";
import WorkspaceDevice from "./workspace-device";
import AccountSecurity from "./account-security";

type Profile = {
  name: string;
  email: string;
  company: string;
  phone: string;
  timezone: string;
  isOwner: boolean;
};

export default function ProfileSettings({
  user,
  busy,
  readOnly,
  onSave,
  onUpdated,
}: {
  user: Profile;
  busy: boolean;
  readOnly: boolean;
  onUpdated: () => void;
  onSave: (values: {
    company: string;
    phone: string;
    timezone: string;
  }) => void;
}) {
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <section className="profile-settings" aria-labelledby="profile-heading">
      <header className="profile-heading">
        <div>
          <h2 id="profile-heading">Your account.</h2>
          <p>A few details that make working together easier.</p>
        </div>
        {user.isOwner && (
          <Link className="button" href="/admin">
            Owner dashboard <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">
          {initials || <UserRound />}
        </div>
        <div className="profile-identity-copy">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
        <span className="profile-access">
          {user.isOwner
            ? "Owner account"
            : readOnly
              ? "Read-only account"
              : "Client account"}
        </span>
      </div>
      <div className="profile-layout">
        <div className="profile-main">
          <section
            className="workspace-panel profile-details"
            aria-labelledby="profile-details-heading"
          >
            <h3 id="profile-details-heading">Contact & scheduling</h3>
            <p>
              Keep your contact details and scheduling preferences up to date.
            </p>
            <form
              className="portal-form profile-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                onSave({
                  company: String(values.get("company") || ""),
                  phone: String(values.get("phone") || ""),
                  timezone: String(values.get("timezone") || user.timezone),
                });
              }}
            >
              <fieldset disabled={busy || readOnly}>
                <legend className="sr-only">
                  Contact details and time zone
                </legend>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label htmlFor="profile-company">
                      Company or organization <span>Optional</span>
                    </label>
                    <input
                      id="profile-company"
                      name="company"
                      autoComplete="organization"
                      maxLength={200}
                      defaultValue={user.company}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-phone">
                      Phone number <span>Optional</span>
                    </label>
                    <input
                      id="profile-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                      defaultValue={user.phone}
                    />
                  </div>
                  <div className="profile-field profile-timezone">
                    <label htmlFor="profile-timezone">
                      <Globe2 size={16} aria-hidden="true" /> Time zone
                    </label>
                    <select
                      id="profile-timezone"
                      name="timezone"
                      defaultValue={user.timezone}
                      aria-describedby="profile-timezone-help"
                    >
                      {[
                        ...new Set([
                          user.timezone,
                          ...Intl.supportedValuesOf("timeZone"),
                        ]),
                      ].map((zone) => (
                        <option key={zone} value={zone}>
                          {zone.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <p id="profile-timezone-help">
                      Consultation times are displayed in this time zone.
                    </p>
                  </div>
                </div>
              </fieldset>
              <div className="profile-form-footer">
                <p>
                  {readOnly
                    ? "Profile editing is unavailable for this account."
                    : "Your details stay in your private workspace."}
                </p>
                <button
                  className="button primary"
                  disabled={busy || readOnly}
                  aria-busy={busy}
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
          <AccountSecurity
            readOnly={readOnly}
            isOwner={user.isOwner}
            onUpdated={onUpdated}
          />
        </div>
        <aside
          className="profile-device"
          aria-label="App and device preferences"
        >
          <WorkspaceDevice />
        </aside>
      </div>
    </section>
  );
}

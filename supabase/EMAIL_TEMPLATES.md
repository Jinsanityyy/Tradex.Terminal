# Supabase Auth Email Templates

These templates **must** be configured in the Supabase Dashboard
(**Authentication → Email Templates**). They make every auth link use a
`token_hash` that points at our own `/auth/callback` route, which verifies the
token server-side via `verifyOtp`. This path does **not** require the PKCE
`code_verifier` stored in the browser that requested the link — so links open
correctly even when the email is tapped from the Gmail in-app browser on a
phone (a different browser context than where the request was made).

If a template instead uses the default `{{ .ConfirmationURL }}`, the link comes
back as `?code=...` (PKCE) and fails cross-browser with
`/login?error=link_expired`.

---

## Reset Password

Set the action link to:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

Example body:

```html
<h2>Reset your password</h2>
<p>Follow this link to choose a new password:</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
    Reset Password
  </a>
</p>
```

## Magic Link (used for passwordless sign-in, if enabled)

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard
```

## Confirm signup

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
```

---

### Why not `resetPasswordForEmail` default flow?

`resetPasswordForEmail` / `signInWithOtp` on a PKCE browser client store a
`code_verifier` in the requesting browser's `localStorage`. The default email
template returns a `?code=` link that can only be exchanged by that same
browser. On mobile the link opens in the mail app's in-app browser, where the
verifier is absent — so the exchange fails. The `token_hash` callback above
avoids PKCE entirely and is the supported cross-device pattern.

Make sure `${SITE_URL}/auth/callback` is in **Authentication → URL
Configuration → Redirect URLs**.

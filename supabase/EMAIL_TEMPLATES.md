# Supabase Auth Email Templates — reference

The **"Reset password"** template in the Supabase Dashboard
(**Authentication → Emails → Reset password**) is already branded and correct —
do **not** replace it. The password-reset flow uses `resetPasswordForEmail`
(see `src/app/login/page.tsx`), which sends *this* template.

The only thing that matters for cross-device reliability is the **link inside
the button**. It should point at our own `/auth/callback` route using
`token_hash`, so the link is verified server-side via `verifyOtp` and does
**not** depend on the PKCE `code_verifier` stored in the browser that requested
the reset (that verifier is missing when the link opens in the Gmail in-app
browser on mobile).

## Correct button link

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

If the button instead uses the default `{{ .ConfirmationURL }}`, the link comes
back as `?code=...` (PKCE) and fails cross-browser with
`/login?error=link_expired`. In that case, change only that one `href` — keep
the rest of the template as-is.

## Why the regression happened

The flow was switched from `resetPasswordForEmail` to `signInWithOtp`.
`signInWithOtp` sends Supabase's generic **"Magic Link"** template
("Follow this link to login"), not the branded "Reset password" one, and still
relies on PKCE. Reverting to `resetPasswordForEmail` restores the branded email
and the recovery flow.

Make sure `${SITE_URL}/auth/callback` is listed under
**Authentication → URL Configuration → Redirect URLs**.

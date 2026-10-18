<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All CRM data access goes through SECURITY DEFINER SQL functions (`supabase.rpc`) that resolve role/store from `auth.uid()`; tables have RLS with no client grants. Why: authorization and atomic business rules live in one server-side place, not in UI filters.
- Login uses usernames mapped to synthetic emails `<login>@crm.local`; there is no self-signup. Why: the spec requires individual credentials prepared by the researcher.
- Pure rule mirrors (business days, money in cents, phone normalization) live in `src/lib/crm-rules.ts` with tests; the database stays authoritative.

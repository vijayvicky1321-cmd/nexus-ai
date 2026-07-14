from app.core.auth import AuthContext


def scope_query(query, auth: AuthContext):
    # An active org means the row set is shared team data; no active org
    # means personal, private data — org_id must be explicitly null so a
    # personal-scope query never picks up rows created under an org.
    if auth.org_id:
        return query.eq("org_id", auth.org_id)
    return query.eq("user_id", auth.user_id).is_("org_id", "null")

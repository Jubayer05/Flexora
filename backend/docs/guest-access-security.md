# Guest Access Security Best Practices

- **Rate limit**: Limit code requests and verification attempts (e.g., max 5/hour/email+cartGroup).
- **Expiry**: Codes expire after 10–15 minutes. JWTs expire after 10–20 minutes.
- **Invalidate**: Mark code as verified after use. Do not allow reuse.
- **JWT**: Use minimal payload, short expiry, strong secret, and type=guest.
- **Restrict**: Guest JWT only allows order/item/invoice endpoints. No profile, wallet, coupons, or subscriptions.
- **Logging**: Log excessive attempts and suspicious activity.
- **Error messages**: Do not leak order info in errors.
- **Retries**: Lock out after too many failed attempts for a period.
- **Transport**: Always use HTTPS for all endpoints.

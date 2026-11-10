# Protected DigitalOcean staging deployment

The isolated droplet serves both the static UI and SecurePayAPI on
`https://staging.securepay.ke`. The TLS server keeps HTTP Basic Auth enabled
for the UI and API. Since Basic Auth and the API bearer token both use HTTP's
`Authorization` header, the staging browser client sends the bearer in
`X-SecurePay-Access-Token`; Nginx authenticates the browser first, clears
cookies, then maps that token to `Authorization` for the private API upstream.

Use `nginx-api-location.conf` inside the protected TLS server. The staging UI
build must use `VITE_SECUREPAY_MODE=real` and
`VITE_SECUREPAY_API_BASE_URL=https://staging.securepay.ke`. This direct transport
is allowed only when the page and API origin are exactly
`https://staging.securepay.ke`; Vercel preview deployments retain their
separate server-side allowlisted relay. Never add this configuration to the
production virtual host.

Deploy the UI with:

```sh
VITE_SECUREPAY_MODE=real \
VITE_SECUREPAY_API_BASE_URL=https://staging.securepay.ke \
npm run build
```

The API continues to own identity, access control, Agreement state, and all
other backend truth. Staging must remain isolated, use synthetic identities,
and keep real financial/provider execution disabled.

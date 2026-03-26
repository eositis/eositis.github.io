# eositis.github.io

## Hit logging (CSV)

All pages load `js/hit-tracker.js`, which sends a pageview event to the endpoint configured in each page:

- `data-endpoint="http://localhost:8787"`

To run a local logger that appends CSV rows:

```bash
node server/hit-logger.mjs
```

CSV output defaults to:

- `logs/hits.csv`

Optional environment variables:

- `PORT` (default `8787`)
- `HIT_LOG_CSV` (custom csv path)
- `ALLOWED_ORIGIN` (CORS origin, default `*`)

### Production note

For GitHub Pages, run `server/hit-logger.mjs` on a separate host and update each page's `data-endpoint` to that public HTTPS URL.
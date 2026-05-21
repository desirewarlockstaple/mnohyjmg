# TideGuard AI — Impact Report (template)

Template for quarterly impact reporting. Copy this file to
`docs/impact_report_YYYY_QN.md` at the start of each quarter and fill it in
honestly. **Do not inflate numbers.** Required by RELX and useful for all
seven prizes.

---

## Q? YYYY summary

> *One paragraph, plain English, what we actually accomplished this
> quarter. Not aspirational. Verifiable.*

## Headline numbers (this quarter)

| Metric | Value | Source |
|--------|------:|--------|
| New reporters onboarded |  | API `/admin/kpi` |
| Reports submitted |  | API `/admin/kpi` |
| Reports approved by moderator |  | API |
| Cleanup events run |  | API `/cleanups` |
| Mass collected (kg) |  | API |
| Lessons completed |  | API |
| New partner schools |  | LoS attached |
| Forecast skill vs persistence (RMSE %) |  | `apps/ml/baselines/benchmark.py` |
| Sentry incidents |  | Sentry dashboard |
| Median API latency (ms) |  | Logs |
| Training carbon footprint (kg CO₂e) |  | `codecarbon` logs |

## What worked

- *Bullet what worked.*

## What did not work

- *Bullet honest failures, with one-line explanation.*

## Lessons learned

- *Bullet what we will change next quarter.*

## Pilot photos (with consent)

> Captioned, attached, EXIF-stripped, faces blurred.

## Cleanups in detail

| Date | Location | Participants | kg | Approved-report photos |
|------|----------|-------------:|---:|------------------------|
|  |  |  |  |  |

## Open data release

- Citizen-report exports (anonymised, GeoJSON) at
  `data/exports/YYYY_QN_reports.geojson`.
- Tile cache at `data/exports/YYYY_QN_tiles/`.

## Next quarter targets

| Metric | Target |
|--------|-------:|
| Reporters |  |
| Reports approved |  |
| Cleanups |  |
| kg |  |
| Schools |  |

## Acknowledgements

Mentors, schools, donors, software contributors. List by name with consent.

— *Signed:* TideGuard AI team

# Data Ethics Policy

TideGuard AI processes geo-located photos and reports submitted primarily by
teenagers. This document formalises our ethical obligations.

## 1. Children's data

- TideGuard is designed for use by students aged 12–18.
- All photo uploads automatically have **EXIF metadata stripped** at the
  server, including GPS (which the API already uses for the report
  geolocation, then discards from the image file).
- Faces visible in photos are **not processed by any ML model** and will be
  blurred before any public display in future versions.
- Moderator approval is required before any report appears on the public map.

## 2. Consent

- Users must accept Terms of Service before their first report.
- Schools participating in the pilot sign a data-processing agreement
  (DPA) with parental opt-out.
- Users can delete all their reports at any time via the API
  (`DELETE /reports/mine`).

## 3. Data minimisation

We collect only what is needed:
- **Photo**: stored on encrypted R2 / S3, auto-deleted after 12 months.
- **GPS coordinates**: stored per report; never shared at precision
  finer than 100 m on the public map.
- **Email**: used only for authentication. Never shared externally.
- **XP / badges / progress**: functional data for the education module.

We do **not** collect: full name, home address, phone number, biometrics,
browsing behaviour, advertising IDs or device fingerprints.

## 4. Training data

Citizen reports (lat, lng, severity, debris_type, timestamp) are used
to train the PINN after moderator approval. Approved training points are:

- Anonymised (user ID replaced with a random UUID per export).
- Aggregated to 100 m grid before publication.
- Published quarterly in `data/exports/` under CC-BY-4.0.

## 5. GDPR and COPPA compliance

| Regulation | How we comply |
|------------|---------------|
| GDPR Art. 8 (child consent) | Age gate at sign-up; parental DPA in pilot schools |
| GDPR Art. 17 (right to erasure) | `DELETE /reports/mine` + cascading deletes |
| GDPR Art. 25 (privacy by design) | EXIF strip, minimal collection, encrypted storage |
| COPPA (US, <13) | Service restricted to 12+ by ToS; schools handle consent |

## 6. Dual-use risk

The prediction model shows where debris will accumulate. In theory this
information could be misused to plan illegal dumping. We consider this risk
low because:

1. The resolution (~5 km) is too coarse for precise targeting.
2. Hotspots are already public knowledge from past cleanups and satellite
   imagery.
3. The benefit of enabling legitimate cleanup planners far outweighs the
   marginal information gain for bad actors.

## 7. Contact

Ethics questions: **ethics@tideguard.app** or open a GitHub issue tagged
`data-ethics`.

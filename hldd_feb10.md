# OpenFit: Technical Architecture Guide
https://claude.ai/chat/fa47691e-dd91-4f58-967a-5cf480460b5f

## Synopsis

OpenFit is an open-source, device-agnostic fitness data aggregation platform. It ingests data from every major wearable and fitness service, normalizes it into a unified open schema, and provides cross-device analytics no single vendor can deliver. Users own their data. The core is self-hostable (AGPL). A hosted cloud tier funds development.

The wedge: users who own 2+ devices from different vendors (Garmin + Oura + Whoop + Apple Watch) currently have no unified view. OpenFit is that view — and it gets smarter as the community builds integrations.

Think Home Assistant for fitness data. Plugin architecture, API-first, cloud-optional.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  Web Dashboard (SPA)  ·  Mobile Apps  ·  CLI             │
└──────────────────────────┬──────────────────────────────┘
                           │ REST / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                      API Gateway                         │
│  Auth · Rate Limiting · Versioning · OpenAPI spec        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                     Core Services                        │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Ingestion│ │ Normalize│ │ Analytics│ │   Sync     │ │
│  │ Engine   │ │ Pipeline │ │ Engine   │ │   Manager  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │            │            │              │         │
│  ┌────▼────────────▼────────────▼──────────────▼──────┐ │
│  │              Unified Data Model                     │ │
│  │         (OpenFit Schema — published spec)           │ │
│  └────────────────────┬───────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   Integration Layer                      │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Garmin  │ │ Strava  │ │ Gadget-  │ │  File Import ││ │
│  │ Connect │ │  API    │ │ bridge   │ │ .FIT .GPX    ││ │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Polar  │ │  Oura   │ │  Health  │ │  Community   ││ │
│  │  Flow   │ │  Ring   │ │  Connect │ │  Plugins     ││ │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **API-first.** Every feature is an API endpoint before it's a UI element. The web dashboard and mobile apps are API consumers, not special citizens.
2. **Plugin architecture for integrations.** Adding a new data source should never require changes to core. Integrations are isolated modules with a defined interface.
3. **Normalize on ingest.** Raw vendor data is stored verbatim (provenance), then transformed into the unified schema. Analytics always operate on normalized data.
4. **Self-hostable by default.** Single `docker compose up`. No external dependencies beyond the container. Cloud tier adds convenience (managed hosting, push sync, backups), not features.
5. **Export everything, always.** Full data export in open formats at any time. No lock-in, ever.

---

## Unified Data Model (OpenFit Schema)

This is the most important deliverable. It must be published as an open spec from day one.

### Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `Activity` | A discrete exercise session | type, start/end time, source_device, metrics[], geo_track, raw_file_ref |
| `Metric` | A time-series health measurement | type (hr, steps, spo2, hrv, temp, weight, etc.), timestamp, value, source |
| `Sleep` | Sleep session with stages | start/end, stages[] (wake/light/deep/rem), scores, source |
| `Wellness` | Daily aggregate wellness data | date, resting_hr, hrv, stress, body_battery, weight, source |
| `TrainingLoad` | Computed training stress | date, load_type (acute/chronic), value, model_used |
| `Device` | Registered data source | type, vendor, model, integration_id |

### Design Constraints

- All timestamps UTC, ISO 8601.
- All metrics carry `source` (device + integration that produced them). Multiple sources for the same metric type are expected and explicitly supported.
- Raw vendor payloads stored as blobs alongside normalized data. Users can always access the original.
- Schema is versioned. Migrations are non-destructive.

---

## Integration SDK

### Integration Interface

Every integration implements this contract:

```
Integration {
  manifest: {
    id: string              // "garmin-connect", "oura-v2", etc.
    name: string
    version: semver
    auth_type: "oauth2" | "api_key" | "ble" | "file_import" | "none"
    data_types: string[]    // ["activity", "sleep", "metric:hr", "metric:steps"]
    sync_modes: ("poll" | "webhook" | "push")[]
  }

  authenticate(credentials) → AuthState
  sync(auth_state, last_sync_cursor) → SyncResult { items[], next_cursor }
  normalize(raw_item) → OpenFitEntity[]
  
  // Optional
  subscribe(auth_state, webhook_url) → SubscriptionHandle
  export(auth_state, entity) → VendorFormat
}
```

### Key Requirements

- Integrations run in isolated processes/containers. A buggy Garmin plugin cannot crash core.
- Sync is idempotent. Re-running sync for an already-ingested time range produces no duplicates.
- Rate limiting is integration-aware (Strava: 100 req/15min; Garmin: varies by endpoint).
- Credential storage is encrypted at rest. OAuth tokens are refreshed automatically.

### Priority Integrations (Launch)

| Priority | Integration | Sync Mode | Notes |
|----------|-------------|-----------|-------|
| P0 | File import (.FIT, .GPX, .TCX) | Manual upload | Works universally, no API dependency |
| P0 | Garmin Connect | OAuth2 + webhook | Largest serious athlete base |
| P0 | Strava | OAuth2 | Massive user base; activity-level data restricted by their policy — use for activity list + summary stats |
| P1 | Gadgetbridge | Local BLE bridge | Direct device sync, no cloud. Android only. Key privacy differentiator |
| P1 | Android Health Connect | On-device API | Platform-level aggregation on Android |
| P1 | Polar Flow | OAuth2 | Strong in running/cycling |
| P2 | Oura | OAuth2 | Sleep + recovery data |
| P2 | Whoop | OAuth2 | Recovery/strain |
| P2 | Suunto / Coros / Wahoo | OAuth2 | Athlete-focused brands |
| P2 | Apple Health | Export / HealthFit | iOS has no direct API access; use intermediary apps or XML export |

---

## API Design

RESTful, versioned, OpenAPI-specified. All responses JSON.

### Key Endpoints

```
# Auth
POST   /auth/register
POST   /auth/login
POST   /auth/token/refresh

# Integrations
GET    /integrations                    # List available integrations
POST   /integrations/{id}/connect       # Initiate OAuth / configure
POST   /integrations/{id}/sync          # Trigger manual sync
GET    /integrations/{id}/status        # Sync health, last sync time

# Activities
GET    /activities                      # List (filterable by date, type, source)
GET    /activities/{id}                 # Detail with full metrics
GET    /activities/{id}/streams         # Time-series data (hr, pace, power, gps)
POST   /activities/import               # File upload (.FIT, .GPX, .TCX)
DELETE /activities/{id}

# Metrics (time-series)
GET    /metrics/{type}                  # e.g., /metrics/resting_hr?from=&to=&sources=
GET    /metrics/correlate               # Cross-metric correlation query

# Sleep
GET    /sleep                           # List sleep sessions
GET    /sleep/{id}

# Wellness
GET    /wellness                        # Daily wellness aggregates

# Analytics
GET    /analytics/training-load         # Fitness/fatigue/form
GET    /analytics/trends                # Long-term trend analysis
GET    /analytics/cross-device          # Cross-source comparisons

# Export
GET    /export                          # Full account export (ZIP: JSON + original files)
GET    /export/activities/{id}.fit      # Single activity in FIT format

# Webhooks (for integrations pushing data in)
POST   /webhooks/{integration_id}
```

### Cross-Device Correlation API

This is the killer feature. Example query:

```
GET /metrics/correlate?
  metrics=resting_hr,hrv,sleep_score,training_load&
  from=2025-01-01&to=2026-01-01&
  resolution=daily&
  normalize=true
```

Returns aligned, normalized time-series from multiple sources, ready to chart or analyze. The normalization layer handles different sampling rates, missing data, and vendor-specific scoring differences.

---

## Analytics Engine

### Built-in Analytics

| Feature | Description |
|---------|-------------|
| Training load (ATL/CTL/TSB) | Acute/chronic training load and form, computed from any activity with HR or power data |
| Fitness trend | Long-term fitness trajectory across all activity types |
| Recovery correlation | Correlate sleep quality, HRV, and resting HR with training volume |
| Cross-device normalization | Align and compare metrics from different devices (e.g., Garmin vs Oura resting HR) |
| Anomaly detection | Flag unusual readings (sudden HR spike, abnormal sleep pattern) |
| Personal records | PRs across all activities and sources, unified |

### Extensibility

Analytics are modular. Community can contribute analysis modules that plug into the pipeline without modifying core. Input: normalized data via the API. Output: computed metrics stored back via the API.

---

## Data Storage

### Requirements

- Time-series optimized for metric queries (potentially millions of HR data points per user).
- Relational for entities, user management, integration state.
- Blob storage for raw files (.FIT, .GPX originals).
- Full-text search for activity names/notes.
- Must work in single-container self-hosted mode AND scale for cloud tier.

### Guidance (Not Prescriptive)

Team should evaluate based on operational complexity. A pragmatic starting point: single relational DB (Postgres) with TimescaleDB extension for time-series, local filesystem for blobs (S3-compatible for cloud tier). Avoid premature microservice decomposition — monolith with clean internal boundaries first.

---

## Deployment

### Self-Hosted (Primary)

```yaml
# Target: single docker compose file
services:
  openfit:
    image: openfit/openfit:latest
    ports: ["8080:8080"]
    volumes:
      - ./data:/data
    environment:
      - DATABASE_URL=postgres://...
  db:
    image: timescale/timescaledb:latest
```

One command. No external dependencies. Works on a Raspberry Pi 4.

### Cloud Tier

Same codebase, deployed as a multi-tenant managed service. Adds: managed auth (SSO), automatic sync scheduling, push notifications, encrypted cloud backups, shareable dashboard links.

---

## Security

- All API endpoints authenticated (JWT). API keys for programmatic access.
- Integration credentials encrypted at rest (AES-256 or equivalent).
- No telemetry, no analytics collection, no tracking in the self-hosted version. Cloud tier collects only what's needed for service operation (usage metrics, not fitness data).
- HTTPS everywhere. HSTS. CSP headers.
- Rate limiting per-user and per-integration.
- RBAC for multi-user instances (household/coach scenarios).

---

## Open Standards & Community

- **Schema spec published** as a standalone document (OpenFit Schema v1.0), versioned independently from the software. Invite community RFC process for schema evolution.
- **Integration SDK published** as a standalone package with documentation, example integrations, and a test harness.
- **AGPL license** for core (ensures derivative works remain open). Integration SDK under MIT (allows proprietary integrations if vendors want to build official ones).
- **Contributor guidelines** from day one. Code of conduct. Clear PR review process. Responsive maintainers.

---

## Non-Goals (Explicit)

- **Not a social network.** No feeds, kudos, segments, or leaderboards in v1. Coexist with Strava for social.
- **Not a training plan builder.** Analytics and insights, not coaching. Leave that to purpose-built tools or future community plugins.
- **Not hardware.** Software only. Hardware comes later, driven by user demand and platform maturity.
- **Not a mobile-first app.** Web-first with responsive design. Native mobile apps are important but secondary to getting the API and data layer right.
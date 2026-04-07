# Kafka Events Design — Activity Planner

## 1. Topics

| Topic | Key | Partitions | Retention | Compaction |
|---|---|---|---|---|
| `users.events.v1` | `userId` | 3 | 7 days | No |
| `activities.events.v1` | `activityId` | 3 | 7 days | No |
| `plans.events.v1` | `userId` | 3 | 7 days | No |
| `notifications.events.v1` | `userId` | 3 | 7 days | No |

**Key / Partitioning rationale:**
- Keying by `userId` on `users.events.v1` and `plans.events.v1` guarantees all events for the same user land on the same partition → total ordering per user.
- Keying by `activityId` on `activities.events.v1` preserves per-activity ordering.
- 3 default partitions for dev; scale to 12–30 per topic in production based on TPS (see §6).

---

## 2. Event Envelope

Every event is a JSON object with this structure. No field is optional.

```json
{
  "eventId":      "<UUID v4>",
  "type":         "<EventType>",
  "occurredAt":   "<ISO-8601 UTC e.g. 2026-03-23T10:00:00Z>",
  "traceId":      "<UUID — propagated from HTTP X-Trace-ID header or generated>",
  "sourceService":"<service name string>",
  "data":         { ... event-specific payload ... }
}
```

### Backward-compatibility rules

- **Add** new optional fields to `data` → backward-compatible.
- **Remove** or **rename** existing fields → bump to `v2` topic.
- Consumers should ignore unknown fields in `data` (permissive deserialization).
- Schema evolution path: JSON Schema (current) → Confluent Schema Registry + Avro (future). The `EventEnvelope` class is the single seam — only change serialization there.

---

## 3. Event Types & Schemas

### 3.1 `UserRegistered` — topic `users.events.v1`

Emitted by: `auth-service` after a new user row is inserted.

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "UserRegistered",
  "occurredAt": "2026-03-23T10:00:00Z",
  "traceId": "b9c2d1e0-1234-5678-abcd-000000000001",
  "sourceService": "auth-service",
  "data": {
    "userId": "d4e5f6a7-...",
    "email": "alice@example.com",
    "name": "Alice",
    "role": "USER"
  }
}
```

**Consumed by:** `user-service` → creates `user_profiles` row.

---

### 3.2 `ActivityCreated` — topic `activities.events.v1`

Emitted by: `activity-service` after INSERT.

```json
{
  "eventId": "...",
  "type": "ActivityCreated",
  "occurredAt": "2026-03-23T11:00:00Z",
  "traceId": "...",
  "sourceService": "activity-service",
  "data": {
    "activityId": "...",
    "name": "Morning Yoga",
    "category": "Fitness",
    "duration": 60,
    "location": "Central Park",
    "maxParticipants": 20
  }
}
```

### 3.3 `ActivityUpdated` — topic `activities.events.v1`

Same shape as `ActivityCreated`, `type` = `"ActivityUpdated"`.

### 3.4 `ActivityDeleted` — topic `activities.events.v1`

```json
{
  "data": { "activityId": "..." }
}
```

---

### 3.5 `PlanCreated` — topic `plans.events.v1`

Emitted by: `planner-service` via the **outbox pattern** (see §4).

```json
{
  "eventId": "...",
  "type": "PlanCreated",
  "occurredAt": "2026-03-23T12:00:00Z",
  "traceId": "...",
  "sourceService": "planner-service",
  "data": {
    "planId": "...",
    "userId": "...",
    "activityId": "...",
    "activityName": "Morning Yoga",
    "scheduledDate": "2026-03-25",
    "scheduledTime": "07:00:00",
    "status": "SCHEDULED",
    "notes": "Bring a mat"
  }
}
```

**Consumed by:** `notification-service` → creates a `notifications` row.

### 3.6 `PlanUpdated` — topic `plans.events.v1`

Same shape as `PlanCreated`, `type` = `"PlanUpdated"`.

### 3.7 `PlanCancelled` — topic `plans.events.v1`

```json
{
  "data": {
    "planId": "...",
    "userId": "...",
    "reason": "user-initiated"
  }
}
```

---

## 4. Outbox Pattern (planner-service)

The `planner-service` writes plan rows and outbox rows in a **single DB transaction**, decoupling HTTP latency from Kafka availability.

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────┐
│  MySQL TRANSACTION                  │
│  INSERT INTO plans (...)            │
│  INSERT INTO outbox_events (...)    │
└─────────────────────────────────────┘
         │
         │  periodic (every 5 s)
         ▼
    OutboxDispatcher
         │
         ├──► KafkaProducer.send(...)
         │
         └──► UPDATE outbox_events SET published_at = NOW()
```

**Gap documentation:** Auth-service and activity-service use **best-effort direct publish** (no outbox). If Kafka is down at publish time, up to 3 retries with exponential backoff are attempted; on exhaustion the event is lost. To harden these services, apply the same outbox pattern.

---

## 5. Idempotency

### Producer side
- All events carry a unique `eventId` (UUID).
- Planner uses outbox → no duplicate publishes (published_at guards).

### Consumer side
All consumers guard with the `consumed_events` table:

```sql
-- Per consumer_group, per eventId — atomic dedup check inside the DB transaction
INSERT IGNORE INTO consumed_events (event_id, consumer_group) VALUES (?, ?);
-- rowCount() == 0 means already processed → skip
```

---

## 6. Scaling & Ordering Notes

| Topic | Recommended prod partitions | Notes |
|---|---|---|
| `users.events.v1` | 6 | Low TPS, 6 is ample |
| `activities.events.v1` | 6 | Low TPS |
| `plans.events.v1` | 12–30 | Medium TPS, key = userId preserves per-user order |

**Adding partitions** does not redistribute existing data; only new messages land on new partitions. Reassign consumer group offsets with `rpk topic alter-config` or the Kafka Admin API.

---

## 7. Future: Switch to Avro

1. Add Confluent/Apicurio Schema Registry to Docker Compose.
2. Replace `EventEnvelope.java` serialization with `GenericRecord` / Avro `Schema.Parser`.
3. Change `value.serializer` / `value.deserializer` to `KafkaAvroSerializer/Deserializer`.
4. Register schemas per topic in the registry.

No other code changes required because `EventPublisher.publish()` and the consumer `handler` are the only I/O seams.

---

## 8. Security: PLAINTEXT → SASL_SSL

Local dev uses `PLAINTEXT`. To switch to `SASL_SSL`:

```bash
# In KafkaConfig.java, change KAFKA_SECURITY_PROTOCOL env to SASL_SSL
# Add env vars:
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=activity-planner
KAFKA_SASL_PASSWORD=<secret>
KAFKA_SSL_TRUSTSTORE_PATH=/certs/truststore.jks
KAFKA_SSL_TRUSTSTORE_PASSWORD=<secret>
```

These are read in `KafkaConfig.java` under the `SASL_SSL` branch.

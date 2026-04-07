# Run Locally with Kafka (Redpanda)

## Prerequisites
- Docker Desktop 4.x
- Docker Compose v2
- `rpk` CLI (optional but useful): https://docs.redpanda.com/current/get-started/rpk-install/

---

## 1. Start the full stack

```bash
cd Activity_Planner1
docker compose up --build
```

Services start in this order:
1. **mysql** — waits for healthcheck
2. **redpanda** — waits for healthcheck
3. **auth-service, user-service, activity-service, planner-service, notification-service** — wait for both mysql and redpanda
4. **api-gateway** — waits for all services

---

## 2. Environment variables (all services)

| Variable | Default | Purpose |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `redpanda:9092` | Kafka bootstrap address |
| `KAFKA_SECURITY_PROTOCOL` | `PLAINTEXT` | Security protocol |
| `KAFKA_CLIENT_ID` | `<service-name>` | Producer/consumer client ID |

These are already set in `docker-compose.yml`. For local IDE runs without Docker, export:

```bash
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export DB_HOST=localhost
export DB_USER=activity_user
export DB_PASSWORD=DB_Password
```

---

## 3. Verify Kafka is up

```bash
# Using rpk (if installed):
rpk cluster info --brokers localhost:9092

# Or via Docker exec:
docker exec -it activity_planner1-redpanda-1 rpk cluster info
```

---

## 4. List and inspect topics

Topics are **auto-created** on first event publication. To inspect them:

```bash
# List all topics
docker exec activity_planner1-redpanda-1 rpk topic list

# Expected topics after first events:
# users.events.v1
# activities.events.v1
# plans.events.v1
```

---

## 5. Tail a topic (live)

```bash
# Tail users.events.v1 (from beginning)
docker exec activity_planner1-redpanda-1 \
  rpk topic consume users.events.v1 --brokers localhost:9092 --offset start

# Tail plans.events.v1
docker exec activity_planner1-redpanda-1 \
  rpk topic consume plans.events.v1 --brokers localhost:9092 --offset start
```

---

## 6. Trigger events manually

### Register a user → produces UserRegistered
```bash
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","name":"Test User"}' | jq
```

Check `user_profiles` was created by the consumer (give it ~2 s):
```bash
docker exec activity_planner1-mysql-1 \
  mysql -u activity_user -pDB_Password activity_planner \
  -e "SELECT * FROM user_profiles;"
```

### Create a plan → produces PlanCreated (via outbox)
```bash
# First get a userId from the JWT (sub field) and an activityId
curl -s -X POST http://localhost:8080/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"<userId>",
    "activityId":"<activityId>",
    "activityName":"Morning Yoga",
    "scheduledDate":"2026-04-01",
    "scheduledTime":"07:00:00",
    "notes":"Bring a mat"
  }' | jq
```

After ~5 s (outbox dispatcher interval), a `notifications` row should appear:
```bash
docker exec activity_planner1-mysql-1 \
  mysql -u activity_user -pDB_Password activity_planner \
  -e "SELECT * FROM notifications;"
```

---

## 7. Check outbox table (planner-service)

```bash
docker exec activity_planner1-mysql-1 \
  mysql -u activity_user -pDB_Password activity_planner \
  -e "SELECT id, type, published_at FROM outbox_events ORDER BY created_at DESC LIMIT 10;"
```

`published_at` is `NULL` for pending rows and set to a timestamp once published.

---

## 8. Check dedup table

```bash
docker exec activity_planner1-mysql-1 \
  mysql -u activity_user -pDB_Password activity_planner \
  -e "SELECT * FROM consumed_events ORDER BY processed_at DESC LIMIT 20;"
```

---

## 9. Produce a test event manually (simulate replay)

```bash
# Using rpk to produce a raw JSON message to plans.events.v1
docker exec -i activity_planner1-redpanda-1 \
  rpk topic produce plans.events.v1 --brokers localhost:9092 <<'EOF'
{"eventId":"test-replay-001","type":"PlanCreated","occurredAt":"2026-03-23T10:00:00Z","traceId":"trace-001","sourceService":"planner-service","data":{"planId":"p1","userId":"u1","activityId":"a1","activityName":"Yoga","scheduledDate":"2026-04-01","scheduledTime":"07:00:00","status":"SCHEDULED","notes":""}}
EOF
```

Verify `notification-service` log shows "Skipping duplicate event" on second send.

---

## 10. Stop and clean up

```bash
docker compose down -v   # removes volumes including MySQL data
```

Or keep data:
```bash
docker compose down      # containers removed, volumes preserved
```

# Kafka on Kubernetes — Dev & Production Notes

## 1. Dev Setup (minikube / kind)

The file `k8s/kafka.yaml` deploys a **single-node Redpanda** StatefulSet. This is suitable for local K8s dev only.

```bash
# Start minikube
minikube start --memory=4096 --cpus=2

# Deploy Kafka (Redpanda single-node)
kubectl apply -f k8s/kafka.yaml

# Wait for Redpanda to be ready
kubectl rollout status statefulset/redpanda

# Deploy all services
kubectl apply -f k8s/
```

### Bootstrap address (in-cluster)
```
PLAINTEXT://kafka:9092
```

All service Deployments reference this via the `KAFKA_BOOTSTRAP_SERVERS` env var in their `k8s/*.yaml` files.

---

## 2. Verify Kafka inside K8s

```bash
# Exec into the Redpanda pod
kubectl exec -it redpanda-0 -- rpk cluster info

# List topics
kubectl exec -it redpanda-0 -- rpk topic list

# Tail a topic
kubectl exec -it redpanda-0 -- rpk topic consume plans.events.v1 --offset start
```

---

## 3. Connecting from outside the cluster (dev)

```bash
kubectl port-forward svc/kafka 9092:9092
# Then use: KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

---

## 4. Production Hardening

### 4.1 Use Strimzi (recommended)

Strimzi provides Kafka as CRDs, handling rolling upgrades, TLS, SASL, and persistence.

```bash
# Install Strimzi operator
kubectl create namespace kafka
kubectl apply -f https://strimzi.io/install/latest?namespace=kafka -n kafka

# Then apply k8s/strimzi-kafka.yaml (see §4.2)
```

A production `Kafka` CRD with 3 brokers and TLS:
```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: activity-planner
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: scram-sha-512
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: jbod
      volumes:
        - id: 0
          type: persistent-claim
          size: 50Gi
          deleteClaim: false
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      deleteClaim: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

Bootstrap address when using Strimzi:
```
KAFKA_BOOTSTRAP_SERVERS=activity-planner-kafka-bootstrap.kafka:9092
```

### 4.2 KafkaTopic CRDs (Strimzi)

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: users-events-v1
  namespace: kafka
  labels:
    strimzi.io/cluster: activity-planner
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 604800000   # 7 days
    cleanup.policy: delete
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: plans-events-v1
  namespace: kafka
  labels:
    strimzi.io/cluster: activity-planner
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000
    cleanup.policy: delete
```

### 4.3 SASL_SSL configuration

Update the ConfigMap `kafka-config` in each service Deployment:
```yaml
env:
  - name: KAFKA_BOOTSTRAP_SERVERS
    value: "activity-planner-kafka-bootstrap.kafka:9093"
  - name: KAFKA_SECURITY_PROTOCOL
    value: "SASL_SSL"
  - name: KAFKA_SASL_MECHANISM
    value: "SCRAM-SHA-512"
  - name: KAFKA_SASL_USERNAME
    valueFrom:
      secretKeyRef:
        name: kafka-credentials
        key: username
  - name: KAFKA_SASL_PASSWORD
    valueFrom:
      secretKeyRef:
        name: kafka-credentials
        key: password
```

Create the secret:
```bash
kubectl create secret generic kafka-credentials \
  --from-literal=username=activity-planner \
  --from-literal=password=<strong-password>
```

### 4.4 ACLs

Use Strimzi `KafkaUser` CRDs to scope permissions per service:
```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: auth-service
  namespace: kafka
  labels:
    strimzi.io/cluster: activity-planner
spec:
  authentication:
    type: scram-sha-512
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: users.events.v1
        operation: Write
```

### 4.5 Quotas (prevent runaway producers)

```bash
kafka-configs.sh --bootstrap-server kafka:9092 \
  --alter --add-config 'producer_byte_rate=1048576,consumer_byte_rate=2097152' \
  --entity-type users --entity-name activity-planner
```

---

## 5. Checklist: Dev → Production

| Item | Dev (Redpanda single-node) | Production |
|---|---|---|
| Brokers | 1 | ≥ 3 |
| Replication factor | 1 | 3 |
| Authentication | PLAINTEXT | SASL_SSL / mTLS |
| ACLs | None | Per service |
| Persistence | EmptyDir | PVC (50 Gi+) |
| Monitoring | None | Prometheus + Kafka Exporter |
| Topic management | Auto-create | Strimzi KafkaTopic CRDs |
| Schema enforcement | None | Confluent/Apicurio Registry |

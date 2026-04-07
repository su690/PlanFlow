🗂️ Activity Planner – Vert.x Microservices Architecture

This repository contains a fully modular Activity Planner application built using Eclipse Vert.x and a microservices architecture.
It includes independent services for authentication, user management, planning, activities, notifications, and a separate API gateway — all orchestrated with Docker and Kubernetes.
The project demonstrates modern backend engineering concepts such as reactive programming, non‑blocking I/O, distributed services, scalability, and containerized deployment.

🚀 Key Highlights
🔹 Microservices Included
The project is organized into multiple standalone services:

activity-service – Manage activities and related operations
planner-service – Handle planning, scheduling, and task timelines
user-service – User registration, profiles, and information retrieval
auth-service – Authentication & JWT-based authorization
notification-service – Event‑based notifications
api-gateway – Central gateway routing client requests to microservices
frontend – UI layer (if implemented)
mysql – Database configuration & migration scripts
k8s/ – Kubernetes deployment manifests


⚡ Why Vert.x?
This project uses Eclipse Vert.x to build reactive microservices because it offers:

Non‑blocking, event‑driven architecture
High throughput and low resource usage
Polyglot support (Java/Kotlin)
Verticles for clean service separation
Event Bus for fast internal communication


🏗️ Tech Stack

LayerTechnologyFrameworkEclipse Vert.xLanguageJava (or Kotlin)GatewayAPI Gateway (Vert.x Web)DatabaseMySQLContainerizationDocker, docker‑composeOrchestrationKubernetes (k8s manifests included)AuthJWT, token-based validation

📚 Project Structure
Activity_Planner_Microservices_vert.x/
 ├── activity-service/
 ├── api-gateway/
 ├── auth-service/
 ├── frontend/
 ├── k8s/
 ├── mysql/
 ├── notification-service/
 ├── planner-service/
 ├── user-service/
 ├── docker-compose.yml
 ├── TODO.md
 ├── TODO_MySQL_Migration.md


🧩 Core Features
✅ Create and manage activities
✅ Schedule and plan tasks
✅ Notification triggers
✅ Auth & User management
✅ Independent microservices
✅ RESTful API endpoints
✅ Centralized API gateway
✅ DB containerization with MySQL
✅ Kubernetes-ready deployment

🐳 Docker Support
A fully prepared docker-compose.yml allows you to:

Build and run all microservices
Spin up a MySQL instance
Test the entire system locally

Just run:
Shelldocker-compose up --buildShow more lines

☸️ Kubernetes Deployment
The k8s/ folder contains YAML manifests for:

Deployments
Services
ConfigMaps
Secrets
Ingress

This lets you deploy the entire system on any Kubernetes cluster.

🎯 Purpose of This Project
This project is perfect for:

Learning microservices using Vert.x
Practicing event‑driven architecture
Showcasing backend engineering skills
Deployment training with Docker/K8s
Real‑world portfolio demonstration


If you want, I can also generate:
✅ Individual README files for each service
✅ Architecture diagram (PNG/SVG)
✅ API documentation (OpenAPI/Swagger)
✅ Contribution guidelines
✅ Git commit message template

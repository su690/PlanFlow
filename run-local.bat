@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-21
REM Skip Docker/Kafka, run frontend + backends only (DB ops will log errors)

set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=activity_planner
set DB_USER=activity_user
set DB_PASSWORD=%DB_Password%
set KAFKA_BOOTSTRAP_SERVERS=localhost:9092

echo Building services...

cd auth-service
mvnw.cmd clean package -DskipTests
cd ..

cd user-service
mvnw.cmd clean package -DskipTests
cd ..

cd activity-service
mvnw.cmd clean package -DskipTests
cd ..

cd planner-service
mvnw.cmd clean package -DskipTests
cd ..

cd notification-service
mvnw.cmd clean package -DskipTests
cd ..

cd api-gateway
mvnw.cmd clean package -DskipTests
cd ..

echo Starting services in separate terminals...

start "auth-service" cmd /k "cd auth-service && mvnw.cmd exec:java"
start "user-service" cmd /k "cd user-service && mvnw.cmd exec:java"
start "activity-service" cmd /k "cd activity-service && mvnw.cmd exec:java"
start "planner-service" cmd /k "cd planner-service && mvnw.cmd exec:java"
start "notification-service" cmd /k "cd notification-service && mvnw.cmd exec:java"
start "api-gateway" cmd /k "cd api-gateway && mvnw.cmd exec:java"

start "frontend" cmd /k "cd frontend && npm start"

echo All terminals opened. Check ports: gateway 8080, frontend 3000.
echo Access: http://localhost:3000
echo Close terminals to stop.

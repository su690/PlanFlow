-- Activity Planner Database Initialization Script
-- MySQL 8.0

USE activity_planner;

-- Users table for auth-service
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User profiles table for user-service
-- NOTE: user_id has a UNIQUE constraint so the consumer can upsert idempotently
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_profiles_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table for activity-service
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    duration INT DEFAULT 60,
    location VARCHAR(255),
    max_participants INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Plans table for planner-service
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    activity_id VARCHAR(36) NOT NULL,
    activity_name VARCHAR(255),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Notifications table for notification-service
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Kafka / Eventing Tables ───────────────────────────────────────────────

-- Transactional outbox for planner-service.
-- plan + outbox row are written in a single DB transaction.
-- OutboxDispatcher polls this table and publishes pending rows.
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(36) PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL COMMENT 'e.g. Plan',
    aggregate_id   VARCHAR(36)  NOT NULL COMMENT 'planId',
    type           VARCHAR(100) NOT NULL COMMENT 'e.g. PlanCreated',
    payload        JSON         NOT NULL COMMENT 'full event envelope JSON',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    published_at   TIMESTAMP    NULL     COMMENT 'set by OutboxDispatcher on success',
    INDEX idx_outbox_unpublished (published_at, created_at)
);

-- Event deduplication table shared by all consumers.
-- Primary key (event_id, consumer_group) ensures each service
-- processes each event exactly once even on replay.
CREATE TABLE IF NOT EXISTS consumed_events (
    event_id       VARCHAR(36)  NOT NULL,
    consumer_group VARCHAR(100) NOT NULL COMMENT 'e.g. user-service, notification-service',
    processed_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, consumer_group)
);

-- ─── Seed Data ─────────────────────────────────────────────────────────────

-- Insert default users for auth-service
INSERT INTO users (id, email, password, name, role) VALUES
(UUID(), 'admin@activity.com', 'admin123', 'Admin User', 'ADMIN'),
(UUID(), 'user@activity.com',  'user123',  'Regular User', 'USER')
ON DUPLICATE KEY UPDATE email = email;

-- Insert sample activities
INSERT INTO activities (id, name, description, category, duration, location, max_participants) VALUES
(UUID(), 'Morning Yoga',            'Start your day with yoga and meditation',  'Fitness',      60,  'Central Park',      20),
(UUID(), 'Team Building Workshop',  'Interactive team building exercises',       'Professional', 180, 'Conference Room A', 30)
ON DUPLICATE KEY UPDATE name = name;

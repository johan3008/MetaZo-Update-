-- Schema for Cloudflare D1 SQLite Database
-- Initialize tables with: wrangler d1 execute <database-name> --file=./schema.sql

-- 1. Users Table (Matches Firebase Auth + Users collection)
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    license_key TEXT,
    trial_start TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Daily Usage Tracking Table (Replaces nested Firestore map)
CREATE TABLE IF NOT EXISTS daily_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    date_str TEXT NOT NULL,
    tool_type TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    UNIQUE(uid, date_str, tool_type),
    FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 3. Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    uid TEXT PRIMARY KEY,
    gemini_api_key TEXT,
    groq_api_key TEXT,
    mistral_api_key TEXT,
    openai_api_key TEXT,
    openrouter_api_key TEXT,
    blackbox_api_key TEXT,
    nvidia_api_key TEXT,
    bluesminds_api_key TEXT,
    aivene_api_key TEXT,
    ai_provider TEXT DEFAULT 'gemini',
    mz_gemini_model TEXT,
    mz_groq_model TEXT,
    mz_nvidia_model TEXT,
    mz_aivene_model TEXT,
    ui_language TEXT DEFAULT 'en',
    keyword_mode TEXT DEFAULT 'commercial',
    title_length TEXT DEFAULT 'medium',
    metadata_language TEXT DEFAULT 'en',
    FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 4. License Keys Table (Matches 'keys' collection)
CREATE TABLE IF NOT EXISTS license_keys (
    key TEXT PRIMARY KEY,
    activated INTEGER DEFAULT 0, -- 0 = false, 1 = true
    activated_by TEXT,
    activated_at TEXT,
    duration_days INTEGER DEFAULT 30,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(activated_by) REFERENCES users(uid)
);

-- 5. Promo Codes Table (Matches 'promos' collection)
CREATE TABLE IF NOT EXISTS promos (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'discount' or 'premium'
    value INTEGER NOT NULL, -- discount percent or premium days
    activated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Global Chat Messages Table (Matches 'global_messages' collection)
CREATE TABLE IF NOT EXISTS global_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    sender_uid TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(sender_uid) REFERENCES users(uid)
);

-- 7. Direct Chats Table (Matches 'chats' collection)
CREATE TABLE IF NOT EXISTS direct_chats (
    room_id TEXT PRIMARY KEY,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    last_message TEXT,
    timestamp INTEGER,
    FOREIGN KEY(user1) REFERENCES users(uid),
    FOREIGN KEY(user2) REFERENCES users(uid)
);

-- 8. Direct Chat Messages Table (Matches sub-collection 'messages')
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    text TEXT NOT NULL,
    sender_uid TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(room_id) REFERENCES direct_chats(room_id) ON DELETE CASCADE,
    FOREIGN KEY(sender_uid) REFERENCES users(uid)
);

-- 9. Feedback Table (Matches 'feedback' collection)
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    user_email TEXT,
    user_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index optimization for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_usage_uid ON daily_usage(uid);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_global_messages_time ON global_messages(timestamp DESC);

CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    uid text,
    email text,
    "displayName" text,
    "licenseKey" text,
    "cancelledSubscription" boolean,
    "trialStart" text,
    "lastSeen" text,
    "updatedAt" text,
    "dailyUsage" jsonb,
    "settings" jsonb
);

CREATE TABLE IF NOT EXISTS public.keys (
    key text PRIMARY KEY,
    id text,
    activated boolean,
    "activatedBy" text,
    "firstActivatedBy" text,
    "activatedAt" text,
    duration text,
    "createdAt" text
);

CREATE TABLE IF NOT EXISTS public.promos (
    id text PRIMARY KEY,
    code text,
    type text,
    value text,
    "usedCount" numeric,
    "maxUses" numeric,
    "createdAt" text,
    "startDate" text,
    "endDate" text
);

CREATE TABLE IF NOT EXISTS public.chats (
    id text PRIMARY KEY,
    user1 text,
    user2 text,
    "user1Email" text,
    "user2Email" text,
    "user1Name" text,
    "user2Name" text,
    "lastMessage" text,
    "lastUpdated" text
);

CREATE TABLE IF NOT EXISTS public.global_messages (
    id text PRIMARY KEY,
    "senderUid" text,
    "senderEmail" text,
    "senderName" text,
    text text,
    timestamp text
);

CREATE TABLE IF NOT EXISTS public.messages (
    id text PRIMARY KEY,
    "roomId" text,
    "senderUid" text,
    "senderEmail" text,
    "senderName" text,
    text text,
    timestamp text
);

CREATE TABLE IF NOT EXISTS public.feedback (
    id bigserial PRIMARY KEY,
    message text,
    timestamp text,
    user_email text
);

CREATE TABLE IF NOT EXISTS public.backups (
    id text PRIMARY KEY,
    uid text,
    name text,
    data jsonb,
    "createdAt" text
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;

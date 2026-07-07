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

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos DISABLE ROW LEVEL SECURITY;

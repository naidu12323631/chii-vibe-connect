-- chillout schema for SQL Server (replaces the Supabase/Postgres schema).
-- Batches are separated by `GO`. db.js splits on GO and runs each batch.
-- Arrays (interests/availability) are stored as JSON text and (de)serialized in the API layer.

IF OBJECT_ID('dbo.users', 'U') IS NULL
CREATE TABLE dbo.users (
  id            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  email         NVARCHAR(255)    NOT NULL,
  password_hash NVARCHAR(255)    NOT NULL,
  created_at    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_users_email UNIQUE (email)
);
GO

IF OBJECT_ID('dbo.profiles', 'U') IS NULL
CREATE TABLE dbo.profiles (
  id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY
                 REFERENCES dbo.users(id) ON DELETE CASCADE,
  display_name NVARCHAR(100),
  avatar_url   NVARCHAR(1000),
  bio          NVARCHAR(1000),
  interests    NVARCHAR(MAX)    NOT NULL DEFAULT '[]',
  availability NVARCHAR(MAX)    NOT NULL DEFAULT '[]',
  created_at   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.plans', 'U') IS NULL
CREATE TABLE dbo.plans (
  id               UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  user_id          UNIQUEIDENTIFIER NOT NULL
                     REFERENCES dbo.users(id) ON DELETE CASCADE,
  title            NVARCHAR(200)    NOT NULL,
  description      NVARCHAR(MAX),
  location         NVARCHAR(300),
  plan_time        DATETIME2,
  max_participants INT              NOT NULL DEFAULT 4,
  created_at       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Note: user_id here intentionally has no FK to users. SQL Server forbids
-- multiple cascade paths (user -> plans -> participants AND user -> participants),
-- so membership rows are cleaned up in the API when a user/plan is removed.
IF OBJECT_ID('dbo.plan_participants', 'U') IS NULL
CREATE TABLE dbo.plan_participants (
  id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  plan_id    UNIQUEIDENTIFIER NOT NULL
               REFERENCES dbo.plans(id) ON DELETE CASCADE,
  user_id    UNIQUEIDENTIFIER NOT NULL,
  created_at DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_plan_user UNIQUE (plan_id, user_id)
);
GO

IF OBJECT_ID('dbo.plan_messages', 'U') IS NULL
CREATE TABLE dbo.plan_messages (
  id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  plan_id    UNIQUEIDENTIFIER NOT NULL
               REFERENCES dbo.plans(id) ON DELETE CASCADE,
  user_id    UNIQUEIDENTIFIER NOT NULL,
  content    NVARCHAR(2000)   NOT NULL,
  created_at DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'plan_messages_plan_created_idx')
CREATE INDEX plan_messages_plan_created_idx ON dbo.plan_messages (plan_id, created_at);
GO

-- endpoint is NVARCHAR(MAX) (push endpoints exceed the 900-byte unique-index limit),
-- so uniqueness is enforced by the API via delete-then-insert upsert.
IF OBJECT_ID('dbo.push_subscriptions', 'U') IS NULL
CREATE TABLE dbo.push_subscriptions (
  id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  user_id    UNIQUEIDENTIFIER NOT NULL
               REFERENCES dbo.users(id) ON DELETE CASCADE,
  endpoint   NVARCHAR(MAX)    NOT NULL,
  p256dh     NVARCHAR(500)    NOT NULL,
  auth       NVARCHAR(500)    NOT NULL,
  user_agent NVARCHAR(1000),
  created_at DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_push_subscriptions_user_id')
CREATE INDEX idx_push_subscriptions_user_id ON dbo.push_subscriptions (user_id);
GO

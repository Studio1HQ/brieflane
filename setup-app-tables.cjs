const fs = require('fs');
const Database = require('better-sqlite3');

const sql = `
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  require_human_approval BOOLEAN DEFAULT 1,
  require_approval_linear BOOLEAN DEFAULT 1,
  require_approval_slack_summary BOOLEAN DEFAULT 1,
  require_approval_slack_issues BOOLEAN DEFAULT 1,
  default_slack_channel TEXT,
  default_linear_project TEXT,
  default_linear_team TEXT
);

INSERT OR IGNORE INTO app_settings (id) VALUES ('default');

CREATE TABLE IF NOT EXISTS meeting_runs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  fireflies_id TEXT NOT NULL,
  meeting_title TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  summary TEXT,
  participants TEXT,
  status TEXT DEFAULT 'processing',
  slack_summary_sent BOOLEAN DEFAULT 0,
  slack_issues_sent BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS draft_issues (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  meeting_run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id TEXT,
  priority INTEGER DEFAULT 0,
  team_id TEXT,
  project_id TEXT,
  status TEXT DEFAULT 'draft',
  linear_id TEXT,
  FOREIGN KEY (meeting_run_id) REFERENCES meeting_runs(id)
);

CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  meeting_run_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details TEXT
);
`;

const db = new Database('corsair.db');
db.exec(sql);
console.log('App tables created successfully.');

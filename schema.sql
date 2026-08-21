-- Referência. O sistema cria estas tabelas automaticamente no primeiro acesso.
CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '{}', active INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, user_agent TEXT, ip_hint TEXT);
CREATE TABLE IF NOT EXISTS tracking_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, product_id TEXT, source TEXT, medium TEXT, campaign TEXT, content TEXT, term TEXT, fbclid TEXT, page TEXT, referrer TEXT, created_at TEXT NOT NULL);

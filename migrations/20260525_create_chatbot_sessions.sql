CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id TEXT PRIMARY KEY,
  mahasiswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  final_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT chatbot_sessions_status_check CHECK (status IN ('aktif', 'selesai'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_sessions_one_active_per_mahasiswa
  ON chatbot_sessions (mahasiswa_id)
  WHERE status = 'aktif';

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_mahasiswa_status
  ON chatbot_sessions (mahasiswa_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(10) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chatbot_messages_sender_check CHECK (sender IN ('user', 'bot'))
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session_created
  ON chatbot_messages (session_id, created_at ASC, id ASC);

const userRepository = require('../repositories/user.repository');
const chatbotRepository = require('../repositories/chatbot.repository');

const DEFAULT_N8N_BASE_URL = 'http://34.101.47.211:5678';
const DEFAULT_GENERATE_SUMMARY_WEBHOOK_ID = 'e2c93a91-e5d7-43eb-a568-d4e13f2e467b';
const DEFAULT_CLOSE_SESSION_WEBHOOK_ID = 'fedcc9f9-ea54-4a61-832b-8d5b9c2f69b0';
const DEFAULT_CHATBOT_WEBHOOK_URL = 'http://34.101.47.211:5678/webhook/chat-aca';
const CHATBOT_TIMEOUT_MS = parseInt(process.env.N8N_CHATBOT_TIMEOUT_MS, 10) || 30000;

const joinWebhookUrl = (baseUrl, webhookId, path) => {
  const normalizedBaseUrl = String(baseUrl || DEFAULT_N8N_BASE_URL).replace(/\/+$/, '');
  const normalizedWebhookId = String(webhookId || '').replace(/^\/+|\/+$/g, '');
  return `${normalizedBaseUrl}/webhook/${normalizedWebhookId}${path}`;
};

const getWebhookUrl = () => process.env.N8N_CHATBOT_WEBHOOK_URL || DEFAULT_CHATBOT_WEBHOOK_URL;
const getN8nBaseUrl = () => process.env.N8N_BASE_URL || DEFAULT_N8N_BASE_URL;
const getSummaryWebhookUrl = () => (
  process.env.N8N_CHATBOT_SUMMARY_WEBHOOK_URL
  || joinWebhookUrl(
    getN8nBaseUrl(),
    process.env.N8N_GENERATE_SUMMARY_WEBHOOK_ID || DEFAULT_GENERATE_SUMMARY_WEBHOOK_ID,
    '/chatbot/session/{{session_id}}/generate-summary'
  )
);
const getCloseSessionWebhookUrl = () => (
  process.env.N8N_CHATBOT_CLOSE_SESSION_WEBHOOK_URL
  || joinWebhookUrl(
    getN8nBaseUrl(),
    process.env.N8N_CLOSE_SESSION_WEBHOOK_ID || DEFAULT_CLOSE_SESSION_WEBHOOK_ID,
    '/chatbot/session/{{session_id}}/close'
  )
);
const resolveSessionWebhookUrl = (url, sessionId) => url.replace('{{session_id}}', encodeURIComponent(sessionId));

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
};

const getTextFromKeys = (payload, keys) => {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === 'string') return payload;

  if (Array.isArray(payload)) {
    return getTextFromKeys(payload[0], keys);
  }

  if (typeof payload !== 'object') return String(payload);

  for (const key of keys) {
    if (typeof payload[key] === 'string' && payload[key].trim()) {
      return payload[key];
    }
  }

  const nestedKeys = ['data', 'json', 'body', 'result'];
  for (const key of nestedKeys) {
    const reply = getTextFromKeys(payload[key], keys);
    if (reply) return reply;
  }

  return null;
};

const getReplyText = (payload) => getTextFromKeys(payload, [
  'balasan_aca',
  'reply_text',
  'output',
  'answer',
  'reply',
  'message',
  'text',
  'response'
]);

const getSummaryText = (payload) => getTextFromKeys(payload, [
  'draft_summary',
  'summary',
  'ringkasan',
  'output',
  'answer',
  'reply',
  'message',
  'text',
  'response'
]);

const normalizeResponse = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (Object.prototype.hasOwnProperty.call(payload, 'balasan_aca')) {
      return payload;
    }

    const reply = getReplyText(payload);
    return reply ? { ...payload, balasan_aca: reply } : payload;
  }

  const reply = getReplyText(payload);
  return { balasan_aca: reply, response: payload };
};

const generateSessionId = () => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `S-${Date.now()}-${random}`;
};

const ensureMahasiswa = async (user) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: 'Hanya mahasiswa yang dapat mengakses chatbot' };
  }

  const currentUser = await userRepository.findById(user.id);
  if (!currentUser || currentUser.role !== 'mahasiswa') {
    throw { status: 404, message: 'Data mahasiswa tidak ditemukan' };
  }

  if (!currentUser.npm_nip) {
    throw { status: 400, message: 'NPM mahasiswa belum tersedia' };
  }

  return currentUser;
};

const requestWebhook = async (url, payload) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage = responseBody?.message || responseBody?.error || response.statusText || 'Chatbot service error';
      throw { status: 502, message: `Gagal mendapatkan balasan chatbot: ${errorMessage}` };
    }

    return responseBody;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw { status: 504, message: 'Chatbot membutuhkan waktu terlalu lama untuk merespons' };
    }

    if (err.status) throw err;

    throw { status: 502, message: 'Tidak dapat terhubung ke chatbot service' };
  } finally {
    clearTimeout(timeout);
  }
};

const requestChatbot = async (url, payload) => {
  const responseBody = await requestWebhook(url, payload);
  const normalizedResponse = normalizeResponse(responseBody);

  if (!normalizedResponse?.balasan_aca) {
    throw {
      status: 502,
      message: 'Chatbot service tidak mengirim balasan. Pastikan workflow n8n memakai Respond to Webhook dan mengembalikan field balasan_aca/output.'
    };
  }

  return normalizedResponse;
};

const getOrCreateActiveSession = async ({ sessionId, mahasiswaId }) => {
  if (sessionId) {
    const session = await chatbotRepository.findSessionByIdForUser(sessionId, mahasiswaId);
    if (!session) {
      throw { status: 404, message: 'Sesi chatbot tidak ditemukan' };
    }
    if (session.status !== 'aktif') {
      throw { status: 400, message: 'Sesi chatbot sudah ditutup' };
    }
    return session;
  }

  const activeSession = await chatbotRepository.findActiveSessionByUser(mahasiswaId);
  if (activeSession) return activeSession;

  return chatbotRepository.createSession({
    id: generateSessionId(),
    mahasiswa_id: mahasiswaId
  });
};

exports.getActiveSession = async ({ user }) => {
  const currentUser = await ensureMahasiswa(user);
  const session = await chatbotRepository.findActiveSessionByUser(currentUser.id);

  if (!session) return null;

  const messages = await chatbotRepository.getMessagesBySession(session.id);
  return {
    session_id: session.id,
    is_active: true,
    messages
  };
};

exports.getHistory = async ({ user }) => {
  const currentUser = await ensureMahasiswa(user);
  const sessions = await chatbotRepository.getClosedSessionsByUser(currentUser.id);

  return sessions.map((session) => ({
    session_id: session.id,
    summary: session.final_summary || null,
    created_at: session.created_at,
    status: 'completed'
  }));
};

exports.getHistoryDetail = async ({ user, sessionId }) => {
  const currentUser = await ensureMahasiswa(user);
  const session = await chatbotRepository.findClosedSessionByIdForUser(sessionId, currentUser.id);

  if (!session) {
    throw { status: 404, message: 'Riwayat chatbot tidak ditemukan' };
  }

  const messages = await chatbotRepository.getMessagesBySession(session.id);

  return {
    session_id: session.id,
    is_active: false,
    summary: session.final_summary || null,
    messages
  };
};

exports.sendMessage = async ({ user, body }) => {
  const currentUser = await ensureMahasiswa(user);

  const message = typeof body?.message === 'string'
    ? body.message.trim()
    : (typeof body?.pesan_user === 'string' ? body.pesan_user.trim() : '');

  if (!message) {
    throw { status: 400, message: 'message wajib diisi' };
  }

  if (message.length > 4000) {
    throw { status: 400, message: 'message maksimal 4000 karakter' };
  }

  const requestedSessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
  const session = await getOrCreateActiveSession({
    sessionId: requestedSessionId,
    mahasiswaId: currentUser.id
  });

  const userMessage = await chatbotRepository.addMessage({
    session_id: session.id,
    sender: 'user',
    text: message
  });

  const messages = await chatbotRepository.getMessagesBySession(session.id);
  const payload = {
    action: 'chat',
    session_id: session.id,
    npm_mahasiswa: currentUser.npm_nip,
    pesan_user: message,
    chatInput: message,
    message,
    messages: messages.map((item) => ({
      id: item.id,
      sender: item.sender,
      text: item.text,
      created_at: item.created_at
    }))
  };

  const normalizedResponse = await requestChatbot(getWebhookUrl(), payload);
  const replyText = normalizedResponse.balasan_aca;

  const botMessage = await chatbotRepository.addMessage({
    session_id: session.id,
    sender: 'bot',
    text: replyText
  });

  return {
    session_id: session.id,
    reply_text: replyText,
    created_at: botMessage.created_at
  };
};

exports.sendLegacyMessage = async ({ user, body }) => {
  const result = await exports.sendMessage({ user, body });

  return {
    session_id: result.session_id,
    balasan_aca: result.reply_text,
    reply_text: result.reply_text,
    created_at: result.created_at
  };
};

exports.generateSummary = async ({ user, sessionId }) => {
  const currentUser = await ensureMahasiswa(user);
  const session = await chatbotRepository.findSessionByIdForUser(sessionId, currentUser.id);

  if (!session) {
    throw { status: 404, message: 'Sesi chatbot tidak ditemukan' };
  }

  if (session.status !== 'aktif') {
    throw { status: 400, message: 'Sesi chatbot sudah ditutup' };
  }

  const messages = await chatbotRepository.getMessagesBySession(session.id);
  if (messages.length === 0) {
    return { draft_summary: '' };
  }

  const response = await requestWebhook(resolveSessionWebhookUrl(getSummaryWebhookUrl(), session.id), {
    action: 'generate_summary',
    session_id: session.id,
    npm_mahasiswa: currentUser.npm_nip,
    messages: messages.map((item) => ({
      id: item.id,
      sender: item.sender,
      text: item.text,
      created_at: item.created_at
    }))
  });

  const draftSummary = getSummaryText(response);
  if (!draftSummary) {
    throw {
      status: 502,
      message: 'Chatbot service tidak mengirim draft_summary. Pastikan workflow n8n mengembalikan field draft_summary/summary/output.'
    };
  }

  return { draft_summary: draftSummary };
};

exports.closeSession = async ({ user, sessionId, body }) => {
  const currentUser = await ensureMahasiswa(user);
  const finalSummary = typeof body?.final_summary === 'string' ? body.final_summary.trim() : '';

  if (!finalSummary) {
    throw { status: 400, message: 'final_summary wajib diisi' };
  }

  if (finalSummary.length > 5000) {
    throw { status: 400, message: 'final_summary maksimal 5000 karakter' };
  }

  const session = await chatbotRepository.findSessionByIdForUser(sessionId, currentUser.id);
  if (!session) {
    throw { status: 404, message: 'Sesi chatbot tidak ditemukan' };
  }

  if (session.status !== 'aktif') {
    throw { status: 400, message: 'Sesi chatbot sudah ditutup' };
  }

  await requestWebhook(resolveSessionWebhookUrl(getCloseSessionWebhookUrl(), session.id), {
    action: 'close_session',
    session_id: session.id,
    npm_mahasiswa: currentUser.npm_nip,
    final_summary: finalSummary,
    closed_at: new Date().toISOString()
  });

  const closedSession = await chatbotRepository.closeSession({
    session_id: session.id,
    mahasiswa_id: currentUser.id,
    final_summary: finalSummary
  });

  return {
    session_id: closedSession.id,
    is_active: false,
    final_summary: closedSession.final_summary,
    closed_at: closedSession.closed_at
  };
};

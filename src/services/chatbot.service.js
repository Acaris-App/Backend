const userRepository = require('../repositories/user.repository');

const DEFAULT_CHATBOT_WEBHOOK_URL = 'http://34.101.190.86:5678/webhook/chat-aca';
const CHATBOT_TIMEOUT_MS = parseInt(process.env.N8N_CHATBOT_TIMEOUT_MS, 10) || 30000;

const getWebhookUrl = () => process.env.N8N_CHATBOT_WEBHOOK_URL || DEFAULT_CHATBOT_WEBHOOK_URL;

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
};

const getReplyText = (payload) => {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === 'string') return payload;

  if (Array.isArray(payload)) {
    return getReplyText(payload[0]);
  }

  if (typeof payload !== 'object') return String(payload);

  const replyKeys = ['balasan_aca', 'output', 'answer', 'reply', 'message', 'text', 'response'];
  for (const key of replyKeys) {
    if (typeof payload[key] === 'string' && payload[key].trim()) {
      return payload[key];
    }
  }

  return null;
};

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

exports.sendMessage = async ({ user, body }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: 'Hanya mahasiswa yang dapat mengakses chatbot' };
  }

  const pesanUser = typeof body?.pesan_user === 'string' ? body.pesan_user.trim() : '';
  if (!pesanUser) {
    throw { status: 400, message: 'pesan_user wajib diisi' };
  }

  if (pesanUser.length > 4000) {
    throw { status: 400, message: 'pesan_user maksimal 4000 karakter' };
  }

  const currentUser = await userRepository.findById(user.id);
  if (!currentUser || currentUser.role !== 'mahasiswa') {
    throw { status: 404, message: 'Data mahasiswa tidak ditemukan' };
  }

  if (!currentUser.npm_nip) {
    throw { status: 400, message: 'NPM mahasiswa belum tersedia' };
  }

  const payload = {
    session_id: String(currentUser.id),
    npm_mahasiswa: currentUser.npm_nip,
    pesan_user: pesanUser
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);

  try {
    const response = await fetch(getWebhookUrl(), {
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

    return normalizeResponse(responseBody);
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

// server/routes/chatRoutes.js
import express from 'express';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Helper: safe body parsing
function getMessageFromBody(req) {
  const body = req.body ?? {};
  return (typeof body === 'object' && (body.message ?? body.text)) || null;
}

// Text-search helper (requires text index on 'cars' collection)
async function fetchRelevantDocs_textSearch(query, limit = 5, opts = {}) {
  const cars = await Car.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" }, brand: 1, model: 1, description: 1, pricePerDay: 1, location: 1 }
  ).sort({ score: { $meta: "textScore" } }).limit(limit).lean();
  // also search bookings (requires Booking text index on status or notes)
  const bookingFilter = { $text: { $search: query } };
  // restrict bookings to the user/owner if provided in opts
  if (opts.userId && opts.role) {
    if (opts.role === 'owner') bookingFilter.owner = opts.userId;
    else bookingFilter.user = opts.userId;
  }

  const bookings = await Booking.find(bookingFilter,
    { score: { $meta: "textScore" }, status: 1, pickupDate:1, returnDate:1, car:1, user:1, owner:1 }
  ).sort({ score: { $meta: "textScore" } }).limit(limit).populate('car', 'brand model pricePerDay location').lean();

  return { cars, bookings };
}

// Regex fallback (no text index needed)
async function fetchRelevantDocs_regex(query, limit = 5, opts = {}) {
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const cars = await Car.find({
    $or: [
      { brand: re },
      { model: re },
      { description: re },
      { category: re },
      { location: re }
    ]
  }).limit(limit).lean();
  // regex fallback for bookings: match status or look up by car brand via populated car
  const bookingFilter = { $or: [{ status: re }] };
  if (opts.userId && opts.role) {
    if (opts.role === 'owner') bookingFilter.owner = opts.userId;
    else bookingFilter.user = opts.userId;
  }

  const bookings = await Booking.find(bookingFilter).limit(limit).populate('car', 'brand model pricePerDay location').lean();

  return { cars, bookings };
}

// Call OpenRouter chat completions
async function callOpenRouterChat({ messages, model = 'gpt-3.5-turbo', max_tokens = 600, temperature = 0.0 }) {
  // use OPENROUTER_API_KEY for OpenRouter provider
  function normalizeKey(k) {
    if (!k) return null;
    let s = String(k).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
    if (s.toLowerCase().startsWith('bearer ')) s = s.slice(7).trim();
    return s || null;
  }

  const OPENROUTER_KEY = normalizeKey(process.env.OPENROUTER_API_KEY);
  if (!OPENROUTER_KEY) throw new Error('Missing OPENROUTER_API_KEY in server environment');

  // OpenRouter chat completions endpoint
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const payload = {
    model,
    messages,
    max_tokens,
    temperature
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || data?.raw || `HTTP ${res.status}`;
    const err = new Error(`OpenRouter API error: ${msg}`);
    if (res.status === 401) err.message += ' — check OPENROUTER_API_KEY env (remove surrounding quotes or "Bearer " prefix)';
    err.status = res.status;
    err.raw = data;
    throw err;
  }

  // OpenRouter returns OpenAI-compatible response. Extract message text.
  const assistant = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.content?.trim?.() ?? null;
  return { raw: data, assistant: assistant ?? null };
}

router.post('/', async (req, res) => {
  try {
    const message = getMessageFromBody(req);
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'bad request', detail: 'Send JSON body: { "message": "..." } with Content-Type: application/json' });
    }

    // 1) initial doc fetch will be re-run after optional auth check below
    let docs;

    // 3) call OpenRouter
    // choose a model available on OpenRouter (gpt-3.5-turbo is a good inexpensive default)
    const model = process.env.CHAT_MODEL || 'gpt-3.5-turbo';
    // attempt to identify user from Authorization header (optional)
    let opts = {};
    try {
      const auth = req.headers.authorization;
      if (auth) {
        let token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : auth;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const u = await User.findById(decoded.id).select('role');
          if (u) opts.userId = decoded.id, opts.role = u.role;
        }
      }
    } catch (e) {
      // ignore authorization errors; treat as anonymous
      console.warn('chat auth check failed (continuing anonymous):', e.message);
    }

    // Simple intent handling (fast, deterministic answers) before calling the LLM
    const text = message.trim().toLowerCase();
    // 1) User's bookings
    if (/\bmy bookings?\b/.test(text) || /\bshow my bookings\b/.test(text)) {
      if (!opts.userId) return res.status(401).json({ error: 'not_authenticated', detail: 'Please login to view your bookings' });
      const userBookings = await Booking.find({ user: opts.userId }).populate('car', 'brand model pricePerDay location').lean();
      if (!userBookings.length) return res.json({ reply: "You have no bookings." });
      const lines = userBookings.map((b, i) => {
        const car = b.car ? `${b.car.brand} ${b.car.model}` : 'Unknown car';
        const pickup = b.pickupDate ? new Date(b.pickupDate).toLocaleString() : 'N/A';
        const ret = b.returnDate ? new Date(b.returnDate).toLocaleString() : 'N/A';
        return `${i+1}. ${car} — ${b.status} — pickup: ${pickup} — return: ${ret} — price: ${b.price}`;
      });
      return res.json({ reply: `Your bookings:\n${lines.join('\n')}`, sources: userBookings.map(b=>({ type: 'booking', id: b._id })) });
    }

    // 2) Available cars or asking for prices
    if (/available cars?|which cars are available|tell me the available cars|their prices|what are their prices/.test(text)) {
      const available = await Car.find({ isAvaliable: true }).select('brand model pricePerDay location').lean();
      if (!available.length) return res.json({ reply: 'No cars are currently available.' });
      const lines = available.map((c, i) => `${i+1}. ${c.brand}(${c.model})  in ${c.location} at ₹${c.pricePerDay} per day`);
      return res.json({ reply: `The available cars are:\n${lines.join('\n')}`, sources: available.map(c=>({ type: 'car', id: c._id })) });
    }

    // re-run doc fetch with optional user scoping
    try {
      docs = await fetchRelevantDocs_textSearch(message, 6, opts);
    } catch (err) {
      docs = await fetchRelevantDocs_regex(message, 6, opts);
    }

    // After fetching docs (potentially scoped to the authenticated user), build context
    const carParts = (docs.cars || []).map(c => `${c.brand} ${c.model} (${c.year ?? 'N/A'}) in ${c.location}, pricePerDay: ${c.pricePerDay}\n${(c.description||'').slice(0,800)}`);
    const bookingParts = (docs.bookings || []).map(b => {
      const car = b.car ? `${b.car.brand} ${b.car.model}` : (b.car || 'N/A');
      return `Booking for ${car} - status:${b.status}, pickup:${b.pickupDate?.toISOString?.()||'N/A'}, return:${b.returnDate?.toISOString?.()||'N/A'}`;
    });

    const contextParts = [...carParts, ...bookingParts];
    const contextText = contextParts.length ? contextParts.join('\n---\n') : 'No relevant sources found.';

    const systemMsg = `You are an assistant for the CarZilla app. Use ONLY the sources below to answer the user's question. If the answer is not in the sources, say "I couldn't find the answer in the provided data." and suggest next steps.\n\nSources:\n${contextText}`;

    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: message }
    ];

    const { assistant, raw } = await callOpenRouterChat({ messages, model, max_tokens: 600, temperature: 0.0 });

    if (!assistant) {
      console.warn('OpenRouter returned no assistant text', raw);
      return res.status(502).json({ error: 'bad gateway', detail: 'No assistant response from OpenRouter', raw });
    }

    const sources = [
      ...(docs.cars || []).map(c => ({ type: 'car', id: c._id, title: `${c.brand} ${c.model}` })),
      ...(docs.bookings || []).map(b => ({ type: 'booking', id: b._id, title: `Booking ${b._id}` }))
    ];

    return res.json({ reply: assistant, sources });
  } catch (err) {
    console.error('chat error', err);
    // propagate useful OpenRouter errors to the client
    const status = err.status || 500;
    const detail = err.message || String(err);
    return res.status(status).json({ error: 'server error', detail, raw: err.raw ?? null });
  }
});

export default router;
// ===== STORAGE KEYS =====
const DASH_KEY  = 'np_dashboard';
const MEM_KEY   = 'np_memory';
const CHATS_KEY = 'np_chats';
const GROQ_API_KEY = (window.ENV && window.ENV.GROQ_API_KEY) || '';

const SYSTEM_PROMPT = `You are the NayePankh AI Assistant, a helpful chatbot for NayePankh Foundation, an Indian youth-led NGO.
NayePankh Foundation was founded on 28 March 2021 during COVID-19 by students in Kanpur, Uttar Pradesh, India.
Key facts:
- UP Government registered NGO with 12A and 80G certifications
- Has helped 2 lakh+ people across 25+ cities
- 150+ volunteers, 50+ campaigns completed
Programs: Education support, Hunger relief, Clothing distribution, Women's empowerment and menstrual hygiene, Animal welfare, Health awareness, Environmental drives, Youth empowerment.
Contact: Email: contact@nayepankh.com | Phone/WhatsApp: +91 8318500748 | Kanpur, UP, India
Donation: https://pages.razorpay.com/pl_NUcVhpQzK8rI1b/view
Social: Instagram: https://www.instagram.com/nayepankhfoundation | LinkedIn: https://www.linkedin.com/company/nayepankh | YouTube: https://youtube.com/@nayepankhfoundation | Facebook: https://facebook.com/nayepankhfoundation | Twitter/X: https://x.com/nayepankh
Answer helpfully and briefly. Keep replies short, friendly and easy to read. If unsure, suggest contacting the foundation directly.`;

// ===== DASHBOARD =====
function getDash() {
  let d = JSON.parse(localStorage.getItem(DASH_KEY) || 'null');
  if (!d) d = { since: new Date().toLocaleDateString(), visits: 0, chats: 0, activity: [] };
  return d;
}
function saveDash(d) { localStorage.setItem(DASH_KEY, JSON.stringify(d)); }

// FIX: activity log now skips duplicate consecutive entries
function logActivity(msg) {
  const d = getDash();
  const last = d.activity[0];
  if (last && last.msg === msg) return; // skip exact duplicate back-to-back
  d.activity.unshift({ msg, time: new Date().toLocaleString() });
  if (d.activity.length > 40) d.activity = d.activity.slice(0, 40);
  saveDash(d);
}

function incVisit() {
  const d = getDash();
  d.visits++;
  saveDash(d);
  // FIX: only log once here — showSection() will log the page visit separately
  // No duplicate logActivity call here anymore
}

function incChat() { const d = getDash(); d.chats++; saveDash(d); }

function updateDashboard() {
  const d = getDash();
  document.getElementById('statVisits').textContent = d.visits;
  document.getElementById('statChats').textContent  = d.chats;
  document.getElementById('statSaved').textContent  = getSavedChats().length;
  document.getElementById('statMem').textContent    = getMemory() ? 'Yes' : 'No';
  document.getElementById('dashSince').textContent  = d.since;
  const log = document.getElementById('activityLog');
  log.innerHTML = '';
  if (!d.activity.length) {
    log.innerHTML = '<li>No activity yet.</li>';
  } else {
    d.activity.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="activity-dot" aria-hidden="true"></span>${escapeHtml(a.msg)}<span class="activity-time">${escapeHtml(a.time)}</span>`;
      log.appendChild(li);
    });
  }
}

// FIX: prevent XSS in activity log
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ===== MEMORY =====
function getMemory() { return JSON.parse(localStorage.getItem(MEM_KEY) || 'null'); }
function setMemory(m) { localStorage.setItem(MEM_KEY, JSON.stringify(m)); }

function saveUserMemory() {
  const name     = document.getElementById('memName').value.trim();
  const age      = document.getElementById('memAge').value.trim();
  const email    = document.getElementById('memEmail').value.trim();
  const interest = document.getElementById('memInterest').value;

  // Basic validation
  if (!name) {
    alert('Please enter your name before saving.');
    document.getElementById('memName').focus();
    return;
  }

  const m = { name, age, email, interest, saved: new Date().toLocaleDateString() };
  setMemory(m);

  const msg = document.getElementById('memorySavedMsg');
  msg.textContent = '✅ Saved! AI Assistant will remember you.';
  logActivity('Updated personal details in Memory');
  setTimeout(() => { msg.textContent = ''; }, 3500);
}

function loadMemoryForm() {
  const m = getMemory();
  if (!m) return;
  document.getElementById('memName').value     = m.name     || '';
  document.getElementById('memAge').value      = m.age      || '';
  document.getElementById('memEmail').value    = m.email    || '';
  document.getElementById('memInterest').value = m.interest || '';
}

// ===== SAVED CHATS =====
function getSavedChats() { return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]'); }
function setSavedChats(c) { localStorage.setItem(CHATS_KEY, JSON.stringify(c)); }

function saveCurrentChat() {
  if (!chatMessages.length) { alert('No chat to save yet!'); return; }
  const chats = getSavedChats();
  // FIX: use .text (consistent with internal chatMessages structure)
  const firstUser = chatMessages.find(m => m.role === 'user');
  const title = firstUser ? firstUser.text.slice(0, 48) : 'Conversation';
  chats.unshift({ id: Date.now(), title, date: new Date().toLocaleString(), messages: chatMessages.slice() });
  setSavedChats(chats);
  renderSavedChats();
  logActivity('Saved a chat: "' + title.slice(0, 30) + '"');
  alert('✅ Chat saved to Memory!');
}

function deleteSavedChat(id) {
  if (!confirm('Delete this chat?')) return;
  setSavedChats(getSavedChats().filter(c => c.id !== id));
  renderSavedChats();
  logActivity('Deleted a saved chat');
}

function clearAllChats() {
  if (!confirm('Clear ALL saved chats? This cannot be undone.')) return;
  setSavedChats([]);
  renderSavedChats();
  logActivity('Cleared all saved chats');
}

function openSavedChat(id) {
  const chat = getSavedChats().find(c => c.id === id);
  if (!chat) return;
  chatMessages = chat.messages.slice();
  openChat();
  renderChatUI();
  logActivity('Opened saved chat: "' + chat.title.slice(0, 30) + '"');
  setTimeout(() => {
    const box = document.getElementById('chatMsgs');
    if (box) box.scrollTop = box.scrollHeight;
  }, 80);
}

function renderSavedChats() {
  const container = document.getElementById('savedChatsList');
  if (!container) return;
  const chats = getSavedChats();
  if (!chats.length) {
    container.innerHTML = '<p class="empty-msg">No saved chats yet.<br>Chat with the AI and tap 💾 Save Chat.</p>';
    return;
  }
  container.innerHTML = '';
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `
      <div class="chat-item-info" onclick="openSavedChat(${chat.id})" style="cursor:pointer;">
        <div class="chat-item-title">${escapeHtml(chat.title)}</div>
        <div class="chat-item-date">🕐 ${escapeHtml(chat.date)}</div>
      </div>
      <div class="chat-item-btns">
        <button class="btn-open-chat" onclick="openSavedChat(${chat.id})">Open</button>
        <button class="btn-del-chat" onclick="deleteSavedChat(${chat.id})">Delete</button>
      </div>`;
    container.appendChild(item);
  });
}

function startNewChatFromMemory() { startNewChat(); toggleChat(); }

// ===== NAVIGATION =====
function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-page') === id);
  });
  window.scrollTo(0, 0);
  if (id === 'dashboard') updateDashboard();
  if (id === 'memory') { loadMemoryForm(); renderSavedChats(); }
  logActivity('Visited ' + id + ' page');
}

// hamburger 
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  const isOpen = menu.classList.toggle('open');
  menu.setAttribute('aria-hidden', !isOpen);
  btn.setAttribute('aria-expanded', isOpen);
}

function closeMobile() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  btn.setAttribute('aria-expanded', 'false');
}

function openDonate() {
  window.open('https://pages.razorpay.com/pl_NUcVhpQzK8rI1b/view', '_blank', 'noopener,noreferrer');
}

// ===== AI CHAT =====
// chatMessages stores: { role: 'user'|'ai', text: string }
let chatMessages = [];
let chatOpen = false;

function openChat() {
  chatOpen = true;
  const panel = document.getElementById('chatPanel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  if (!chatMessages.length) greetUser();
}

function closeChat() {
  chatOpen = false;
  const panel = document.getElementById('chatPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

function toggleChat() {
  chatOpen ? closeChat() : openChat();
}

function greetUser() {
  const mem = getMemory();
  const greeting = mem && mem.name
    ? `Namaste, ${mem.name}! 🙏 Welcome back to NayePankh Foundation. You were interested in ${mem.interest || 'our programs'}. How can I help you today?`
    : `Namaste! 🙏 I am the NayePankh AI Assistant. Ask me about volunteering, internships, donations, campaigns, or anything about NayePankh Foundation!`;

  chatMessages = [{ role: 'ai', text: greeting }];
  renderChatUI();
}

function startNewChat() {
  chatMessages = [];
  greetUser();
  logActivity('Started a new AI chat');
}

function renderChatUI() {
  const box = document.getElementById('chatMsgs');
  if (!box) return;
  box.innerHTML = '';
  chatMessages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.role === 'user' ? 'user' : 'ai');
    div.textContent = m.text;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

function appendMsg(role, text) {
  chatMessages.push({ role, text });
  const box = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'ai');
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

async function sendMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();

  if (!text) return;

  if (!GROQ_API_KEY) {
    alert('AI is not configured yet. Please set up your API key in config.js (run: node generate-config.js).');
    return;
  }

  input.value = '';
  input.disabled = true;

  // Snapshot of messages BEFORE adding user message, for API history
  const historySnapshot = chatMessages.slice();

  appendMsg('user', text);
  incChat();
  logActivity('Sent AI message: "' + text.slice(0, 40) + '"');

  const typingDiv = appendMsg('ai', 'Typing...');
  typingDiv.className = 'chat-msg typing';

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historySnapshot.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      })),
      { role: 'user', content: text }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 600,
        temperature: 0.7,
        messages
      })
    });

    if (!res.ok) {
      let errMsg = 'API error ' + res.status;
      try {
        const err = await res.json();
        errMsg = err.error?.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) throw new Error('Empty response from AI');

    typingDiv.className = 'chat-msg ai';
    typingDiv.textContent = reply;

    // Update the "Typing..." placeholder in chatMessages with the real reply
    chatMessages[chatMessages.length - 1] = { role: 'ai', text: reply };

  } catch (err) {
    console.error('Groq AI error:', err);

    const fallback =
      'Sorry, the AI is temporarily unavailable. Please contact NayePankh Foundation directly at contact@nayepankh.com or WhatsApp/call +91 8318500748 🙏';

    typingDiv.className = 'chat-msg ai';
    typingDiv.textContent = fallback;
    chatMessages[chatMessages.length - 1] = { role: 'ai', text: fallback };
  }

  input.disabled = false;
  input.focus();

  const box = document.getElementById('chatMsgs');
  if (box) box.scrollTop = box.scrollHeight;
}

// ===== INIT =====
incVisit();
showSection('home');

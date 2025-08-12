const KEY = "fix_chats_v1";

export function loadChats() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveChats(chats) {
  localStorage.setItem(KEY, JSON.stringify(chats));
}

export function createChat() {
  const id = crypto.randomUUID();
  const chat = {
    id,
    title: "New chat",
    messages: [
      { role: "assistant", content: "Hi! Start by asking a FIX question.", ts: Date.now() }
    ],
    updatedAt: Date.now()
  };
  const chats = loadChats();
  chats.unshift(chat);
  saveChats(chats);
  return chat;
}

export function updateChat(id, updater) {
  const chats = loadChats();
  const i = chats.findIndex(c => c.id === id);
  if (i === -1) return null;
  const updated = updater({ ...chats[i] });
  updated.updatedAt = Date.now();
  // Move updated chat to top
  const next = [updated, ...chats.filter(c => c.id !== id)];
  saveChats(next);
  return updated;
}

export function getChat(id) {
  return loadChats().find(c => c.id === id) || null;
}

export function deleteChat(id) {
  const next = loadChats().filter(c => c.id !== id);
  saveChats(next);
}

export async function hashPassword(password, salt = 'fzti_v1') {
  const data = new TextEncoder().encode(password + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getUsers() {
  try { return JSON.parse(localStorage.getItem('fzti_users') || '{}'); }
  catch { return {}; }
}

export function saveUsers(users) {
  localStorage.setItem('fzti_users', JSON.stringify(users));
}

export function getCurrentUser() {
  return localStorage.getItem('fzti_current_user') || null;
}

export function setCurrentUser(username) {
  if (username) localStorage.setItem('fzti_current_user', username);
  else localStorage.removeItem('fzti_current_user');
}

export async function registerUser(username, password) {
  username = username.trim().toLowerCase();
  if (!username || username.length < 3) throw new Error('Usuario debe tener al menos 3 caracteres');
  if (!password || password.length < 4) throw new Error('Contraseña debe tener al menos 4 caracteres');
  const users = getUsers();
  if (users[username]) throw new Error('Ese usuario ya existe');
  const passwordHash = await hashPassword(password);
  users[username] = { passwordHash, createdAt: new Date().toISOString(), onboarded: false };
  saveUsers(users);
  setCurrentUser(username);
  return users[username];
}

export async function loginUser(username, password) {
  username = username.trim().toLowerCase();
  const users = getUsers();
  const user = users[username];
  if (!user) throw new Error('Usuario no encontrado');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta');
  setCurrentUser(username);
  return user;
}

export function logoutUser() {
  setCurrentUser(null);
}

export function markOnboarded(username) {
  const users = getUsers();
  if (users[username]) {
    users[username].onboarded = true;
    saveUsers(users);
  }
}

export function isOnboarded(username) {
  const users = getUsers();
  return users[username]?.onboarded === true;
}

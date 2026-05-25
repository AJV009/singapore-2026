(() => {
  const ITERATIONS = 600_000;
  const KEY_LEN = 32;
  const SALT_LEN = 16;
  const IV_LEN = 12;
  const TAG_LEN = 16;
  const SESSION_KEY = 'sg2026_pw';
  const ENC_FILE = 'trip-data.js.enc';

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: KEY_LEN * 8 },
      false,
      ['decrypt']
    );
  }

  async function decrypt(password) {
    const resp = await fetch(ENC_FILE);
    if (!resp.ok) throw new Error('Encrypted data not found');
    const b64 = await resp.text();
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    const salt = buf.slice(0, SALT_LEN);
    const iv = buf.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const tag = buf.slice(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
    const ciphertext = buf.slice(SALT_LEN + IV_LEN + TAG_LEN);

    const combined = new Uint8Array(ciphertext.length + TAG_LEN);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
    return new TextDecoder().decode(plain);
  }

  function injectAndBoot(js) {
    const script = document.createElement('script');
    script.textContent = js;
    document.head.appendChild(script);
    document.body.classList.remove('locked');
    document.getElementById('lockOverlay').remove();
    if (typeof window.bootTrip === 'function') window.bootTrip();
  }

  async function tryUnlock(password) {
    const err = document.getElementById('lockErr');
    const btn = document.getElementById('lockBtn');
    btn.textContent = 'Decrypting…';
    btn.disabled = true;
    err.textContent = '';
    try {
      const js = await decrypt(password);
      sessionStorage.setItem(SESSION_KEY, password);
      injectAndBoot(js);
    } catch {
      err.textContent = 'Wrong password';
      const field = document.getElementById('lockPw');
      field.classList.add('shake');
      setTimeout(() => field.classList.remove('shake'), 500);
      btn.textContent = 'Unlock';
      btn.disabled = false;
      field.select();
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const js = await decrypt(saved);
        injectAndBoot(js);
        return;
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    document.getElementById('lockBtn').addEventListener('click', () => {
      const pw = document.getElementById('lockPw').value.trim();
      if (pw) tryUnlock(pw);
    });
    document.getElementById('lockPw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const pw = e.target.value.trim();
        if (pw) tryUnlock(pw);
      }
    });
  });
})();

const PREFIX = 't360-';

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value, onError) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    if (onError) onError('Armazenamento local indisponível ou cheio.');
    return false;
  }
}


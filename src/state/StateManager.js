/**
 * Reaktif State Manager — Observer Pattern
 * Antigravity State katmanı
 */
export class StateManager {
  /** @param {import('../models/AppState.js').AppState} initialState */
  constructor(initialState) {
    this._state = structuredClone(initialState);
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();
  }

  /** State'in derin kopyasını döndürür */
  getState() { return structuredClone(this._state); }

  /** Belirli bir anahtarın değerini döndürür (dot notation: 'globalMeta.okulAdi') */
  get(key) {
    return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), this._state);
  }

  /** State günceller ve ilgili subscriber'ları bilgilendirir */
  setState(key, value) {
    const keys = key.split('.');
    let target = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] == null) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    this._notify(key);
    // Wildcard subscriber'ları da bilgilendir
    this._notify('*');
  }

  /** Bir anahtardaki değişiklikleri dinler. Unsubscribe fonksiyonu döndürür. */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) this._subscribers.set(key, new Set());
    this._subscribers.get(key).add(callback);
    return () => { this._subscribers.get(key)?.delete(callback); };
  }

  /** İlgili subscriber'ları tetikler */
  _notify(key) {
    const subs = this._subscribers.get(key);
    if (subs) {
      const snapshot = structuredClone(this._state);
      subs.forEach(cb => { try { cb(snapshot); } catch (e) { console.error('State subscriber error:', e); } });
    }
  }
}

const API_BASE = window.location.origin;
const api = {
  async pack(payload) {
    const res = await fetch(API_BASE + '/api/pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
};

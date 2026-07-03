(async () => {
  const base = 'http://localhost:3000';
  const sid = '843e5195-0c6d-4d03-9ea7-3cbccb8cfac8';
  const loc = '67d23678-7c8c-488d-8f8f-c33e6bb39eea';

  try {
    const res = await fetch(`${base}/api/v1/sessions/${sid}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: loc }),
    });
    const text = await res.text();
    console.log('status', res.status);
    console.log(text);
  } catch (err) {
    console.error('fetch error', err);
  }
})();

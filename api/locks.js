import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const token = "8vGr1eX9vfpootWiUPYa5kYoGx9bTuRy2Xc4dNMrpump";
    const url = `https://lock.jup.ag/api/locks/${token}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(500).json({ error: "Upstream error", status: resp.status });
    }

    const data = await resp.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}

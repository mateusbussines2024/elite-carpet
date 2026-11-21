// Cliente da API Beehive Pay. Variável necessária na Vercel: BEEHIVE_SECRET_KEY (chave SECRETA)
const BASE = 'https://api.conta.paybeehive.com.br/v1';
async function bh(path, opt = {}) {
  const key = Buffer.from(process.env.BEEHIVE_SECRET_KEY + ':x').toString('base64');
  const call = scheme => fetch(BASE + path, { ...opt,
    headers: { Authorization: scheme + ' ' + key, 'Content-Type': 'application/json' } });
  let r = await call('Basic');
  if (r.status === 401) r = await call('Bearer'); // a documentação mostra os dois formatos
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, body: j.data || j, raw: j };
}
module.exports = { bh };

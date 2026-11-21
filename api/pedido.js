// Cria a transação (Pix ou cartão) na Beehive Pay.
const crypto = require('crypto');
const { bh } = require('./_bh');
// O código Pix (copia e cola) sempre começa com 000201. Procuramos em qualquer lugar da resposta.
function acharPix(o, d = 0) {
  if (typeof o === 'string') return o.startsWith('000201') ? o : null;
  if (!o || typeof o !== 'object' || d > 5) return null;
  for (const v of Object.values(o)) { const r = acharPix(v, d + 1); if (r) return r; }
  return null;
}
// Os preços ficam AQUI no servidor. Nunca confie no valor vindo do navegador.
const KITS = { 1: { nome: 'Kit interior + porta malas - Protect 3D', preco: 283.77 },
               2: { nome: 'Kit interior - Protect 3D', preco: 187.15 } };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método inválido.' });
  try {
    const { kit, veiculo, cliente, entrega, metodo, token, parcelas } = req.body || {};
    const k = KITS[kit];
    if (!k || !cliente || !entrega) return res.status(400).json({ error: 'Pedido inválido.' });
    const origin = 'https://' + req.headers.host;
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    // Pix tem 5% de desconto (o checkout usa a mesma conta). O valor sempre é calculado aqui no servidor.
    const amount = metodo === 'pix' ? Math.round(k.preco * 95) : Math.round(k.preco * 100);
    const orderId = crypto.randomUUID();
    const body = {
      amount, paymentMethod: metodo === 'pix' ? 'pix' : 'credit_card',
      customer: { name: cliente.nome, email: cliente.email, document: { type: 'cpf', number: cliente.cpf } },
      items: [{ title: k.nome, unitPrice: amount, quantity: 1, tangible: true }],
      metadata: { provider: 'elite-carpet-premium', user_email: cliente.email, order_id: orderId,
        checkout_url: origin + '/checkout.html', shop_url: origin, vehicle: veiculo || '', phone: cliente.celular,
        shipping_address: `${entrega.rua}, ${entrega.numero} ${entrega.complemento || ''} - ${entrega.bairro}, ${entrega.cidade}/${entrega.uf} - CEP ${entrega.cep}` },
      ip, postbackUrl: origin + '/api/webhook'
    };
    if (metodo === 'pix') body.pix = { expiresInSeconds: 1800 };
    else { body.card = token; body.installments = Number(parcelas) || 1; }

    const r = await bh('/transactions', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) { console.error('BEEHIVE ERRO', JSON.stringify(r.raw)); return res.status(400).json({ error: 'Pagamento não aprovado. Confira os dados.' }); }
    const t = r.body;
    const qr = metodo === 'pix' ? (acharPix(r.raw) || (t.pix && (t.pix.qrCode || t.pix.qrcode)) || t.qrCode) : undefined;
    if (metodo === 'pix' && !qr) { console.error('PIX sem qrCode', JSON.stringify(r.raw)); return res.status(502).json({ error: 'Não foi possível gerar o Pix. Tente novamente.' }); }
    console.log('PEDIDO', JSON.stringify({ transacao: t.id, status: t.status, kit, veiculo, cliente, entrega }));
    res.status(200).json({ id: t.id, status: t.status, qr_code: qr });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao processar. Tente novamente.' }); }
};

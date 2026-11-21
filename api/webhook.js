// Recebe os avisos da Beehive quando o status de uma transação muda (paid, refused, refunded...).
module.exports = async (req, res) => {
  const ev = req.body || {};
  if (ev.type === 'transaction' && ev.data) {
    // TODO: aqui você pode enviar e-mail/WhatsApp quando status === 'paid'.
    console.log('WEBHOOK', ev.data.id, ev.data.status, ev.data.metadata && ev.data.metadata.order_id);
  }
  res.status(200).json({ ok: true });
};

// Consulta se o Pix já foi pago.
const { bh } = require('./_bh');
module.exports = async (req, res) => {
  const id = String(req.query.id || '').replace(/\D/g, '');
  if (!id) return res.status(400).json({ status: 'unknown' });
  const r = await bh('/transactions/' + id);
  res.status(200).json({ status: r.ok ? r.body.status : 'unknown' });
};

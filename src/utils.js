const crypto = require('crypto');

function generateReferenceID(id) {
  const hash =
    crypto.createHash("sha1").update(String(id)).digest("hex").replace(/\D/g, "").slice(0, 6) ||
    Math.floor(Math.random() * 999999);
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  const referenceId = `${hash}${timestamp}${random}`;
  return parseInt(referenceId, 17);
}

function toRupiah(num) {
  if (num === undefined || num === null) return '-';
  const n = Number(num);
  if (Number.isNaN(n)) return String(num);
  return n.toLocaleString('id-ID');
}

module.exports = { generateReferenceID, toRupiah };

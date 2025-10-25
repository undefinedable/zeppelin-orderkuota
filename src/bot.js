// ─────────────────────────────────────────────────────────────
// 🧩  Zeppelin Bot —  Teleggram bot for Orderkuota Payment Gateway Integration (Zeppelin API - Wrapper)
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const ZeppelinAPI = require('./zeppelin');
const { generateReferenceID, toRupiah } = require('./utils');
const { EXPIRY_TIME, BOT_TOKEN, ZEPPELIN_AUTH, API_URL } = require('./config');

class ZeppelinBot {
  constructor() {
    if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in environment');

    // ───────────── DEFINE BOT & API ─────────────
    this.bot = new Telegraf(BOT_TOKEN);
    this.service = new ZeppelinAPI({ apiUrl: API_URL, auth: ZEPPELIN_AUTH });

    // ───────────── FILE DATABASE ─────────────
    this.transactionsFile = path.join(__dirname, '../database/transactions.json');
    this.balanceFile = path.join(__dirname, '../database/balance.json');
    this.ensureFile(this.transactionsFile);
    this.ensureFile(this.balanceFile);
    this.userTransactions = this.readJSON(this.transactionsFile);
    this._setupHandlers();
  }

  // ───────────── FILE HANDLER ─────────────
  ensureFile(file) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2));
  }

  readJSON(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      return {};
    }
  }

  writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  // ───────────── TRANSACTIONS UTILS ─────────────
  addUserTransaction(userId, referenceId) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) {
      data[userId] = {
        limit: 0,
        data: []
      };
    }

    const userData = data[userId];

    if (userData.limit >= 1) {
      return { success: false, message: "Kamu masih memiliki transaksi yang belum selesai." };
    }

    userData.data.push({
      id: referenceId,
      status: "pending"
    });

    userData.limit = 1;

    this.writeJSON(this.transactionsFile, data);
    this.userTransactions = data;
    return { success: true };
  }

  updateTransactionStatus(userId, referenceId, status) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) return;

    const userData = data[userId];
    const trx = userData.data.find(t => t.id === referenceId);

    if (trx) trx.status = status;

    const hasPending = userData.data.some(t => t.status === "pending");
    userData.limit = hasPending ? 1 : 0;

    this.writeJSON(this.transactionsFile, data);
  }

  hasUnfinishedTransaction(userId) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) return false;
    const userData = data[userId];
    return userData.limit >= 1 || userData.data.some(t => t.status === "pending");
  }

  userOwnsTransaction(userId, referenceId) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) return false;
    return data[userId].data.some(t => t.id === referenceId);
  }

  canCancelTransaction(userId, referenceId) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) return { success: false, message: "Data pengguna tidak ditemukan." };
    
    const userData = data[userId];
    const trx = userData.data.find(t => t.id === referenceId);
    
    if (!trx) return { success: false, message: "Transaksi tidak ditemukan." };
    
    if (trx.status !== "pending") {
      return { success: false, message: `Transaksi dengan status '${trx.status}' tidak dapat dibatalkan.` };
    }
    return { success: true };
  }

  getUserHistory(userId, limit = 5) {
    const data = this.readJSON(this.transactionsFile);
    if (!data[userId]) return [];

    const userData = data[userId];
    return userData.data.slice(-limit).reverse();
  }

  // ───────────── BALANCE UTILS ─────────────
  updateBalance(userId, amount) {
    const saldo = this.readJSON(this.balanceFile);
    saldo[userId] = (saldo[userId] || 0) + amount;
    this.writeJSON(this.balanceFile, saldo);
    return saldo[userId];
  }

  getBalance(userId) {
    const saldo = this.readJSON(this.balanceFile);
    return saldo[userId] || 0;
  }

  // ───────────── HANDLERS ─────────────
  _setupHandlers() {
    // ─── /start ───
    this.bot.start((ctx) => {
      ctx.reply(
        '👋 *Selamat datang di Zeppelin Service!*\n\n' +
          '💠 Bot ini membantu Anda melakukan top-up saldo dengan aman dan cepat.\n\n' +
          '📘 *Perintah yang tersedia:*\n' +
          '• `/topup <nominal>` — Buat transaksi baru\n' +
          '• `/check <ref_id>` — Cek status transaksi\n' +
          '• `/cancel <ref_id>` — Batalkan transaksi\n' +
          '• `/saldo` — Lihat saldo akun Anda\n' +
          '• `/history` — Lihat 5 transaksi terakhir\n\n',
        { parse_mode: 'Markdown' }
      );
    });

    // ─── /topup ───
    this.bot.command('topup', async (ctx) => {
      const args = ctx.message.text.split(/\s+/);
      const amount = parseInt(args[1]);

      if (!amount || isNaN(amount))
        return ctx.reply('⚠️ Format salah. Gunakan contoh: `/topup 10000`', { parse_mode: 'Markdown' });
      if (amount < 1000)
        return ctx.reply('⚠️ Minimal top-up adalah Rp 1.000.', { parse_mode: 'Markdown' });

      if (this.hasUnfinishedTransaction(ctx.from.id))
        return ctx.reply('⚠️ Kamu masih memiliki transaksi yang belum selesai. Selesaikan atau batalkan dulu.');

      const refId = generateReferenceID(ctx.from.id);
      console.log(`[TOPUP] Membuat transaksi: ${refId} (${amount})`);

      try {
        const result = await this.service.createPayment(refId, amount, EXPIRY_TIME);
        if (!result.success)
          return ctx.reply(`❌ Gagal membuat transaksi. ${result.message || 'Silakan coba lagi.'}`);

        const d = result.data;
        const addResult = this.addUserTransaction(ctx.from.id, d.reference_id);
        if (!addResult.success) return ctx.reply(`❌ ${addResult.message}`);

        const caption = [
          '💳 *Transaksi Berhasil Dibuat*',
          '────────────────────────────',
          `🧾 *Reference ID:* ${d.reference_id}`,
          `💰 *Nominal:* Rp ${toRupiah(d.amount)}`,
          `💵 *Jumlah yang harus dibayar:* Rp ${toRupiah(d.paid_amount)}`,
          `📅 *Dibuat:* ${d.created_date_str}`,
          `⌛ *Kadaluarsa:* ${d.expired_date_str}`,
          '────────────────────────────',
          `⚠️ Pastikan Anda membayar *sejumlah Rp ${toRupiah(d.paid_amount)}* ke *${d.qris.qris_name}* sebelum waktu kadaluarsa.`,
        ].join('\n');

        await ctx.replyWithPhoto(d.qris.qris_image_url, {
          caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔍 Cek Status', callback_data: `check:${d.reference_id}` },
                { text: '❌ Batalkan', callback_data: `cancel:${d.reference_id}` },
              ],
            ],
          },
        });
      } catch (err) {
        console.error('❌ Error Topup:', err.response?.data || err.message);
        ctx.reply('Terjadi kesalahan saat membuat transaksi. Silakan coba lagi nanti.');
      }
    });

    // ─── /history ───
    this.bot.command('history', (ctx) => {
      const userId = ctx.from.id;
      const history = this.getUserHistory(userId, 5);

      if (history.length === 0)
        return ctx.reply('📭 Kamu belum memiliki riwayat transaksi.');

      let text = '🧾 *5 Transaksi Terakhir*\n────────────────────────────\n';
      history.forEach((t, i) => {
        text += `${i + 1}. ID: \`${t.id}\`\nStatus: ${t.status.toUpperCase()}\n\n`;
      });

      ctx.reply(text, { parse_mode: 'Markdown' });
    });

    // ─── /saldo ───
    this.bot.command('saldo', async (ctx) => {
      try {
        const saldo = this.getBalance(ctx.from.id);
        const msg = [
          '💼 *Informasi Saldo Akun Anda*',
          '────────────────────────────',
          `👤 *Nama:* ${ctx.from.first_name || 'Pengguna'}`,
          `💰 *Saldo Saat Ini:* Rp ${toRupiah(saldo)}`,
          '────────────────────────────',
          saldo > 0
            ? '✨ Anda dapat menggunakan saldo untuk melakukan transaksi di bot ini.'
            : '⚠️ Saldo Anda masih kosong. Gunakan perintah `/topup <nominal>` untuk menambah saldo.',
        ].join('\n');

        ctx.reply(msg, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('❌ Error Saldo:', err.message);
        ctx.reply('Terjadi kesalahan saat mengambil data saldo Anda.');
      }
    });

    // ─── /check ───
    this.bot.command('check', async (ctx) => {
      const args = ctx.message.text.split(/\s+/);
      const refId = args[1];
      if (!refId)
        return ctx.reply('⚠️ Gunakan format: `/check <reference_id>`', { parse_mode: 'Markdown' });

      if (!this.userOwnsTransaction(ctx.from.id, refId))
        return ctx.reply('⚠️ Transaksi tidak tersebut ditemukan.');

      try {
        const res = await this.service.checkStatus(refId);
        if (!res.success) return ctx.reply(`❌ ${res.message || 'Gagal memeriksa status transaksi.'}`);

        const d = res.data;
        let msg = [
          '📋 *Status Pembayaran*',
          '────────────────────────────',
          `📌 *Status:* ${d.payment_status.toUpperCase()}`,
          `🧾 *Reference ID:* ${d.reference_id}`,
          `💰 *Nominal:* Rp ${toRupiah(d.amount)}`,
          `💵 *Jumlah yang harus dibayar:* Rp ${toRupiah(d.paid_amount)}`,
          `📅 *Dibuat:* ${d.created_date_str}`,
          `⌛ *Kadaluarsa:* ${d.expired_date_str}`,
          '────────────────────────────',
        ];

        switch (d.payment_status) {
          case 'success':
            const saldoBaru = this.updateBalance(ctx.from.id, d.amount);
            this.updateTransactionStatus(ctx.from.id, refId, "success");
            msg.push('✅ *Pembayaran diterima dengan sukses!*');
            msg.push(`💰 *Saldo Anda sekarang:* Rp ${toRupiah(saldoBaru)}`);
            break;
          case 'pending':
            msg.push('🕐 *Menunggu pembayaran Anda.*');
            break;
          case 'failed':
            this.updateTransactionStatus(ctx.from.id, refId, "failed");
            msg.push('❌ *Transaksi dibatalkan.*');
            break;
          case 'expired':
            this.updateTransactionStatus(ctx.from.id, refId, "expired");
            msg.push('⏳ *Transaksi kadaluarsa.*');
            break;
        }

        ctx.reply(msg.join('\n'), { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('❌ Error Check:', err.response?.data || err.message);
        ctx.reply('Terjadi kesalahan saat memeriksa status transaksi.');
      }
    });

    // ─── /cancel ───
    this.bot.command('cancel', async (ctx) => {
      const args = ctx.message.text.split(/\s+/);
      const refId = args[1];
      if (!refId)
        return ctx.reply('⚠️ Gunakan format: `/cancel <reference_id>`', { parse_mode: 'Markdown' });

      if (!this.userOwnsTransaction(ctx.from.id, refId))
        return ctx.reply('⚠️ Transaksi tidak tersebut ditemukan.');

      const validation = this.canCancelTransaction(ctx.from.id, refId);
      if (!validation.success) return ctx.reply(`⚠️ ${validation.message}`);

      try {
        const res = await this.service.cancelPayment(refId);
        if (res.success) {
          this.updateTransactionStatus(ctx.from.id, refId, "failed");
          ctx.reply(`✅ Transaksi *${refId}* berhasil dibatalkan.`, { parse_mode: 'Markdown' });
        } else {
          ctx.reply(`⚠️ Gagal membatalkan transaksi *${refId}*.`);
        }
      } catch (err) {
        console.error('❌ Error Cancel:', err.message);
        ctx.reply('Terjadi kesalahan saat membatalkan transaksi.');
      }
    });

    // ─── CALLBACK HANDLER ───
    this.bot.on('callback_query', async (ctx) => {
      try {
        const [action, refId] = ctx.callbackQuery.data.split(':');
        if (!this.userOwnsTransaction(ctx.from.id, refId))
          return ctx.answerCbQuery('🚫 Transaksi ini bukan milik Anda.', { show_alert: true });

        if (action === 'check') {
          const res = await this.service.checkStatus(refId);
          const d = res.data;
          let msg = [
            '📋 *Status Pembayaran*',
            '────────────────────────────',
            `📌 *Status:* ${d.payment_status.toUpperCase()}`,
            `🧾 *Reference ID:* ${d.reference_id}`,
            `💰 *Nominal:* Rp ${toRupiah(d.amount)}`,
            `💵 *Jumlah yang harus dibayar:* Rp ${toRupiah(d.paid_amount)}`,
            `📅 *Dibuat:* ${d.created_date_str}`,
            `⌛ *Kadaluarsa:* ${d.expired_date_str}`,
            '────────────────────────────',
          ];

          if (d.payment_status === 'success') {
            const saldoBaru = this.updateBalance(ctx.from.id, d.amount);
            this.updateTransactionStatus(ctx.from.id, refId, "success");
            msg.push('✅ *Pembayaran diterima!*');
            msg.push(`💰 Saldo Anda: Rp ${toRupiah(saldoBaru)}`);
          } else if (d.payment_status === 'pending') {
            msg.push('🕐 *Menunggu pembayaran Anda.*');
          } else if (d.payment_status === 'failed') {
            this.updateTransactionStatus(ctx.from.id, refId, "failed");
            msg.push('❌ *Transaksi dibatalkan.*');
          } else if (d.payment_status === 'expired') {
            this.updateTransactionStatus(ctx.from.id, refId, "expired");
            msg.push('⏳ *Transaksi kadaluarsa.*');
          }

          await ctx.reply(msg.join('\n'), { parse_mode: 'Markdown' });
          await ctx.answerCbQuery('✅ Status diperbarui.');
        }

        if (action === 'cancel') {
          const validation = this.canCancelTransaction(ctx.from.id, refId);
          if (!validation.success) {
            return ctx.answerCbQuery(validation.message, { show_alert: true });
          }

          const res = await this.service.cancelPayment(refId);
          if (res.success) {
            this.updateTransactionStatus(ctx.from.id, refId, "failed");
            await ctx.reply(`✅ Transaksi *${refId}* berhasil dibatalkan.`, { parse_mode: 'Markdown' });
          } else {
            await ctx.reply(`⚠️ Gagal membatalkan transaksi *${refId}*.`);
          }
          await ctx.answerCbQuery();
        }
      } catch (err) {
        console.error('❌ Callback Error:', err.message);
        await ctx.answerCbQuery('Terjadi kesalahan saat memproses.', { show_alert: true });
      }
    });
  }

  

  // ───────────── LAUNCH ─────────────
  launch() {
    this.bot.launch();
    console.log('🚀 Zeppelin Bot is online.');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

module.exports = ZeppelinBot;

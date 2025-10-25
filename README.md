# 🧩 zeppelin-orderkuota
A lightweight, open-source integration that enables developers to use Orderkuota as a payment gateway through the Zeppelin API, implemented directly in a Telegram bot.


[![Node.js](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-stable-success)](#)

---

## ⚠️ Disclaimer

> [!CAUTION]
> This project is an **unofficial integration** with [OrderKuota](https://orderkuota.com) — it is **not affiliated, endorsed, or maintained** by OrderKuota in any way.  
>  
> Use this API **at your own risk (DWYOR)**.  
> The developer **does not guarantee** security, stability, or compliance with OrderKuota’s Terms of Service.  
>  
> Using this for illegal activities (including gambling (judol) payment gateways or fraudulent use) **may result in suspension or permanent account ban**.  
>  
> ⚠️ Please **use responsibly and ethically.**

---

## Overview

**Zeppelin Orderkuota** is a simple, modular Telegram bot built with [Telegraf](https://telegraf.js.org/).  
It connects directly to the **[Zeppelin API](https://zeppelin-api.vercel.app)** to manage:
- 💳 Top-up transactions  
- 🔍 Payment status checks  
- 💰 Balance tracking  
- 🧾 Transaction history  

Fully written in Node.js, designed for easy modification and self-hosting.

---

## 🚀 Quick Start


### 1. Clone & Install
```bash
git clone https://github.com/undefinedable/zeppelin-orderkuota.git
cd zeppelin-orderkuota
npm install
```

---
### 2. Get Auth Token and Username

#### 🧩 How to get username:
1. Open the **Orderkuota** app on your phone.  
2. Go to **Account → Profile → Username**.  
3. Copy your **username** — you’ll need it for authentication.

#### 🔑 How to get auth token:
1. Visit [https://zeppelin-api.vercel.app/get-auth](https://zeppelin-api.vercel.app/get-auth).  
2. Enter your **Orderkuota username**.  
3. Input the **OTP** you receive to generate your auth token.  
4. Copy the generated **auth token** for later use.

---

### 3. Configure Environment

Create a `.env` file in the project root directory and add the following configuration:

```bash
BOT_TOKEN=1234567890:AAAbbbCCCdddEEEfffGGGhhhIIIjjj
AUTH_USERNAME=your_orderkuota_username
AUTH_TOKEN=your_generated_auth_token
API_URL=https://zeppelin-api.vercel.app
EXPIRY_TIME=5
```
> **⚙️ Notes**
> - Replace all placeholder values with your actual credentials.  
> - **`BOT_TOKEN`** — Telegram Bot API token obtained from [@BotFather](https://t.me/BotFather).  
> - **`AUTH_USERNAME`** — your registered Orderkuota username.  
> - **`AUTH_TOKEN`** — authentication token generated via [Zeppelin API](https://zeppelin-api.vercel.app/get-auth).  
> - **`API_URL`** — base endpoint for the Zeppelin API (default: `https://zeppelin-api.vercel.app`).  
> - **`EXPIRY_TIME`** — defines how long (in minutes) a pending transaction remains valid before expiring.

---

### 4. Run the Bot

Start the bot locally:

```bash
node index.js
```

Or run it in the background using [PM2](https://pm2.keymetrics.io/):

```bash
pm2 start index.js --name zeppelin-bot
```

> 💡 **Tips:**
>
> * Use `pm2 logs zeppelin-bot` to view live logs.
> * Use `pm2 restart zeppelin-bot` to restart after edits.
> * Use `pm2 stop zeppelin-bot` to stop the bot safely.

---

## 💬 Bot Commands

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `/start`           | Display bot information         |
| `/topup <nominal>` | Create a new top-up transaction |
| `/check <ref_id>`  | Check transaction status        |
| `/cancel <ref_id>` | Cancel a pending transaction    |
| `/saldo`           | View current balance            |
| `/history`         | View last 5 transactions        |


---

## 🧠 Notes

* Transactions and balances are stored locally in JSON files.
* The bot automatically handles pending, expired, and successful payments.
* Designed to be simple to extend for other payment providers or APIs.

---

## 🪪 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.
Built with ❤️ for developers who love clean, functional code.

---

### ⚙️ Tech Stack

* [Node.js](https://nodejs.org/)
* [Telegraf](https://telegraf.js.org/)
* [Zeppelin API](https://zeppelin-api.vercel.app)

---

const axios = require('axios');

class ZeppelinAPI {
  constructor({ apiUrl, auth }) {
    this.apiUrl = apiUrl;
    this.auth = auth;
    this.client = axios.create({ baseURL: this.apiUrl, timeout: 10000 });
  }

  async createPayment(referenceId, amount, expiry) {
    const payload = this.auth;
    const params = { reference_id: referenceId, amount, expiry };
    const res = await this.client.post('/api/v1/payments/create', payload, { params });
    return res.data;
  }

  async checkStatus(referenceId) {
    const res = await this.client.post(`/api/v1/payments/${referenceId}/status`, this.auth);
    return res.data;
  }

  async cancelPayment(referenceId) {
    const res = await this.client.post(`/api/v1/payments/${referenceId}/cancel`, this.auth);
    return res.data;
  }
}

module.exports = ZeppelinAPI;

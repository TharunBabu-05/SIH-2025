const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async verifyToken(token: string) {
    return await this.request('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  logout() {
    this.clearToken();
  }

  // Data endpoints
  async getRecentData(count = 12) {
    return await this.request(`/api/data/recent?count=${count}`);
  }

  async get24HourStats() {
    return await this.request('/api/data/stats');
  }

  async getFaultEvents(limit = 50) {
    return await this.request(`/api/data/faults?limit=${limit}`);
  }

  async downloadLogs() {
    const token = this.getToken();
    const url = `${API_BASE_URL}/api/data/download`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'ksebl_sensor_logs.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  async createBackup() {
    return await this.request('/api/data/backup', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();

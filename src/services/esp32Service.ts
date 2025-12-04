// WebSocket service for real-time ESP32 communication
class ESP32Service {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private url: string,
    private onMessage: (data: any) => void,
    private onConnectionChange: (connected: boolean) => void
  ) {}

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('Connected to ESP32');
        this.onConnectionChange(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from ESP32');
        this.onConnectionChange(false);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, this.reconnectInterval);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }
}

// HTTP API service for ESP32 (alternative to WebSocket)
class ESP32ApiService {
  constructor(private baseUrl: string) {}

  async getSensorData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/sensor-data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error;
    }
  }

  async sendCommand(command: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  }
}

export { ESP32Service, ESP32ApiService };

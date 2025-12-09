class BackendWebSocketService {
  private url: string;
  private ws: WebSocket | null;
  private onMessage: ((data: any) => void) | null;
  private onConnectionChange: ((connected: boolean) => void) | null;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private isIntentionalClose: boolean;

  constructor(url: string, onMessage: (data: any) => void, onConnectionChange: (connected: boolean) => void) {
    this.url = url;
    this.ws = null;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.isIntentionalClose = false;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ Connected to backend WebSocket');
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle direct ESP32 format (I1, V1, I2, V2, I3, V3)
          if (message.I1 !== undefined && message.V1 !== undefined) {
            const sensorData = {
              timestamp: new Date().toISOString(),
              R_V: message.V1 || 0,
              R_I: message.I1 || 0,
              Y_V: message.V2 || 0,
              Y_I: message.I2 || 0,
              B_V: message.V3 || 0,
              B_I: message.I3 || 0,
              fault: false,
              fault_type: null
            };
            this.onMessage?.(sensorData);
          }
          // Handle backend server format
          else if (message.type === 'sensor_data') {
            this.onMessage?.(message.data);
          } else if (message.type === 'connected') {
            console.log(message.message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        this.onConnectionChange?.(false);
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket closed', event.code, event.reason);
        this.onConnectionChange?.(false);

        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.onConnectionChange?.(false);
    }
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
}

export default BackendWebSocketService;

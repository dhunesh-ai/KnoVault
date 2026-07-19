import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';
import { DeviceEventEmitter } from 'react-native';
import { syncWorkspace } from './sync';

class SyncWebSocket {
  private socket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private isDesiredStateConnected = false;
  private isWsConnected = false;

  public async connect() {
    this.isDesiredStateConnected = true;
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        return;
      }
      this.socket.close();
    }

    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (!token) {
        console.warn('[SyncWS Mobile] No token found in SecureStore. Cannot connect.');
        return;
      }

      const wsUrl = env.API_BASE_URL.replace(/^http/, 'ws') + `/api/sync/ws?token=${encodeURIComponent(token)}`;
      console.log('[SyncWS Mobile] Connecting to sync stream...');

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[SyncWS Mobile] Connection established.');
        this.isWsConnected = true;
        this.reconnectDelay = 2000; // Reset delay
        this.stopPolling();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SyncWS Mobile] Message received:', data);
          if (data.event === 'reminders_changed') {
            console.log('[SyncWS Mobile] Change detected. Triggering sync workspace...');
            DeviceEventEmitter.emit('TRIGGER_AUTO_SYNC');
          }
        } catch (e) {
          console.error('[SyncWS Mobile] Error parsing WS message:', e);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`[SyncWS Mobile] Connection closed (code: ${event.code}).`);
        this.socket = null;
        this.isWsConnected = false;
        if (this.isDesiredStateConnected) {
          this.scheduleReconnect();
          this.startPolling();
        }
      };

      this.socket.onerror = (err) => {
        console.error('[SyncWS Mobile] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[SyncWS Mobile] Connect failed:', err);
      this.isWsConnected = false;
      if (this.isDesiredStateConnected) {
        this.scheduleReconnect();
        this.startPolling();
      }
    }
  }

  public disconnect() {
    console.log('[SyncWS Mobile] Disconnecting...');
    this.isDesiredStateConnected = false;
    this.isWsConnected = false;
    this.stopPolling();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      console.log(`[SyncWS Mobile] Reconnecting after ${this.reconnectDelay}ms...`);
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  private startPolling() {
    if (this.pollInterval) return;
    console.log('[SyncWS Mobile] Starting background polling fallback (30s interval)...');
    this.pollInterval = setInterval(async () => {
      if (!this.isWsConnected && this.isDesiredStateConnected) {
        console.log('[SyncWS Mobile] Fallback polling: pulling updates from server...');
        try {
          await syncWorkspace();
        } catch (e) {
          console.warn('[SyncWS Mobile] Fallback polling sync failed:', e);
        }
      }
    }, 30000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[SyncWS Mobile] Stopped background polling fallback.');
    }
  }
}

export const syncWebSocket = new SyncWebSocket();

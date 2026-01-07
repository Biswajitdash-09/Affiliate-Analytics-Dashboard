/**
 * Real-time Updates with Server-Sent Events (SSE)
 * Provides real-time data updates for dashboard components
 */

import { logWarning, logInfo, logError } from '@/lib/error-handler';
import { generateCSRFToken } from '@/lib/csrf';

// Active connections store (per session)
const connections = new Map();

// Event types for real-time updates
export const EventTypes = {
  CLICK: 'click',
  CONVERSION: 'conversion',
  REVENUE: 'revenue',
  ANALYTICS: 'analytics',
  AFFILIATE_UPDATE: 'affiliate_update',
  CAMPAIGN_UPDATE: 'campaign_update',
  PAYOUT: 'payout',
  LEADERBOARD_UPDATE: 'leaderboard_update',
};

/**
 * SSE message format
 */
class SSEMessage {
  constructor(event, data) {
    this.name = event;
    this.data = data;
    this.id = Date.now().toString();
    this.retry = 3000;
  }

  toString() {
    let message = '';

    if (this.id) {
      message += `id: ${this.id}\n`;
    }

    if (this.event) {
      message += `event: ${this.event}\n`;
    }

    if (this.retry) {
      message += `retry: ${this.retry}\n`;
    }

    if (this.data) {
      const dataStr = typeof this.data === 'string'
        ? this.data
        : JSON.stringify(this.data);
      message += `data: ${dataStr}\n`;
    }

    message += '\n';
    return message;
  }
}

/**
 * Create an SSE response stream
 * @param {string} clientId - Unique client identifier
 * @param {Function} onMessage - Callback for sending messages
 * @returns {Response} SSE response stream
 */
export function createSSEStream(clientId, onMessage) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const encoder = new TextEncoder();
  let keepAliveInterval;
  let isActive = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage = new SSEMessage('connected', {
        clientId,
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(connectMessage.toString()));

      // Setup message handler
      connections.set(clientId, {
        controller,
        channel: null,
        isActive: true,
      });

      // Send keep-alive heartbeat every 30 seconds
      keepAliveInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(keepAliveInterval);
          return;
        }
        const heartbeat = new SSEMessage('heartbeat', { timestamp: Date.now() });
        controller.enqueue(encoder.encode(heartbeat.toString()));
      }, 30000);

      // Listen for messages if callback provided
      if (onMessage) {
        onMessage((event, data) => {
          if (!isActive) return;
          const message = new SSEMessage(event, data);
          controller.enqueue(encoder.encode(message.toString()));
        });
      }
    },

    cancel() {
      isActive = false;
      clearInterval(keepAliveInterval);
      connections.delete(clientId);
      logInfo('SSE connection closed', { clientId });
    },
  });

  return new Response(stream, { headers });
}

/**
 * Broadcast a message to all connections (or filtered)
 * @param {string} event - Event type
 * @param {*} data - Event data
 * @param {string} clientId - Optional: specific client ID
 */
export function broadcast(event, data, clientId = null) {
  const message = new SSEMessage(event, data);

  if (clientId) {
    // Send to specific client
    const connection = connections.get(clientId);
    if (connection && connection.controller && connection.isActive) {
      const encoder = new TextEncoder();
      try {
        connection.controller.enqueue(encoder.encode(message.toString()));
      } catch (error) {
        logWarning('Failed to send SSE message', { clientId, error });
        connection.isActive = false;
      }
    }
  } else {
    // Broadcast to all active connections
    const encoder = new TextEncoder();
    const staleConnections = [];

    for (const [id, connection] of connections.entries()) {
      if (!connection.isActive || !connection.controller) {
        staleConnections.push(id);
        continue;
      }

      try {
        connection.controller.enqueue(encoder.encode(message.toString()));
      } catch (error) {
        logWarning('Failed to broadcast SSE message', { clientId: id, error });
        connection.isActive = false;
        staleConnections.push(id);
      }
    }

    // Clean up stale connections
    for (const id of staleConnections) {
      connections.delete(id);
    }
  }
}

/**
 * Get active connections count
 */
export function getActiveConnectionsCount() {
  let count = 0;
  for (const connection of connections.values()) {
    if (connection.isActive) count++;
  }
  return count;
}

/**
 * Client for consuming SSE on frontend
 */
export class RealtimeClient {
  constructor(options = {}) {
    this.url = options.url || '/api/realtime';
    this.eventHandlers = new Map();
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxRetries = options.maxRetries || 10;
    this.retryCount = 0;
    this.isConnected = false;
    this.eventSource = null;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onError = options.onError;
  }

  /**
   * Connect to SSE stream
   */
  connect() {
    if (this.eventSource) {
      logWarning('Already connected');
      return;
    }

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        logInfo('SSE connected');
        this.isConnected = true;
        this.retryCount = 0;
        if (this.onConnect) this.onConnect();
      };

      this.eventSource.onerror = (error) => {
        logWarning('SSE connection error', { error });
        this.isConnected = false;
        if (this.onError) this.onError(error);

        // Attempt reconnection
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          logInfo(`Reconnecting... (${this.retryCount}/${this.maxRetries})`);
          setTimeout(() => this.reconnect(), this.reconnectInterval);
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(event.type, data);
        } catch (error) {
          logWarning('Failed to parse SSE message', { error, data: event.data });
        }
      };

      // Register event handlers
      for (const [event, handler] of this.eventHandlers.entries()) {
        this.eventSource.addEventListener(event, handler);
      }

    } catch (error) {
      logError('Failed to connect to SSE', { error });
      if (this.onError) this.onError(error);
    }
  }

  /**
   * Reconnect to SSE stream
   */
  reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), this.reconnectInterval);
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      if (this.onDisconnect) this.onDisconnect();
    }
  }

  /**
   * Subscribe to events
   */
  on(event, handler) {
    if (this.eventSource) {
      this.eventSource.addEventListener(event, handler);
    } else {
      // Store for when connection is established
      this.eventHandlers.set(event, handler);
    }
  }

  /**
   * Unsubscribe from events
   */
  off(event, handler) {
    if (this.eventSource) {
      this.eventSource.removeEventListener(event, handler);
    }
    this.eventHandlers.delete(event);
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      try {
        handlers(data);
      } catch (error) {
        logError('SSE event handler error', { event, error });
      }
    }
  }
}

/**
 * React hook for consuming SSE updates in React components
 */
export function useRealtimeUpdates(options = {}) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState(null);
  const clientRef = React.useRef(null);

  React.useEffect(() => {
    const client = new RealtimeClient({
      ...options,
      onConnect: () => {
        setIsConnected(true);
        if (options.onConnect) options.onConnect();
      },
      onDisconnect: () => {
        setIsConnected(false);
        if (options.onDisconnect) options.onDisconnect();
      },
      onError: (error) => {
        if (options.onError) options.onError(error);
      },
    });

    // Subscribe to events
    if (options.events) {
      for (const [event, handler] of Object.entries(options.events)) {
        client.on(event, handler);
      }
    }

    // Keep track of last event
    client.on('*', (event, data) => {
      setLastEvent({ event, data, timestamp: Date.now() });
    });

    // Connect
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, []);

  // Update event handlers when they change
  React.useEffect(() => {
    if (clientRef.current && options.events) {
      // Clear previous handlers
      for (const event of clientRef.current.eventHandlers.keys()) {
        clientRef.current.off(event);
      }

      // Register new handlers
      for (const [event, handler] of Object.entries(options.events)) {
        clientRef.current.on(event, handler);
      }
    }
  }, [options.events]);

  return {
    isConnected,
    lastEvent,
    send: clientRef.current?.send.bind(clientRef.current),
  };
}

// Helper for analytics real-time updates
export function notifyAnalyticsUpdate(data) {
  broadcast(EventTypes.ANALYTICS, data);
}

export function notifyClickUpdate(data) {
  broadcast(EventTypes.CLICK, data);
}

export function notifyConversionUpdate(data) {
  broadcast(EventTypes.CONVERSION, data);
}

export function notifyRevenueUpdate(data) {
  broadcast(EventTypes.REVENUE, data);
}

export function notifyLeaderboardUpdate(data) {
  broadcast(EventTypes.LEADERBOARD_UPDATE, data);
}

export default {
  EventTypes,
  createSSEStream,
  broadcast,
  getActiveConnectionsCount,
  RealtimeClient,
  useRealtimeUpdates,
  notifyAnalyticsUpdate,
  notifyClickUpdate,
  notifyConversionUpdate,
  notifyRevenueUpdate,
  notifyLeaderboardUpdate,
};
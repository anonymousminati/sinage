/**
 * React Hook for Socket.IO Connection Status
 * 
 * Provides real-time connection status updates for Socket.IO client
 * with automatic re-renders when connection status changes.
 */

import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { ConnectionStatus } from '../services/socketService';

export function useSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(socketService.getConnectionStatus());

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = socketService.onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Get initial status
    setStatus(socketService.getConnectionStatus());

    return unsubscribe;
  }, []);

  return {
    ...status,
    isConnected: status.connected,
    isConnecting: status.connecting,
    isReconnecting: status.reconnecting,
  };
}

export default useSocketStatus;
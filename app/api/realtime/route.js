import { createSSEStream } from '@/lib/realtime';
import jwt from 'jsonwebtoken';
import { logWarning, logInfo } from '@/lib/error-handler';
import { ObjectId } from 'mongodb';

/**
 * GET /api/realtime
 * Server-Sent Events endpoint for real-time updates
 */
export async function GET(request) {
  const headersList = headers();
  const authHeader = request.headers.get('authorization');

  // Try to decode JWT token if provided
  // NOTE: This is optional - we could skip auth and handle it differently
  let user = null;
  const token = headersList.get('authorization')?.split(' ')[1] ||
               headersList.get('cookie')?.match(/token=([^;]+)/)?.[1];
            
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      logWarning('SSE auth verification failed', { error });
      // Continue without auth - SSE can work without it
    }
  }
  
  // For unauthenticated connections, we can still broadcast updates
  // The client will handle filtering on the frontend

  // Generate unique client ID
  const clientId = `${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create SSE stream
  const stream = createSSEStream(clientId, (send) => {
    // This callback receives the send function
    // We can use it to subscribe to database change events or external services
    
    logInfo('SSE client connected', { clientId, user: user?.id });

    // Example: Listen to Redis pub/sub for distributed updates
    // if (redisClient) {
    //   const subscriber = redisClient.duplicate();
    //   await subscriber.connect();
    //   subscriber.subscribe('realtime-updates', (message) => {
    //     const data = JSON.parse(message);
    //     send(data.event, data.payload);
    //   });
    // }
  });

  return stream;
}
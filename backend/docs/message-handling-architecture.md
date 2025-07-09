# Message Handling Architecture

## Overview

This document describes how the AI messaging backend processes messages from user input to final storage. The system is designed for high performance, reliability, and cost efficiency through intelligent caching and batch writing strategies.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   Socket.io  │────▶│   Message   │
│ (Frontend)  │◀────│    Server    │◀────│   Handler   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Redis     │◀────│   BullMQ    │
                    │    Cache     │     │   Queue     │
                    └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Batch     │     │   Message   │
                    │   Writer     │◀────│   Worker    │
                    └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Firebase    │     │  DeepSeek   │
                    │  Firestore   │     │     API     │
                    └──────────────┘     └─────────────┘
```

## The Life of a Message

### Phase 1: User Message Reception (0-50ms)

1. **Client Sends Message** (`message:send` event)
   - User types message in frontend
   - Socket.io client emits to server
   - Contains: `characterId`, `content`, `type`

2. **Socket Handler Receives** (`simpleMessageHandler.js`)
   - Validates user authentication
   - Validates message data
   - Constructs `conversationId` as `userId_characterId`

3. **Create Message Object**
   ```javascript
   {
     id: "msg_1234567890_abc123",
     sender: "user",
     type: "text",
     content: "Hello AI!",
     timestamp: 1234567890,
     conversationId: "userId_characterId"
   }
   ```

4. **Immediate Redis Cache** (`cacheService.js`)
   - Message pushed to Redis list: `aim:messages:conversationId`
   - TTL: 1 hour (configurable)
   - Ensures instant message availability

5. **Real-time Broadcast**
   - Message emitted to all users in conversation room
   - Excludes sender (they already have it)
   - Other users see message immediately

6. **Queue AI Response Job** (`messageQueue.js`)
   - Job added to BullMQ queue: `message-processing`
   - Contains full context for AI processing
   - Returns success to client immediately

### Phase 2: AI Response Generation (1-5 seconds)

7. **Message Worker Picks Up Job** (`messageWorker.js`)
   - BullMQ worker processes job
   - Concurrency: 5 parallel jobs
   - Auto-retry on failure

8. **Fetch Required Data**
   - **Character Data**: Redis first, Firebase fallback
   - **Conversation History**: Last 20 messages (see detailed process below)
   - All data sources logged for debugging

   **How "Last 20 Messages" Works:**
   
   **Path A - Redis Cache Hit (Fast: ~10ms)**
   ```javascript
   // Redis key: aim:messages:{conversationId}
   // Structure: List with newest messages at the beginning
   const messages = await redis.lRange(key, 0, 19); // Get first 20 items
   return messages.map(msg => JSON.parse(msg)).reverse(); // Chronological order
   ```
   
   **Path B - Cache Miss → Firebase (Slower: ~200ms)**
   ```javascript
   // 1. Fetch entire conversation document
   const doc = await conversationRef.get();
   const allMessages = doc.data().messages || [];
   
   // 2. Sort chronologically and take last 20
   const lastTwenty = allMessages
     .sort((a, b) => a.timestamp - b.timestamp)
     .slice(-20); // Most recent 20 messages
   
   // 3. Populate Redis cache for future requests
   for (const message of lastTwenty) {
     await redis.lPush(cacheKey, JSON.stringify(message));
   }
   ```
   
   **Why This Design:**
   - Redis stores messages in reverse order (newest first) for O(1) retrieval
   - Firebase stores all messages in a single document array
   - Cache miss triggers full cache population for optimal future performance
   - 20 messages provide sufficient context without overwhelming the AI model

9. **Emit AI Typing Indicator**
   ```javascript
   io.emit('typing:start', {
     userId: characterId,
     isAI: true,
     conversationId,
     timestamp
   })
   ```

10. **Generate AI Response** (`deepseekService.js`)
    - Sends context to DeepSeek API
    - Model: `deepseek-chat`
    - Includes character personality & conversation history

11. **Create AI Message Object**
    ```javascript
    {
      id: "msg_1234567891_xyz789",
      sender: "character",
      type: "text",
      content: "Hello! How can I help you?",
      timestamp: 1234567891,
      conversationId: "userId_characterId",
      characterId: "characterId"
    }
    ```

12. **Cache AI Message**
    - Pushed to same Redis list
    - Maintains conversation order

13. **Stop Typing & Emit Response**
    - Typing indicator stopped
    - AI message broadcasted to room
    - Users see response in real-time

### Phase 3: Delayed Batch Writing (2+ minutes)

14. **Queue for Batch Write** (`messageWorker.js`)
    - Both messages added to pending queue
    - Metadata stored (userId, characterId)
    - Write timer set for 2 minutes

    Redis Keys:
    - `pending_messages:conversationId` (List)
    - `conversation_meta:conversationId` (Hash)
    - `write_queue` (Sorted Set - score is write time)

15. **Batch Writer Polling** (`batchWriteWorker.js`)
    - Polls every 30 seconds
    - Checks sorted set for due conversations
    - Score <= current timestamp = ready to write

16. **Batch Write Process**
    - Fetches all pending messages
    - Validates batch size (max 500 messages)
    - Attempts Firebase write with retry logic

17. **Firebase Write** (`firebaseService.js`)
    - Single document update
    - Uses `arrayUnion` for atomic append
    - Updates metadata (lastMessage, messageCount)
    - Monitors document size (warns at 800KB)

18. **Success Path**
    - Redis keys cleaned up
    - Removed from write queue
    - Success logged

### Phase 4: Error Handling

19. **Retry Logic**
    - 3 attempts with exponential backoff
    - Delays: 1s, 2s, 4s
    - Each failure logged

20. **Dead Letter Queue (DLQ)**
    - Failed after all retries → DLQ
    - Stores complete context for recovery
    - Removes from write queue (prevents infinite retry)
    - Key: `dlq:failed_writes`

## Component Breakdown

### Socket Handler (`simpleMessageHandler.js`)
- Handles real-time message events
- Manages room subscriptions
- Validates and routes messages
- Provides typing indicators

### Message Queue (`messageQueue.js`)
- BullMQ implementation
- Reliable job processing
- Automatic retries
- Job persistence in Redis

### Message Worker (`messageWorker.js`)
- Processes queued messages
- Integrates with AI service
- Manages caching strategy
- Handles batch write queuing

### Cache Service (`cacheService.js`)
- Redis-first architecture
- Automatic TTL management
- List-based message storage
- High-performance reads

### Batch Write Worker (`batchWriteWorker.js`)
- Polls for due writes
- Batches messages efficiently
- Handles retries and failures
- Manages DLQ for failed writes

### Firebase Service (`firebaseService.js`)
- Optimized single-document design
- Atomic array operations
- Document size monitoring
- Conversation management

## Data Storage Strategy

### Redis (Immediate Storage)
- **Purpose**: Fast reads, temporary storage
- **Message Lists**: `aim:messages:{conversationId}`
- **Pending Writes**: `pending_messages:{conversationId}`
- **Write Queue**: Sorted set with timestamps
- **TTLs**: 1 hour for messages, 15 mins for buffers

**Redis Message List Structure:**
```
aim:messages:userId_characterId
├─ [0] → Latest message (JSON string)
├─ [1] → Second latest message
├─ [2] → Third latest message
└─ [19] → 20th latest message
```

**How Messages Are Added:**
- New messages: `LPUSH` (adds to beginning of list)
- Reading history: `LRANGE 0 19` (gets first 20)
- Result reversed to show chronological order (oldest → newest)

**Cache Population Strategy:**
- On cache miss: Fetch all messages from Firebase
- Sort chronologically, take last 20
- Push each message to Redis list in reverse order
- Future requests hit Redis cache (fast path)

### Firebase (Persistent Storage)
- **Purpose**: Long-term storage, source of truth
- **Design**: Single document per conversation
- **Structure**:
  ```javascript
  {
    conversationId: "userId_characterId",
    userId: "userId",
    characterId: "characterId",
    messages: [...], // Array of all messages
    messageCount: 150,
    lastMessage: "Latest message preview",
    createdAt: timestamp,
    updatedAt: timestamp
  }
  ```

## Performance Optimizations

1. **Redis-First Architecture**
   - All reads hit Redis first
   - Firebase only on cache miss
   - 10-50ms vs 100-500ms response times

2. **Batch Writing**
   - Reduces Firebase writes by 80%
   - 3 writes → 1 write per conversation
   - Cost-effective for high-volume chats

3. **Efficient Polling**
   - Sorted sets for O(log N) operations
   - Only processes due conversations
   - No unnecessary Firebase reads

4. **Document Design**
   - Single document per conversation
   - Array-based message storage
   - Atomic updates prevent conflicts

## Monitoring & Debugging

### Key Metrics
- Queue depth: `messageQueue.getStats()`
- Cache hit rate: Check Redis logs
- Batch write performance: `/health/batch-write`
- DLQ size: Monitor for failures

### Health Endpoints
- `/health` - Basic server health
- `/health/ready` - All services ready
- `/health/queue` - Queue statistics
- `/health/batch-write` - Batch writer status

### Common Issues
1. **Messages not appearing**: Check Redis cache
2. **Delayed persistence**: Normal (2-minute batch window)
3. **DLQ growing**: Check Firebase credentials/limits
4. **High memory**: Reduce batch sizes or cache TTLs

## Configuration

Key environment variables:
```bash
# Batch Writing
BATCH_WRITE_ENABLED=true
BATCH_WRITE_DELAY=120 # seconds
BATCH_WRITE_POLL_INTERVAL=30
BATCH_WRITE_MAX_MESSAGES=500

# Redis TTLs
REDIS_TTL_MESSAGES=3600 # 1 hour
REDIS_TTL_CONVERSATION=1800 # 30 minutes

# AI Context
AI_MAX_CONTEXT_MESSAGES=50
```

## Security Considerations

1. **Authentication**: All sockets require Firebase auth
2. **Authorization**: Users can only access their conversations
3. **Rate Limiting**: Handled by BullMQ queue
4. **Data Validation**: All inputs validated before processing

## Future Improvements

1. **Conversation Sharding**: Split large conversations
2. **Compression**: Compress old messages
3. **Archive System**: Move old conversations to cold storage
4. **Read Replicas**: Scale read performance
5. **Event Sourcing**: Store message events separately
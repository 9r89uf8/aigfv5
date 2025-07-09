
# AI Messaging Platform Backend - Phase 1 Setup

## Overview
Phase 1 implements the basic Express server with Firebase Admin SDK initialization.

## Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── environment.js    # Environment configuration
│   │   └── firebase.js       # Firebase Admin SDK initialization
│   ├── middleware/
│   │   └── errorHandler.js   # Error handling middleware
│   ├── routes/
│   │   └── health.js         # Health check endpoints
│   ├── utils/
│   │   └── logger.js         # Winston logger configuration
│   ├── app.js               # Express app configuration
│   └── server.js            # Main server file
├── package.json
└── .env                     # Environment variables (create from template)
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Logging
LOG_LEVEL=debug
```

### 3. Get Firebase Service Account
1. Go to Firebase Console
2. Navigate to Project Settings > Service Accounts
3. Generate a new private key
4. Copy the values from the downloaded JSON to your `.env` file

### 4. Run the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Available Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with service status
- `GET /health/ready` - Readiness check for load balancers
- `GET /health/live` - Liveness check for container orchestration
- `GET /api` - API information endpoint

## Features Implemented

### Phase 1 (Complete)
✅ Express server with ES6 modules
✅ Firebase Admin SDK initialization
✅ Security middleware (Helmet, CORS, Rate Limiting)
✅ Structured logging with Winston
✅ Error handling middleware
✅ Health check endpoints
✅ Environment configuration
✅ Graceful shutdown handling

### Phase 2 (Complete)
✅ Authentication middleware with Firebase token verification
✅ User model with validation and usage tracking
✅ User service for CRUD operations
✅ Auth routes (register, login, profile management)
✅ Protected routes with role-based access
✅ Input validation and sanitization middleware
✅ Premium user support with expiration
✅ Message usage limits for free tier

### Phase 3 (Complete)
✅ Redis client configuration with ioredis
✅ Caching service with TTL management
✅ Real-time usage tracking in Redis
✅ Redis-based rate limiting middleware
✅ Job queue system with Bull
✅ Queue monitoring dashboard
✅ Improved user data caching
✅ Health checks for Redis and queues

### Phase 4 (Complete)
✅ Character model with personality traits
✅ Character service with caching
✅ Character management routes
✅ Gallery support for media content
✅ Premium-only content filtering
✅ Conversation model for messaging
✅ Conversation service with history
✅ Message validation and formatting
✅ AI system prompt generation
✅ Character popularity scoring

### Phase 5 (Complete)
✅ Socket.io server with Redis adapter for scaling
✅ WebSocket authentication middleware
✅ Real-time message sending and receiving
✅ Typing indicators
✅ Message read status synchronization
✅ Conversation room management
✅ Character subscription system
✅ User status broadcasting
✅ Rate limiting for socket events
✅ Premium user priority in message queue
✅ REST API fallback for conversations

### Phase 6 (Complete)
✅ OpenAI API integration
✅ AI response generation with personality
✅ Character personality implementation
✅ Context management for conversations
✅ Content filtering and moderation
✅ Response type detection (text/audio/media)
✅ AI response queue processor
✅ Token usage tracking
✅ Cost calculation
✅ AI testing endpoints

## API Endpoints - Phase 2

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - Register new user with Firebase token
- `POST /api/auth/login` - Login existing user
- `GET /api/auth/me` - Get current user profile (Protected)
- `PUT /api/auth/me` - Update user profile (Protected)
- `GET /api/auth/usage` - Get message usage stats (Protected)
- `GET /api/auth/check-username/:username` - Check username availability
- `DELETE /api/auth/me` - Deactivate account (Protected)

### User Routes (`/api/users`)
- `GET /api/users/:uid` - Get user by ID (Admin only)
- `GET /api/users/username/:username` - Get user by username (Public)
- `PUT /api/users/:uid/premium` - Update premium status (Admin only)

## Authentication Flow

1. **Client-side**: User signs in with Firebase Auth
2. **Get ID Token**: Firebase returns an ID token
3. **Register/Login**: Send ID token to backend
4. **Verify Token**: Backend verifies token with Firebase Admin
5. **Create/Update User**: Store user data in Firestore
6. **Protected Routes**: Include token in Authorization header

Example:
```javascript
// Client-side
const idToken = await firebase.auth().currentUser.getIdToken();

// Send to backend
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ username: 'user123' })
});
```

## Message Usage Limits

### Free Tier (per character)
- Text messages: 30
- Audio messages: 5
- Media messages: 5

### Premium Tier
- Unlimited messages
- Access to all features
- $7 for 15 days

## Redis Configuration

Add these to your `.env` file:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=aim:
```

## New Features in Phase 3

### 1. Caching Service
- User data caching (5 minute TTL)
- Automatic cache invalidation on updates
- Cache key patterns for different data types

### 2. Usage Tracking Service
- Real-time message usage tracking
- Per-character usage limits
- Analytics data collection
- Usage statistics aggregation

### 3. Redis Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- API endpoints: 100 requests per 15 minutes (500 for premium)
- Message sending: 10 per minute (unlimited for premium)
- File uploads: 20 per hour

### 4. Job Queues
- **messages**: Message processing queue
- **ai-responses**: AI response generation
- **media-processing**: Media file handling
- **analytics**: Background analytics
- **emails**: Email notifications

### 5. Queue Monitoring
Access the Bull Board dashboard at `/admin/queues` (requires admin authentication)

## Performance Improvements

1. **Caching**: Frequently accessed user data is cached
2. **Real-time tracking**: Usage tracked in Redis instead of Firestore
3. **Background jobs**: Heavy operations moved to queues
4. **Connection pooling**: Redis connections are reused

## API Endpoints - Phase 4

### Character Routes (`/api/characters`)
- `GET /api/characters` - List all characters (with filters)
- `GET /api/characters/traits` - Get personality traits list
- `GET /api/characters/:id` - Get character details
- `POST /api/characters` - Create character (Admin)
- `PUT /api/characters/:id` - Update character (Admin)
- `DELETE /api/characters/:id` - Delete character (Admin)
- `GET /api/characters/:id/gallery` - Get character gallery
- `POST /api/characters/:id/gallery` - Add gallery item (Admin)
- `DELETE /api/characters/:id/gallery/:itemId` - Remove gallery item (Admin)
- `POST /api/characters/:id/gallery/:itemId/view` - Track gallery view

## Character Model Features

### Personality System
- 30+ personality traits (flirty, intelligent, mysterious, etc.)
- Customizable tone, formality, humor levels
- AI behavior modifiers (empathy, creativity, confidence)

### AI Settings
- Model selection (GPT-4 default)
- Temperature control
- Context window configuration
- Knowledge base for character-specific facts
- Restricted topics list
- Custom system prompts

### Gallery System
- Image, video, and audio support
- Premium-only content flags
- View tracking
- Captions and tags
- Automatic filtering for non-premium users

### Character Stats
- Total conversations & messages
- Average rating system
- Popularity scoring algorithm
- Last active tracking

## Conversation System

### Message Types
- **Text**: Plain text messages (max 5000 chars)
- **Audio**: Voice messages with duration tracking
- **Media**: Images/videos with captions

### Features
- Message validation
- Read status tracking
- Context extraction for AI
- Conversation statistics
- Message search functionality
- Automatic caching

### Storage Structure
- Conversations stored by user_character ID
- Messages embedded in conversation documents
- Efficient pagination support
- Soft delete for data retention

## Phase 5 (Complete) - Socket.io Real-time Messaging

### Features Implemented
✅ Socket.io server with Redis adapter for scaling
✅ WebSocket authentication middleware
✅ Real-time message sending and receiving
✅ Typing indicators
✅ Message read status synchronization
✅ Conversation room management
✅ Character subscription system
✅ User status broadcasting
✅ Rate limiting for socket events
✅ Premium user priority in message queue
✅ REST API fallback for conversations

### New Dependencies
- `socket.io`: WebSocket server
- `@socket.io/redis-adapter`: Horizontal scaling support

### WebSocket Events

#### Message Events
- `message:send` - Send a message to a character
- `message:receive` - Receive new messages
- `message:read` - Mark messages as read
- `message:status` - Message status updates

#### Typing Events
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

#### Conversation Events
- `conversation:list` - Get user conversations
- `conversation:messages` - Get conversation messages
- `conversation:join` - Join a conversation room
- `conversation:leave` - Leave a conversation room
- `conversation:delete` - Delete a conversation

#### System Events
- `ping` - Connection health check
- `user:status` - User online status
- `character:subscribe` - Subscribe to character updates
- `system:notification` - System notifications

### Socket.io Connection Example
```javascript
// Client-side connection
const socket = io('ws://localhost:3000', {
  auth: {
    token: firebaseIdToken,
    characterId: 'optional-initial-character'
  }
});

// Send a message
socket.emit('message:send', {
  characterId: 'character123',
  type: 'text',
  content: 'Hello AI!'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
    console.log('Usage:', response.usage);
  }
});

// Listen for responses
socket.on('message:receive', (data) => {
  console.log('New message:', data.message);
});
```

### Conversation Routes (REST API)
- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message (REST)
- `GET /api/conversations/:id/search` - Search messages
- `GET /api/conversations/:id/stats` - Get statistics
- `DELETE /api/conversations/:id` - Delete conversation

### Performance Features
1. **Redis Adapter**: Enables horizontal scaling across multiple servers
2. **Room-based Broadcasting**: Efficient message delivery
3. **Connection Pooling**: Reuses WebSocket connections
4. **Rate Limiting**: Prevents spam and abuse
5. **Priority Queuing**: Premium users get faster AI responses

### Security Features
1. **Token Authentication**: Firebase ID token verification
2. **Room Authorization**: Users can only join their own conversations
3. **Message Validation**: Input sanitization and limits
4. **Rate Limiting**: Per-event and per-user limits
5. **Usage Enforcement**: Real-time usage limit checking

## Next Steps
- Phase 6: AI integration with OpenAI
- Phase 7: Payment integration with Stripe
- Phase 8: Media processing and storage
- Phase 9: Analytics and monitoring
- Phase 10: Complete integration and testing

## Phase 6 (Complete) - AI Integration with OpenAI

### Features Implemented
✅ OpenAI API integration
✅ AI response generation with personality
✅ Character personality implementation
✅ Context management for conversations
✅ Content filtering and moderation
✅ Response type detection (text/audio/media)
✅ AI response queue processor
✅ Token usage tracking
✅ Cost calculation
✅ AI testing endpoints

### New Dependencies
- `openai`: OpenAI SDK for GPT models
- `@google-cloud/text-to-speech`: Google Cloud TTS (prepared for future)

### OpenAI Configuration
Add these to your `.env` file:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key
OPENAI_ORGANIZATION=org-your-org-id (optional)

# Google Cloud (for future TTS)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/keyfile.json
```

### AI Features

#### Response Generation
- **Text responses**: Natural language generation with GPT-4
- **Personality application**: Dynamic response modification
- **Context awareness**: Maintains conversation history
- **Media suggestions**: Smart media selection from gallery
- **Audio preparation**: Structure for TTS integration

#### Content Filtering
- **Pattern matching**: Blocks prohibited content
- **OpenAI moderation**: Uses OpenAI's moderation API
- **Category thresholds**: Violence, self-harm, harassment
- **User-friendly messages**: Graceful handling of filtered content

#### Personality System
- **Trait-based**: Applies character personality traits
- **Dynamic adjustment**: Modifies tone, formality, humor
- **Emoji integration**: Adds emojis based on personality
- **Consistency**: Caches response patterns

### AI Routes (`/api/ai`)
- `GET /api/ai/status` - Check AI service status
- `GET /api/ai/models` - List available AI models
- `POST /api/ai/test` - Test AI response (Admin)
- `POST /api/ai/estimate-cost` - Estimate token costs
- `GET /api/ai/usage` - AI usage statistics (Admin)
- `PUT /api/ai/characters/:id/settings` - Update AI settings (Admin)

### AI Models Available
- **GPT-4**: High quality, 8K context
- **GPT-4 Turbo**: Faster, 128K context
- **GPT-3.5 Turbo**: Cost-effective, 4K context
- **GPT-3.5 16K**: Extended context version

### Queue Processing
```javascript
// AI response jobs are processed with:
- Duplicate detection
- Response type determination
- Error handling with user notification
- Token usage tracking
- Cost calculation
```

### Testing AI Responses
```bash
# Test AI response generation (Admin only)
curl -X POST http://localhost:3000/api/ai/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "character123",
    "message": "Hello, how are you?",
    "responseType": "text"
  }'
```

### Character AI Configuration
Each character can have custom AI settings:
- **Model selection**: Choose GPT model
- **Temperature**: Control creativity (0-2)
- **Max tokens**: Response length limit
- **Knowledge base**: Character-specific facts
- **System prompt override**: Custom instructions

### Performance Optimizations
1. **Response caching**: Prevents duplicate generations
2. **Pattern caching**: Maintains consistency
3. **Queue priority**: Premium users get faster responses
4. **Context limiting**: Manages token usage
5. **Parallel processing**: Multiple AI requests

### Cost Management
- **Token tracking**: Monitors usage per user/character
- **Cost calculation**: Real-time cost estimates
- **Usage aggregation**: Daily analytics
- **Model selection**: Cost-effective defaults

### Error Handling
- **Quota exceeded**: Graceful degradation
- **API errors**: User-friendly messages
- **Timeout handling**: 30-second limit
- **Retry logic**: Exponential backoff

## Phase 7 (Complete) - Payment Integration with Stripe

### Features Implemented
✅ Stripe SDK integration
✅ Checkout session creation
✅ Payment webhook handling
✅ Premium subscription management
✅ Customer portal integration
✅ Payment history tracking
✅ Subscription status checking
✅ Automatic premium expiration
✅ Payment failure handling
✅ Subscription cancellation

### New Dependencies
- `stripe`: Stripe Node.js SDK

### Stripe Configuration
Add these to your `.env` file:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Product/Price IDs (create in Stripe Dashboard)
STRIPE_PREMIUM_PRODUCT_ID=prod_your_product_id
STRIPE_PREMIUM_PRICE_ID=price_your_price_id
```

### Setting Up Stripe
1. **Create Stripe Account**: Sign up at https://stripe.com
2. **Get API Keys**: Dashboard > Developers > API keys
3. **Create Product**: 
   - Go to Products in Stripe Dashboard
   - Create "Premium Subscription" product
   - Add price: $7.00 one-time payment
4. **Set Up Webhook**:
   - Go to Webhooks in Stripe Dashboard
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: checkout.session.completed, payment_intent.succeeded/failed
   - Copy webhook signing secret

### Payment Flow
1. **User initiates payment**: Calls `/api/payments/create-checkout-session`
2. **Redirect to Stripe**: User completes payment on Stripe Checkout
3. **Webhook notification**: Stripe sends event to webhook endpoint
4. **Premium activation**: System updates user status and expiration
5. **Confirmation**: User redirected to success page

### Payment Routes (`/api/payments`)
- `GET /api/payments/config` - Get pricing and configuration
- `POST /api/payments/create-checkout-session` - Create Stripe checkout
- `POST /api/payments/create-portal-session` - Customer portal access
- `GET /api/payments/subscription/status` - Check premium status
- `POST /api/payments/subscription/cancel` - Cancel subscription
- `GET /api/payments/history` - Payment history
- `POST /api/payments/verify-success` - Verify payment completion
- `GET /api/payments/stripe-key` - Get publishable key

### Premium Features
- **Duration**: 15 days per payment
- **Price**: $7.00 USD
- **Benefits**:
  - Unlimited messages to all characters
  - Access to premium galleries
  - Priority AI response generation
  - Audio message support
  - Advanced character interactions

### Webhook Security
- Signature verification using webhook secret
- Raw body parsing for Stripe signature
- Idempotent event handling
- Graceful error handling

### Testing Payments
```bash
# Test checkout session creation
curl -X POST http://localhost:3000/api/payments/create-checkout-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel"
  }'

# Test with Stripe CLI for webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Test Card Numbers
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires Auth: 4000 0025 0000 3155

## Phase 8 (Complete) - Media Processing and Storage

### Features Implemented
✅ Google Cloud Storage integration
✅ Image upload and processing with Sharp
✅ Multi-size image generation (thumbnail, small, medium, large)
✅ WebP conversion for better compression
✅ Audio file upload support
✅ Gallery management for characters
✅ Signed URLs for private content
✅ File validation and security
✅ Memory-efficient file handling
✅ CDN-ready public URLs

### New Dependencies
- `multer`: Multipart form data handling
- `sharp`: High-performance image processing
- `uuid`: Unique identifier generation
- `@google-cloud/storage`: Google Cloud Storage SDK

### Storage Configuration
Add these to your `.env` file:
```env
# Storage Configuration
STORAGE_BUCKET=your-project-id-media
CDN_BASE_URL=https://storage.googleapis.com/your-project-id-media

# Google Cloud credentials (if not using default)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### Setting Up Google Cloud Storage
1. **Enable Cloud Storage API** in Google Cloud Console
2. **Create a storage bucket**:
   ```bash
   gsutil mb gs://your-project-id-media
   ```
3. **Set bucket permissions** for public access (if needed):
   ```bash
   gsutil iam ch allUsers:objectViewer gs://your-project-id-media
   ```
4. **Configure CORS** for the bucket:
   ```json
   [
     {
       "origin": ["http://localhost:3001", "https://your-domain.com"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "responseHeader": ["*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

### Media Processing Features
- **Image Processing**:
  - Automatic resizing to multiple sizes
  - WebP conversion for 30-50% smaller files
  - Thumbnail generation (150x150)
  - Maintains aspect ratios
  - EXIF data removal for privacy

- **File Organization**:
  - User content: `/user-content/{userId}/`
  - Character galleries: `/characters/{characterId}/gallery/`
  - Temporary files: `/temp/`

- **Security**:
  - File type validation
  - Size limits (10MB images, 50MB audio)
  - User-scoped access control
  - Signed URLs for private content

### Media Routes (`/api/media`)
- `GET /api/media/status` - Check storage configuration
- `POST /api/media/upload/image` - Upload single image
- `POST /api/media/upload/images` - Upload multiple images
- `POST /api/media/upload/gallery/:characterId` - Upload character gallery (Admin)
- `POST /api/media/upload/audio` - Upload audio file
- `DELETE /api/media/delete` - Delete file
- `POST /api/media/signed-url` - Generate temporary access URL
- `GET /api/media/list` - List user files
- `GET /api/media/limits` - Get upload limits

### Upload Examples
```bash
# Upload single image
curl -X POST http://localhost:3000/api/media/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@photo.jpg"

# Upload to character gallery (Admin)
curl -X POST http://localhost:3000/api/media/upload/gallery/CHARACTER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "gallery=@image1.jpg" \
  -F "gallery=@image2.jpg"
```

### Image Variants
Each uploaded image generates:
- **thumbnail**: 150x150px (WebP, 80% quality)
- **small**: 400x400px max (WebP, 85% quality)
- **medium**: 800x800px max (WebP, 85% quality)
- **large**: 1200x1200px max (WebP, 90% quality)
- **original**: Original file (preserved)

### Rate Limiting
- Standard users: 20 uploads per hour
- Premium users: 100 uploads per hour
- Per-endpoint limits apply

### Performance Optimizations
- Memory streaming for large files
- Parallel image processing
- CDN-ready URLs with cache headers
- Automatic cleanup of temporary files
- Redis caching for processed image metadata

## Phase 10 (Complete) - Integration and Testing

### Features Implemented
✅ Environment variable validation
✅ Comprehensive health monitoring
✅ Test data seeding scripts
✅ Jest testing framework
✅ API documentation
✅ Utility scripts
✅ Error handling improvements
✅ System metrics monitoring
✅ Integration verification

### Testing & Development Tools

#### Environment Management
```bash
# Generate example .env file
npm run env:generate

# Validate environment setup
npm run check:env
```

#### Database Seeding
```bash
# Seed test data (users & characters)
npm run seed

# Clean test data
npm run seed:clean
```

Test Accounts Created:
- `testuser1@example.com` / `TestPassword123!` (Regular user)
- `testadmin@example.com` / `AdminPassword123!` (Admin)
- `premium@example.com` / `PremiumPassword123!` (Premium user)

#### Health Monitoring
```bash
# Check detailed health status
npm run check:health

# Or via API
curl http://localhost:3000/health/detailed
```

Health Endpoints:
- `/health` - Basic health check
- `/health/detailed` - Full service status
- `/health/ready` - Kubernetes readiness
- `/health/live` - Kubernetes liveness
- `/health/metrics` - System metrics

#### Testing
```bash
# Run tests
npm test

# Watch mode
npm test:watch

# With coverage
npm test -- --coverage
```

### System Integration

#### Service Dependencies
1. **Required Services**:
   - Firebase (Auth & Firestore)
   - Redis (Caching & Rate Limiting)

2. **Optional Services**:
   - OpenAI (AI Responses)
   - Stripe (Payments)
   - Google Cloud Storage (Media)

#### Feature Flags
The system automatically detects which features are available based on environment configuration:
- AI Features: Enabled when `OPENAI_API_KEY` is set
- Payments: Enabled when Stripe keys are configured
- Media Storage: Enabled when storage bucket is configured

### Production Checklist

#### Pre-deployment
- [ ] Run `npm run check:env` to validate configuration
- [ ] Test all health endpoints
- [ ] Verify Redis connection
- [ ] Check Firebase credentials
- [ ] Configure optional services

#### Security
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Configure CORS for your domain
- [ ] Set up rate limiting rules
- [ ] Review firewall rules

#### Monitoring
- [ ] Set up health check monitoring
- [ ] Configure error logging
- [ ] Monitor queue job failures
- [ ] Track API response times
- [ ] Set up alerts for service failures

### API Testing Examples

#### Register & Login
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "username": "newuser",
    "displayName": "New User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Send Message (WebSocket)
```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Send message
socket.emit('message:send', {
  conversationId: 'CONVERSATION_ID',
  content: 'Hello AI!',
  type: 'text'
});
```

### Troubleshooting Guide

#### Common Issues

1. **"Missing required environment variable"**
   - Run `npm run env:generate` to see all required variables
   - Check `.env` file for missing values

2. **"Redis connection refused"**
   - Ensure Redis is running: `redis-cli ping`
   - Check `REDIS_HOST` and `REDIS_PORT`

3. **"Firebase initialization failed"**
   - Verify service account JSON format
   - Check `FIREBASE_PRIVATE_KEY` has proper line breaks

4. **"Stripe webhook signature invalid"**
   - Use Stripe CLI for local testing
   - Ensure webhook secret matches

5. **"Storage bucket not found"**
   - Create bucket in Google Cloud Console
   - Check bucket permissions

### Performance Optimization

#### Caching Strategy
- User profiles: 5 minutes
- Character data: 10 minutes
- AI responses: 1 hour
- Premium status: 5 minutes

#### Queue Processing
- AI responses: Priority queue for premium users
- Failed jobs: Retry 3 times with exponential backoff
- Job cleanup: Remove completed jobs after 24 hours

#### Rate Limiting
- Standard users: 100 requests/15 min
- Premium users: 1000 requests/15 min
- Auth endpoints: 5 requests/15 min
- Uploads: 20 files/hour

## 🎉 Project Complete!

The AI Messaging Platform backend is now fully implemented with:
- ✅ User authentication and profiles
- ✅ AI character system
- ✅ Real-time messaging
- ✅ Premium subscriptions
- ✅ Media uploads
- ✅ Comprehensive monitoring
- ✅ Production-ready architecture

### Next Steps for Frontend Integration
1. Use the WebSocket client for real-time features
2. Implement Stripe checkout flow
3. Handle file uploads with proper progress
4. Display AI responses with typing indicators
5. Show online/offline status for users 
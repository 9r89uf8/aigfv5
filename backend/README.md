# AI Messaging Platform - Backend

A sophisticated Node.js backend for an AI-powered messaging platform where users can chat with virtual AI characters.

## 🚀 Features

### Core Functionality
- **Real-time Messaging**: WebSocket-based real-time communication
- **AI Integration**: OpenAI GPT models for intelligent responses
- **User Authentication**: Firebase Auth with JWT tokens
- **Character System**: Multiple AI personalities with unique traits
- **Premium Subscriptions**: Stripe payment integration
- **Media Support**: Image upload and processing
- **Rate Limiting**: Redis-based rate limiting
- **Queue System**: Background job processing with Bull

### Technical Features
- **Microservices Architecture**: Modular service design
- **Health Monitoring**: Comprehensive health checks
- **Environment Validation**: Automatic environment setup validation
- **Caching Layer**: Redis caching for performance
- **Error Handling**: Centralized error management
- **Logging**: Structured logging with Winston
- **Security**: Helmet, CORS, input validation

## 📋 Prerequisites

- Node.js 16+ 
- Redis 6+
- Firebase Project
- OpenAI API Key (optional)
- Stripe Account (optional)
- Google Cloud Storage (optional)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate environment file**
   ```bash
   npm run env:generate
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

5. **Validate environment**
   ```bash
   npm run check:env
   ```

## 🔧 Configuration

### Required Environment Variables
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key
- `FIREBASE_DATABASE_URL` - Firestore database URL
- `JWT_SECRET` - Secret for JWT signing (32+ chars)

### Optional Features
- **AI Integration**: Set `OPENAI_API_KEY`
- **Payments**: Set Stripe keys
- **Storage**: Configure Google Cloud Storage

## 🚦 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Health Check
```bash
npm run check:health
```

## 📊 API Endpoints

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - System metrics

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile

### Characters
- `GET /api/characters` - List all characters
- `GET /api/characters/:id` - Get character details
- `POST /api/characters` - Create character (Admin)
- `PUT /api/characters/:id` - Update character (Admin)

### Conversations
- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Start new conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

### Payments
- `POST /api/payments/create-checkout-session` - Start payment
- `GET /api/payments/subscription/status` - Check premium status

### Media
- `POST /api/media/upload/image` - Upload image
- `GET /api/media/list` - List user files

### WebSocket Events
- `connection` - Client connects
- `disconnect` - Client disconnects
- `message:send` - Send message
- `message:typing` - Typing indicator
- `conversation:join` - Join conversation

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Seed Test Data
```bash
npm run seed
```

### Clean Test Data
```bash
npm run seed:clean
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/         # Service configurations
│   ├── handlers/       # WebSocket handlers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   ├── queues/         # Background job processors
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── scripts/        # Utility scripts
│   ├── __tests__/      # Test files
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── jest.config.js      # Jest configuration
├── package.json        # Dependencies
└── README.md          # This file
```

## 🔒 Security

- Firebase Authentication for user management
- JWT tokens for API authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- Helmet.js for security headers
- CORS configuration
- Environment variable validation

## 🚀 Deployment

### Environment Setup
1. Set all required environment variables
2. Ensure Redis is accessible
3. Configure Firebase service account
4. Set up any optional services (Stripe, OpenAI, etc.)

### Health Checks
- Use `/health/ready` for readiness probes
- Use `/health/live` for liveness probes
- Monitor `/health/detailed` for service status

### Scaling Considerations
- Redis for session management
- Horizontal scaling supported
- Queue workers can run separately
- WebSocket sticky sessions required

## 🐛 Troubleshooting

### Common Issues

1. **Environment Validation Fails**
   - Run `npm run check:env` to see missing variables
   - Check `.env.example` for required format

2. **Redis Connection Error**
   - Ensure Redis is running
   - Check `REDIS_HOST` and `REDIS_PORT`

3. **Firebase Auth Error**
   - Verify service account credentials
   - Check Firebase project configuration

4. **Health Check Failing**
   - Visit `/health/detailed` for service status
   - Check logs for specific errors

## 📚 Additional Resources

- [API Documentation](./SETUP.md)
- [Firebase Setup Guide](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Stripe Integration](https://stripe.com/docs)

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using Node.js, Express, and Firebase 
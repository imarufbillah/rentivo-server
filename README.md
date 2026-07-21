# Rentivo Server

RESTful API backend for Rentivo — an AI-powered property rental platform. Built with Express 5, TypeScript, MongoDB, and Gemini AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Framework | Express 5 |
| Language | TypeScript 6 (node16 ESM) |
| Database | MongoDB 7 (native driver) |
| Auth | Better Auth + JWT (jose) |
| AI | Google GenAI SDK (Gemini 2.5 Flash) |
| Payments | Stripe |
| Validation | Zod 4 |
| Testing | Vitest + Supertest |

## Features

- **Property CRUD** — full listing management with image hosting (imgbb), drag-to-reorder, 20+ property fields
- **Search & Filter** — location search, price/type/bedroom/bathroom/amenity filters, sort, pagination
- **Authentication** — email/password + Google OAuth via Better Auth, JWT sessions, role-based access (renter/owner)
- **AI Chat Assistant** — conversational agent with tool calling (search, property details, saved properties), SSE streaming
- **AI Recommendations** — behavior-aware property suggestions using LLM ranking over view/save history
- **Reviews & Ratings** — 1–5 star reviews with comments, average rating computation
- **User Interactions** — deduplicated view/save tracking via upsert
- **Rentals with Stripe** — checkout sessions, webhook handling, rental lifecycle (pending → active → completed/cancelled)
- **Owner Analytics** — view/save counts, review stats per property

## Project Structure

```
rentivo-server/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── chat.controller.ts
│   │   ├── interaction.controller.ts
│   │   ├── property.controller.ts
│   │   ├── recommendation.controller.ts
│   │   ├── rental.controller.ts
│   │   ├── review.controller.ts
│   │   └── user.controller.ts
│   ├── services/           # Business logic
│   │   ├── chat.service.ts
│   │   ├── chat-tools.ts
│   │   ├── interaction.service.ts
│   │   ├── property.service.ts
│   │   ├── recommendation.service.ts
│   │   ├── rental.service.ts
│   │   ├── review.service.ts
│   │   └── user.service.ts
│   ├── routes/             # Express route definitions
│   ├── lib/
│   │   ├── auth.ts         # Better Auth config
│   │   ├── db/
│   │   │   ├── mongodb.ts  # MongoClient singleton
│   │   │   └── collections.ts
│   │   ├── stripe.ts       # Stripe client
│   │   └── validation/     # Zod schemas
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── error-handler.ts
│   ├── types/              # Shared TypeScript types
│   ├── config.ts           # env loading
│   ├── index.ts            # Server entry point
│   └── seed.ts             # Database seeder
├── __tests__/              # Vitest test suites
├── tsconfig.json
├── render.yaml             # Render deployment config
└── package.json
```

## Environment Variables

Create `.env.local` in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rentivo?retryWrites=true&w=majority

# Better Auth
AUTH_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key

# Gemini (AI)
GEMINI_API_KEY=your-gemini-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# imgbb (image uploads)
IMGBB_API_KEY=your-imgbb-key
```

## Setup & Development

```bash
# Install dependencies
npm install

# Seed database (optional)
npm run seed

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The dev server runs on `http://localhost:3001` by default.

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| **Properties** | | | |
| GET | `/api/properties` | No | List properties (search, filter, sort, paginate) |
| GET | `/api/properties/:id` | No | Get property details |
| POST | `/api/properties` | Owner | Create property |
| PATCH | `/api/properties/:id` | Owner | Update property |
| DELETE | `/api/properties/:id` | Owner | Delete property |
| **Interactions** | | | |
| POST | `/api/interactions` | Yes | Record view/save |
| GET | `/api/interactions/history` | Yes | Get interaction history |
| GET | `/api/interactions/saved` | Yes | Get saved properties |
| **Reviews** | | | |
| GET | `/api/reviews/:propertyId` | No | Get reviews for property |
| POST | `/api/reviews` | Yes | Create review |
| DELETE | `/api/reviews/:id` | Yes | Delete own review |
| **Recommendations** | | | |
| GET | `/api/recommendations` | Yes | Get AI-powered recommendations |
| **Chat** | | | |
| POST | `/api/chat` | Yes | Send message (SSE streaming response) |
| **Users** | | | |
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| POST | `/api/users/upgrade` | Yes | Upgrade to owner role |
| **Rentals** | | | |
| POST | `/api/rentals/checkout` | Yes | Create Stripe checkout session |
| POST | `/api/rentals/webhook` | Stripe | Stripe webhook handler |
| GET | `/api/rentals` | Yes | List user's rentals |
| GET | `/api/rentals/:id` | Yes | Get rental details |

### Auth Routes (Better Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-up/email` | Email registration |
| POST | `/api/auth/sign-in/email` | Email login |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/get-session` | Get current session |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest
```

Tests cover all route handlers and services (224 tests across 34 test files) using mocked MongoDB and HTTP assertions.

## Deployment

### Render (recommended)

1. Push to GitHub
2. Create a new **Web Service** on Render (free tier works)
3. Connect your repo, set root directory to `rentivo-server`
4. Render auto-detects `render.yaml` for build/start commands
5. Set environment variables in the Render dashboard
6. Register Stripe webhook URL: `https://<your-render-url>/api/rentals/webhook`

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## License

ISC

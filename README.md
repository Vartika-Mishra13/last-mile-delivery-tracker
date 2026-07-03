# Last-Mile Delivery Tracker

Delivery management platform with customer ordering, admin dispatch, configurable zone pricing, delivery-agent updates, immutable tracking history, failed-delivery rescheduling, and notification hooks.

## Live Demo

Access the live application here: https://last-mile-delivery-tracker-gkih.onrender.com/

## What Is Included

- Backend REST API with role-based JWT auth for `customer`, `admin`, and `deliveryAgent`.
- Static frontend dashboard served from `/` with customer, admin, and agent panels.
- Admin-managed zones and B2B/B2C intra/inter-zone rate cards.
- Quote-before-confirm flow using volumetric weight, billable weight, minimum charge, and COD surcharge.
- Manual agent assignment and auto-assignment to nearest available zone/location match.
- Immutable tracking timeline for every order status change.
- Failed delivery reschedule flow with reassignment attempt.
- Email/SMS notification records with console fallback and webhook-provider support.
- Render and Railway deployment config.

## Setup

```bash
# Install dependencies
npm install

# Setup environment variables (or 'copy .env.example .env' on Windows CMD)
cp .env.example .env

# Seed the database
npm run seed

# Run local development server
npm run dev
```

Open `http://localhost:5000`.

Default seeded accounts all use `Password@123`:

- Admin: `admin@example.com`
- Customer: `customer@example.com`
- Agent: `agent@example.com`

## Environment

See `.env.example`.

- `PORT`: API port.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: JWT signing secret.
- `ALLOW_ROLE_REGISTRATION`: set `true` only for local testing if public role registration is needed.
- `EMAIL_WEBHOOK_URL`: optional free-tier email provider/webhook endpoint.
- `SMS_WEBHOOK_URL`: optional free-tier SMS provider/webhook endpoint.
- `NOTIFICATION_WEBHOOK_TOKEN`: optional bearer token for notification webhooks.

If notification URLs are empty, the app logs notifications to the console and still stores them in MongoDB.

## Frontend Usage

The static dashboard at `/` supports:

- Customer login, quote, order creation, order listing, timeline viewing, and failed-order reschedule.
- Admin zone creation, rate-card upsert, order listing, manual assignment, auto-assignment, and status override.
- Agent assigned-order list, location update, availability update, and delivery status update.

## API Docs

All authenticated requests use:

```http
Authorization: Bearer <token>
```

### Auth

- `POST /api/auth/register` - customer registration.
- `POST /api/auth/login` - returns JWT and user profile.
- `GET /api/auth/profile` - validates token.

### Customer Orders

- `POST /api/orders/quote` - returns detected zones and price before confirmation.
- `POST /api/orders` - creates confirmed customer order.
- `GET /api/orders` - lists current customer's orders.
- `GET /api/orders/:id` - returns order plus tracking timeline.
- `POST /api/orders/:id/reschedule` - reschedules a failed delivery and attempts reassignment.

Quote/order body:

```json
{
  "pickupAddress": "Rohini 110085",
  "dropAddress": "Hauz Khas 110016",
  "length": 40,
  "breadth": 30,
  "height": 20,
  "actualWeight": 8,
  "orderType": "B2C",
  "paymentType": "COD"
}
```

### Admin

- `POST /api/admin/zones` / `GET /api/admin/zones` / `PUT /api/admin/zones/:id`
- `POST /api/admin/rate-cards` / `GET /api/admin/rate-cards`
- `POST /api/admin/staff` - creates admin or delivery agent.
- `PATCH /api/admin/agents/:id` - updates agent zone/location/availability.
- `GET /api/admin/orders?status=&zone=&agent=` - lists and filters orders.
- `POST /api/admin/orders` - creates order on behalf of a customer.
- `PATCH /api/admin/orders/:id/assign` - manual assignment body `{ "agentId": "..." }`.
- `POST /api/admin/orders/:id/auto-assign` - nearest available agent assignment.
- `PATCH /api/admin/orders/:id/status` - admin override body `{ "status": "Failed", "note": "Customer unavailable" }`.

### Agent

- `GET /api/agent/orders`
- `PATCH /api/agent/location` - body `{ "lat": 28.7, "lng": 77.1 }`.
- `PATCH /api/agent/availability` - body `{ "isAvailable": true }`.
- `PATCH /api/agent/orders/:id/status` - status lifecycle updates.

## Database Schema

- `User`: customer/admin/deliveryAgent role, assigned zone, availability, active order, current location.
- `Zone`: name, area keywords, pincodes, optional center coordinates.
- `RateCard`: order type, from zone, to zone, rate per kg, minimum charge, COD surcharge.
- `Order`: customer, addresses, detected zones, dimensions, weights, charge, assigned agent, status, attempts.
- `TrackingHistory`: immutable status log with actor, timestamp, and note.
- `Notification`: persisted email/SMS notification attempts.

## Rate Calculation Logic

1. Detect pickup and drop zones from pincode, area keyword, or zone name.
2. Look up active `RateCard` by `orderType + pickupZone + dropZone`.
3. Calculate volumetric weight as `length * breadth * height / 5000`.
4. Bill on `max(actualWeight, volumetricWeight)`.
5. Calculate `max(billableWeight * ratePerKg, minCharge)`.
6. Add COD surcharge only when `paymentType` is `COD`.

## Deployment

The application is fully configured for cloud deployment. Since the database is hosted on MongoDB Atlas (`MONGO_URI`), you do not need to re-run the seed script in production if it was already run locally against the same database.

### Render

1. Push this source to GitHub.
2. Create a Render **Blueprint** using the included `render.yaml` or create a standard **Web Service**.
3. Set your `MONGO_URI` to your MongoDB Atlas connection string.
4. Set your `JWT_SECRET` (Render can also auto-generate this).
5. Once deployed, the frontend and backend will automatically work together at your Render URL.



# Vercel ⇄ Render CORS Playbook

## 1. Express configuration (Render backend)

```ts
import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = ["https://ecofrontend888.vercel.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin ?? allowedOrigins[0]);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Eco-Guest-Id",
      "X-Guest-Id",
      "X-Eco-Client",
    ],
    exposedHeaders: ["x-eco-guest-id", "x-guest-id"],
    credentials: true,
    maxAge: 86400, // cache preflight for a day
  }),
);

app.options("*", (req, res) => {
  res.sendStatus(204);
});

app.use(express.json());

app.post("/api/ask-eco", (req, res) => {
  // ...handler
});

export default app;
```

Key details:

- `origin` callback dynamically validates the Vercel app and mirrors it back.
- `credentials: true` pairs with the frontend `credentials: 'include'` / `withCredentials: true`.
- Explicit `OPTIONS` handler guarantees a `204 No Content` response even before route handlers execute.

## 2. Frontend request examples (Vercel)

### Streaming fetch used by the chat

```ts
const response = await fetch("https://ecobackend888.onrender.com/api/ask-eco", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...buildIdentityHeaders(),
  },
  credentials: "include",
  mode: "cors",
  body: JSON.stringify(payload),
});
```

### Axios client for REST endpoints

```ts
const api = axios.create({
  baseURL: "https://ecobackend888.onrender.com",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
```

Both variants send identity headers (guest/session identifiers) and include cookies so that Supabase session tokens issued by the backend are preserved.

## 3. Why the preflight was failing

The browser sends a preflight `OPTIONS` request whenever the request is cross-origin *and* either credentials, custom headers, or non-simple methods are used. In our case:

- The frontend requested `https://ecobackend888.onrender.com/api/ask-eco` with `credentials: 'include'` and custom `X-Eco-*` headers.
- Render's Express app replied with a 404/500 (no matching `OPTIONS` route) and lacked `Access-Control-Allow-Credentials` + specific `Access-Control-Allow-Origin` values.
- Because of that, Chrome blocked the actual POST call with the generic `CORS error` / `Failed to fetch` messages.

After adding the middleware above you can confirm the fix via **Chrome DevTools → Network tab**:

1. Trigger a chat request from `https://ecofrontend888.vercel.app`.
2. Filter by `ask-eco` and select the `OPTIONS` request.
3. Confirm the response status is **204** and the headers include:
   - `Access-Control-Allow-Origin: https://ecofrontend888.vercel.app`
   - `Access-Control-Allow-Credentials: true`
   - `Access-Control-Allow-Headers` listing the custom headers that were sent.
4. The subsequent `POST` request should now appear with status **200** (or 2xx) and its response stream visible under the **EventStream** preview.

If the `OPTIONS` response shows another origin or lacks the credentials header, the browser will still block the POST—so always verify both requests when debugging future CORS regressions.

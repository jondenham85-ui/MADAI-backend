# MADAI Backend
Production-oriented MVP backend for Render using Express, MongoDB Atlas, OpenAI, and Stripe.

## Deploy
1. Upload all files in this ZIP to the root of a GitHub repository.
2. Connect the repository to Render.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add every environment variable listed in `.env.example`.
6. Health check: `/api/health`.
7. Configure the Stripe webhook endpoint as `/api/billing/webhook`.

Never commit real secrets or a `.env` file.

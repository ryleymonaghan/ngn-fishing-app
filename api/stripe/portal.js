// Vercel Serverless Function — POST /api/stripe/portal
// Creates a Stripe Customer Portal session for managing subscriptions
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe secret key not configured' });

  const stripe = new Stripe(secretKey);

  try {
    const { email, returnUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No customer found with that email' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl || 'https://ngnfishing.com',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Portal]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Vercel Serverless Function — POST /api/stripe/checkout
// Creates a Stripe Checkout Session and returns the URL
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
    const { priceId, customerEmail, successUrl, cancelUrl } = req.body;

    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    const sessionParams = {
      mode: priceId.startsWith('price_') ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || 'https://ngnfishing.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://ngnfishing.com/cancel',
    };

    // Check if it's a one-time payment (single report)
    // Stripe price mode is determined by the price object itself
    // but we set mode based on the known single_report price
    if (priceId === process.env.SINGLE_REPORT_PRICE_ID) {
      sessionParams.mode = 'payment';
    }

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Stripe Checkout]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

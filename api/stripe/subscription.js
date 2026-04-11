// Vercel Serverless Function — GET /api/stripe/subscription?email=...
// Returns subscription status for a given customer email
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe secret key not configured' });

  const stripe = new Stripe(secretKey);

  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query param required' });

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(200).json({ isActive: false });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Check for trialing
      const trialing = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 1,
      });

      if (trialing.data.length === 0) {
        return res.status(200).json({ isActive: false, customerId: customer.id });
      }

      const sub = trialing.data[0];
      return res.status(200).json({
        isActive: true,
        status: 'trialing',
        subscriptionId: sub.id,
        customerId: customer.id,
        priceId: sub.items.data[0]?.price?.id,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      });
    }

    const sub = subscriptions.data[0];
    return res.status(200).json({
      isActive: true,
      status: sub.status,
      subscriptionId: sub.id,
      customerId: customer.id,
      priceId: sub.items.data[0]?.price?.id,
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[Stripe Subscription]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

'use strict';

const config = require('../config');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const PLANS = {
  basic: { label: 'Basic', days: 30 },
  premium: { label: 'Premium', days: 30 },
};

/**
 * Billing is gated behind one abstraction so the app runs with real Stripe test
 * keys OR with the built-in mock provider when no keys are configured. Subscription
 * state is the single entitlement source; it is only ever mutated here — never from
 * an arbitrary client request. In Stripe mode that means webhook events (signature
 * verified); in mock mode it means the mock confirm endpoint.
 */
function isRealStripe() {
  return config.billing.enabled;
}

let stripeClient = null;
function getStripe() {
  if (!isRealStripe()) return null;
  if (!stripeClient) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(config.billing.secretKey, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

function periodEnd(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Start a checkout. Returns a redirect URL plus a mode flag so the client knows
 * whether to hand off to Stripe-hosted checkout or the mock flow.
 */
async function createCheckout({ user, plan }) {
  if (!PLANS[plan]) throw Object.assign(new Error('Unknown plan'), { status: 400, code: 'bad_plan' });

  if (!isRealStripe()) {
    return {
      mode: 'mock',
      plan,
      // Client bounces here and immediately POSTs /billing/mock/confirm.
      checkoutUrl: `${config.billing.frontendUrl}/subscribe/mock?plan=${plan}`,
    };
  }

  const stripe = getStripe();
  const priceId = config.billing.prices[plan];
  if (!priceId) throw Object.assign(new Error(`Missing Stripe price for ${plan}`), { status: 500, code: 'config' });

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user._id.toString() },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.billing.frontendUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
    cancel_url: `${config.billing.frontendUrl}/subscribe/cancel`,
    subscription_data: { metadata: { userId: user._id.toString(), plan } },
  });

  return { mode: 'stripe', plan, checkoutUrl: session.url, sessionId: session.id };
}

/** Mock provider: mark a subscription live. Mirrors what a Stripe webhook would do. */
async function confirmMockSubscription({ user, plan }) {
  if (!isRealStripe()) {
    const sub = await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        plan,
        status: 'active',
        currentPeriodEnd: periodEnd(PLANS[plan].days),
        canceledAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return sub;
  }
  throw Object.assign(new Error('Real Stripe is configured; use checkout'), { status: 400, code: 'wrong_mode' });
}

/**
 * Verify and process a Stripe webhook. Signature verification happens BEFORE any
 * mutation — an unsigned event cannot change subscription state.
 */
async function handleStripeWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe || !config.billing.webhookSecret) {
    throw Object.assign(new Error('Stripe webhook not configured'), { status: 500, code: 'config' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.billing.webhookSecret);
  } catch (err) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 400, code: 'bad_signature' });
  }

  const sub = event.data.object;
  const userId = sub.metadata && sub.metadata.userId;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (userId && sub.subscription) {
        await syncFromStripe(userId, await stripe.subscriptions.retrieve(sub.subscription));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      if (userId) await syncFromStripe(userId, sub);
      break;
    }
    default:
      break;
  }

  return { received: true, type: event.type };
}

/** Project a Stripe subscription onto our entitlement record. */
async function syncFromStripe(userId, stripeSub) {
  const plan = (stripeSub.metadata && stripeSub.metadata.plan) || 'basic';
  const statusMap = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'expired',
    incomplete_expired: 'expired',
  };
  const status = statusMap[stripeSub.status] || 'expired';
  const end = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : periodEnd(PLANS[plan] ? PLANS[plan].days : 30);

  await Subscription.findOneAndUpdate(
    { userId },
    {
      userId,
      plan,
      status,
      currentPeriodEnd: status === 'canceled' || status === 'expired' ? new Date() : end,
      stripeCustomerId: stripeSub.customer || undefined,
      stripeSubscriptionId: stripeSub.id,
      canceledAt: status === 'canceled' ? new Date() : null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  PLANS,
  isRealStripe,
  createCheckout,
  confirmMockSubscription,
  handleStripeWebhook,
  syncFromStripe,
};

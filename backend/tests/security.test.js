import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { effectiveWorkspacePlan } from '../config/plans.js';
import { issueAccessToken, requireAuth, requirePermission } from '../middleware/auth.js';
import { UserModel, SubscriptionTransactionModel, WorkspaceModel } from '../models/index.js';
import { syncSubscription } from '../routes/subscriptionRoutes.js';
import { verifyCashfreeWebhook } from '../services/cashfreeSubscriptionService.js';

function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test('inactive users cannot use a still-valid bearer token', async () => {
  const original = UserModel.findOne;
  const token = issueAccessToken({ _id: 'user1', workspaceId: 'workspace1', role: 'member' });
  try {
    for (const status of ['suspended', 'invited']) {
      UserModel.findOne = () => ({ select: () => ({ lean: async () => ({ status, platformOwner: false }) }) });
      const res = response();
      await requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('inactive user reached a protected route'));
      assert.equal(res.statusCode, 401);
    }
  } finally { UserModel.findOne = original; }
});

test('changing password or suspending invalidates previously issued access tokens', async () => {
  const original = UserModel.findOne;
  const token = issueAccessToken({ _id: 'user1', workspaceId: 'workspace1', role: 'member', tokenVersion: 0 });
  try {
    UserModel.findOne = () => ({ select: () => ({ lean: async () => ({ status: 'active', tokenVersion: 1, platformOwner: false }) }) });
    const res = response();
    await requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('revoked token reached protected route'));
    assert.equal(res.statusCode, 401);
  } finally { UserModel.findOne = original; }
});

test('platform owner cannot enter member CRM permissions', async () => {
  const res = response();
  await requirePermission('leads:write')({ user: { platformOwner: true } }, res, () => assert.fail('owner entered CRM'));
  assert.equal(res.statusCode, 403);
});

test('expired subscription falls back to free limits', () => {
  assert.equal(effectiveWorkspacePlan({ plan: 'plus', subscriptionId: 'sub1', expiresAt: new Date(Date.now() - 1000) }), 'free');
  assert.equal(effectiveWorkspacePlan({ plan: 'plus', subscriptionId: 'sub1', expiresAt: new Date(Date.now() + 100000) }), 'plus');
});

test('Cashfree webhook signature rejects tampering', () => {
  const previous = process.env.CASHFREE_WEBHOOK_SECRET;
  process.env.CASHFREE_WEBHOOK_SECRET = 'test-secret';
  try {
    const raw = Buffer.from('{"type":"PAYMENT_SUCCESS"}');
    const timestamp = '123456';
    const signature = createHmac('sha256', 'test-secret').update(`${timestamp}${raw}`).digest('base64');
    assert.equal(verifyCashfreeWebhook(raw, signature, timestamp), true);
    assert.equal(verifyCashfreeWebhook(Buffer.from('{"type":"PAYMENT_FAILED"}'), signature, timestamp), false);
  } finally { if (previous === undefined) delete process.env.CASHFREE_WEBHOOK_SECRET; else process.env.CASHFREE_WEBHOOK_SECRET = previous; }
});

test('mandate authorization alone does not grant a paid plan', async () => {
  const oldPaymentQuery = SubscriptionTransactionModel.findOne;
  const oldWorkspaceUpdate = WorkspaceModel.findByIdAndUpdate;
  const oldWorkspaceConditional = WorkspaceModel.updateOne;
  const updates = [];
  SubscriptionTransactionModel.findOne = () => ({ sort: () => ({ lean: async () => null }) });
  WorkspaceModel.findByIdAndUpdate = async (...args) => updates.push(args);
  WorkspaceModel.updateOne = async (...args) => updates.push(args);
  const record = { _id: 'sub1', workspaceId: 'workspace1', subscriptionId: 'cashfree1', subscriptionStatus: 'INITIALIZED', save: async () => {} };
  try {
    await syncSubscription(record, { subscription_status: 'ACTIVE', authorization_status: 'SUCCESS' });
    assert.equal(record.activatedAt, undefined);
    assert.equal(updates.length, 0);
  } finally { SubscriptionTransactionModel.findOne = oldPaymentQuery; WorkspaceModel.findByIdAndUpdate = oldWorkspaceUpdate; WorkspaceModel.updateOne = oldWorkspaceConditional; }
});

test('verified payment activates access and cancellation preserves paid time only', async () => {
  const oldPaymentQuery = SubscriptionTransactionModel.findOne;
  const oldActiveUpdate = WorkspaceModel.findByIdAndUpdate;
  const oldConditionalUpdate = WorkspaceModel.updateOne;
  const activeUpdates = [];
  const conditionalUpdates = [];
  SubscriptionTransactionModel.findOne = () => ({ sort: () => ({ lean: async () => ({ paymentStatus: 'SUCCESS', paymentTimestamp: new Date(), createdAt: new Date() }) }) });
  WorkspaceModel.findByIdAndUpdate = async (...args) => activeUpdates.push(args);
  WorkspaceModel.updateOne = async (...args) => conditionalUpdates.push(args);
  const record = { _id: 'sub1', workspaceId: 'workspace1', subscriptionId: 'cashfree1', subscriptionStatus: 'INITIALIZED', planId: 'plus', billingCycle: 'MONTHLY', recurringAmount: 199, currency: 'INR', save: async () => {} };
  try {
    await syncSubscription(record, { subscription_status: 'ACTIVE', authorization_status: 'SUCCESS' });
    assert.equal(activeUpdates.length, 1);
    assert.equal(activeUpdates[0][1].$set.plan, 'plus');
    record.cancelledAt = new Date();
    await syncSubscription(record, { subscription_status: 'CANCELLED', authorization_status: 'SUCCESS' });
    assert.equal(conditionalUpdates.at(-1)[1].$set.plan, undefined);
    record.paidThrough = new Date(Date.now() - 1000);
    await syncSubscription(record, { subscription_status: 'CANCELLED', authorization_status: 'SUCCESS' });
    assert.equal(conditionalUpdates.at(-1)[1].$set.plan, 'free');
  } finally { SubscriptionTransactionModel.findOne = oldPaymentQuery; WorkspaceModel.findByIdAndUpdate = oldActiveUpdate; WorkspaceModel.updateOne = oldConditionalUpdate; }
});

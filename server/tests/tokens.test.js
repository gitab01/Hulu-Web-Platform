'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_tokens';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { reset, teardown } = require('./helpers');
const app = require('../src/app');

before(reset);
after(teardown);

async function registerAndLogin() {
  const email = `t${Date.now()}@h.test`;
  await request(app).post('/auth/register').send({ email, password: 'password123', genres: ['Drama'] }).expect(201);
  const login = await request(app).post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return login.body;
}

test('register issues access + refresh tokens', async () => {
  const res = await request(app).post('/auth/register').send({ email: `r${Date.now()}@h.test`, password: 'password123' }).expect(201);
  assert.ok(res.body.accessToken);
  assert.ok(res.body.refreshToken);
});

test('weak password is rejected', async () => {
  await request(app).post('/auth/register').send({ email: `w${Date.now()}@h.test`, password: 'short' }).expect(400);
});

test('duplicate email is rejected', async () => {
  const email = `dup${Date.now()}@h.test`;
  await request(app).post('/auth/register').send({ email, password: 'password123' }).expect(201);
  await request(app).post('/auth/register').send({ email, password: 'password123' }).expect(409);
});

test('invalid credentials give a uniform 401', async () => {
  const email = `a${Date.now()}@h.test`;
  await request(app).post('/auth/register').send({ email, password: 'password123' }).expect(201);
  const res = await request(app).post('/auth/login').send({ email, password: 'wrongpass1' }).expect(401);
  assert.strictEqual(res.body.error.code, 'invalid_credentials');
});

test('refresh rotation returns a NEW refresh token', async () => {
  const { refreshToken } = await registerAndLogin();
  const res = await request(app).post('/auth/refresh').send({ refreshToken }).expect(200);
  assert.ok(res.body.accessToken);
  assert.notStrictEqual(res.body.refreshToken, refreshToken);
});

test('reusing a rotated refresh token invalidates the whole family', async () => {
  const { refreshToken } = await registerAndLogin();
  const rotated = await request(app).post('/auth/refresh').send({ refreshToken }).expect(200);

  // Replay the original (already-consumed) token -> reuse detected.
  const replay = await request(app).post('/auth/refresh').send({ refreshToken }).expect(401);
  assert.strictEqual(replay.body.error.code, 'reuse_detected');

  // The legitimate new token is now dead too, because the family was killed.
  await request(app).post('/auth/refresh').send({ refreshToken: rotated.body.refreshToken }).expect(401);
});

test('protected route requires a valid access token', async () => {
  await request(app).get('/auth/me').expect(401);
  const { accessToken } = await registerAndLogin();
  const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
  assert.ok(res.body.user.email);
});

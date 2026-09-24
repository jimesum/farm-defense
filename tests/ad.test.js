// tests/ad.test.js
const test = require('node:test');
const assert = require('node:assert');
const createAdController = require('../js/ad');
const config = require('../js/config');

function fakeWxApi(behavior) {
  const handlers = {};
  const ad = {
    onClose(fn) { handlers.close = fn; },
    onError(fn) { handlers.error = fn; },
    load() { return Promise.resolve(); },
    show() {
      handlers.shown = true;
      if (behavior === 'error') handlers.error(new Error('load fail'));
      return Promise.resolve();
    },
    _close(res) { handlers.close(res); },
    _handlers: handlers,
  };
  return {
    ad,
    createRewardedVideoAd(opts) {
      assert.strictEqual(opts.adUnitId, config.AD.UNIT_ID);
      return ad;
    },
  };
}

test('reward callback when ad watched to the end', () => {
  const wxApi = fakeWxApi('complete');
  const c = createAdController(wxApi, config);
  c.load();
  let rewarded = false;
  c.show({ onReward: () => { rewarded = true; }, onSkip: () => {} });
  wxApi.ad._close({ isEnded: true });
  assert.strictEqual(rewarded, true);
});

test('skip callback when ad closed early', () => {
  const wxApi = fakeWxApi('early');
  const c = createAdController(wxApi, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  wxApi.ad._close({ isEnded: false });
  assert.strictEqual(skipped, true);
});

test('skip callback when ad errors', () => {
  const wxApi = fakeWxApi('error');
  const c = createAdController(wxApi, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  assert.strictEqual(skipped, true);
});

test('degrades silently without createRewardedVideoAd', () => {
  const c = createAdController({}, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  assert.strictEqual(skipped, true);
});

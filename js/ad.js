// js/ad.js
function createAdController(wxApi, config) {
  let ad = null;
  let available = false;
  let callbacks = null;

  function load() {
    if (typeof wxApi.createRewardedVideoAd !== 'function') {
      available = false;
      return;
    }
    ad = wxApi.createRewardedVideoAd({ adUnitId: config.AD.UNIT_ID });
    available = true;
    ad.onClose(res => {
      const cb = callbacks;
      callbacks = null;
      if (!cb) return;
      if (res && res.isEnded) cb.onReward();
      else cb.onSkip();
    });
    ad.onError(() => {
      const cb = callbacks;
      callbacks = null;
      if (cb) cb.onSkip();
    });
    ad.load().catch(() => {});
  }

  function show(cb) {
    if (!available || !ad) {
      cb.onSkip();
      return;
    }
    callbacks = cb;
    ad.show().catch(() => {
      // show 失败时尝试重新加载后再播一次，仍失败则跳过
      ad.load()
        .then(() => ad.show())
        .catch(() => {
          const c = callbacks;
          callbacks = null;
          if (c) c.onSkip();
        });
    });
  }

  return { load, show };
}

module.exports = createAdController;

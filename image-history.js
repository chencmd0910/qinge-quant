// Image Generation History & Timer
(function() {
  if (window.location.pathname.indexOf('/image-gen') === -1) return;
  
  var KEY = '39ai_image_history';
  var MAX = 50;
  var genStart = null;
  
  function fmt(s) {
    if (s < 60) return s + 's';
    return Math.floor(s/60) + 'm' + (s%60) + 's';
  }
  
  function getH() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) { return []; }
  }
  
  function saveH(item) {
    var h = getH();
    for (var i = 0; i < h.length; i++) {
      if (h[i].url === item.url) return;
    }
    h.unshift({id: Date.now(), ts: new Date().toLocaleString(), url: item.url, p: item.p || '', e: item.e || 0});
    if (h.length > MAX) h = h.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(h));
    renderH();
  }
  
  var CLIP = String.fromCodePoint(0x1F4CB);
  var TRASH = String.fromCodePoint(0x1F5D1);
  var TIMER = String.fromCodePoint(0x23F1);
  var EMPTY = String.fromCodePoint(0x1F5ED);
  
  function buildUI() {
    if (document.getElementById('h-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'h-btn'; btn.textContent = CLIP;
    btn.title = 'History';
    btn.style.cssText = 'position:fixed;right:20px;top:55px;width:36px;height:36px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:16px;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
    document.body.appendChild(btn);
    
    var p = document.createElement('div');
    p.id = 'h-panel';
    p.style.cssText = 'position:fixed;right:60px;top:55px;width:300px;max-height:70vh;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);overflow:hidden;z-index:9999;display:none;flex-direction:column;font:13px -apple-system,BlinkMacSystemFont,sans-serif;';
    p.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;"><b>' + CLIP + ' History</b><button id="h-close" style="background:none;border:none;cursor:pointer;font-size:16px;">&times;</button></div><div id="h-list" style="overflow-y:auto;flex:1;padding:6px;min-height:100px;"></div><div style="display:flex;border-top:1px solid #e2e8f0;"><button id="h-clear" style="flex:1;padding:8px;border:none;background:transparent;cursor:pointer;font-size:12px;color:#ef4444;">' + TRASH + ' Clear</button></div>';
    document.body.appendChild(p);
    
    btn.onclick = function() { p.style.display = p.style.display === 'none' ? 'flex' : 'none'; renderH(); };
    document.getElementById('h-close').onclick = function() { p.style.display = 'none'; };
    document.getElementById('h-clear').onclick = function() { localStorage.removeItem(KEY); renderH(); };
  }
  
  function renderH() {
    var el = document.getElementById('h-list');
    if (!el) return;
    var h = getH();
    if (!h.length) { el.innerHTML = '<div style="text-align:center;padding:25px;color:#94a3b8;font-size:13px;">' + EMPTY + ' No records<br><span style="font-size:11px;">Generated images appear here</span></div>'; return; }
    el.innerHTML = h.map(function(item) {
      var prompt = (item.p || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 60);
      return '<div onclick="var t=document.querySelector(\'textarea\');if(t){t.value=\'' + prompt + '\';t.focus();}" style="display:flex;gap:8px;padding:6px;border-radius:6px;cursor:pointer;margin-bottom:2px;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
        '<img src="' + item.url + '" style="width:50px;height:50px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">' +
        '<div style="flex:1;min-width:0;"><div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + prompt + '</div>' +
        (item.e ? '<div style="font-size:11px;color:#94a3b8;">' + TIMER + ' ' + fmt(item.e) + '</div>' : '') +
        '<div style="font-size:10px;color:#94a3b8;">' + (item.ts || '') + '</div></div></div>';
    }).join('');
  }
  
  function startPoll() {
    var timerEl = null;
    var lastSrcs = {};
    setInterval(function() {
      try {
        var spin = document.querySelector('.animate-spin');
        var making = !!spin;
        
        if (making) {
          if (!genStart) {
            genStart = Date.now();
            if (!timerEl) {
              timerEl = document.createElement('div');
              timerEl.id = 'h-timer';
              timerEl.style.cssText = 'text-align:center;font-size:12px;color:#94a3b8;padding:4px 0;';
              var cont = document.querySelector('[class*="flex-col"]');
              if (cont) cont.appendChild(timerEl);
            }
          }
          if (timerEl && genStart) {
            timerEl.textContent = TIMER + ' ' + fmt(Math.floor((Date.now() - genStart) / 1000));
          }
        } else {
          if (genStart && timerEl) {
            var elapsed = Math.floor((Date.now() - genStart) / 1000);
            timerEl.textContent = TIMER + ' Done in ' + fmt(elapsed);
            genStart = null;
            lastSrcs = {};
            
            // Save any new images
            var imgs = document.querySelectorAll('img');
            for (var j = 0; j < imgs.length; j++) {
              var img = imgs[j];
              var src = img.src || '';
              if (src.indexOf('base64') < 0 && src.indexOf('blob:') < 0) continue;
              if (lastSrcs[src]) continue;
              lastSrcs[src] = 1;
              var pel = document.querySelector('textarea');
              saveH({url: src, p: pel ? pel.value : '', e: elapsed});
              var card = img.closest('[class*="rounded-lg"]') || img.parentElement;
              if (card) {
                var badge = document.createElement('div');
                badge.textContent = TIMER + ' ' + fmt(elapsed);
                badge.style.cssText = 'font-size:11px;color:#94a3b8;padding:4px 8px;text-align:center;';
                card.parentElement.insertBefore(badge, card.nextSibling);
              }
            }
          }
        }
      } catch(e) {}
    }, 500);
  }
  
  function init() {
    buildUI();
    startPoll();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* =========================================================
   福氣白貓｜我的幸運物  —  互動腳本
   514170260 蔡杰紘
   ---------------------------------------------------------
   1. 共用工具          5. 主視覺白貓（摸摸）
   2. 福氣值（全站累積） 6. 象徵卡片（3D 傾斜＋翻面）
   3. 捲動效果          7. 餵食時間＋白貓福籤
   4. 眼睛跟著滑鼠      8. 心願（擁抱）／星空／肉球腳印
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. 共用工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rand = (min, max) => min + Math.random() * (max - min);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = $('#fxLayer');

  // localStorage 可能被瀏覽器封鎖，所以一律包在 try/catch 裡
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 無法儲存就略過 */ }
    }
  };

  // 重新觸發 CSS 動畫：先移除 class，強制重繪，再加回去
  function replay(el, className, duration) {
    el.classList.remove(className);
    void el.getBoundingClientRect();
    el.classList.add(className);
    if (duration) {
      clearTimeout(el[`_${className}`]);
      el[`_${className}`] = setTimeout(() => el.classList.remove(className), duration);
    }
  }

  // 隨機挑一句，避免連續兩次一樣
  function pickOther(list, last) {
    let item;
    do { item = list[Math.floor(Math.random() * list.length)]; }
    while (list.length > 1 && item === last);
    return item;
  }

  // 顯示對話泡泡
  function say(bubble, text, ms = 1900) {
    bubble.textContent = text;
    replay(bubble, 'is-show', ms);
  }

  // 取得點擊座標；用鍵盤觸發（沒有座標）時改用元素中心
  function pointOf(event, el) {
    if (event && event.detail > 0 && event.clientX) return { x: event.clientX, y: event.clientY };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // 愛心噴發
  function burstHearts(x, y, { count = 8, spread = 100, colors = ['#F08A8A', '#F2B2B2', '#D4A03C'] } = {}) {
    const n = reduceMotion ? Math.min(count, 3) : count;
    for (let i = 0; i < n; i++) {
      const heart = document.createElement('span');
      heart.className = 'fx-heart';
      heart.innerHTML = '<svg viewBox="0 0 32 32"><use href="#heart"/></svg>';
      const angle = -Math.PI / 2 + rand(-0.6, 0.6) * Math.PI;
      const dist = spread * rand(0.6, 1.2);
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.color = colors[i % colors.length];
      heart.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      heart.style.setProperty('--dy', `${Math.sin(angle) * dist - 30}px`);
      heart.style.setProperty('--r', `${rand(-40, 40)}deg`);
      heart.style.setProperty('--s', rand(0.7, 1.4).toFixed(2));
      heart.style.animationDelay = `${i * 30}ms`;
      heart.addEventListener('animationend', () => heart.remove());
      fx.appendChild(heart);
    }
  }

  // 彩紙＋金幣
  function confetti(x, y, count = 40) {
    if (reduceMotion) return;
    const colors = ['#D4A03C', '#C24D3A', '#F2B2B2', '#F3DFAE', '#FFFFFF', '#E9BE5C'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti' + (i % 3 === 0 ? ' is-coin' : i % 3 === 1 ? ' is-strip' : '');
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.background = colors[i % colors.length];
      fx.appendChild(piece);

      const angle = rand(0, Math.PI * 2);
      const speed = rand(110, 280);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed - 130;
      const rot = rand(-720, 720);
      piece.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx * 1.3}px, ${dy + 340}px) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: rand(1500, 2300), easing: 'cubic-bezier(.15,.7,.35,1)' }).onfinish = () => piece.remove();
    }
  }

  // 按鈕點擊漣漪
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .food');
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - r.left - size / 2}px`;
    ripple.style.top = `${e.clientY - r.top - size / 2}px`;
    ripple.addEventListener('animationend', () => ripple.remove());
    btn.appendChild(ripple);
  });

  /* ---------- 2. 福氣值（全站累積，存在瀏覽器） ---------- */
  const luckBox = $('.nav-luck');
  const luckEl = $('#luckCount');
  let luck = store.get('whitecat-luck', 0);
  luckEl.textContent = luck;

  function addLuck(n) {
    luck += n;
    store.set('whitecat-luck', luck);
    luckEl.textContent = luck;
    replay(luckBox, 'is-bump', 700);
  }

  /* ---------- 3. 捲動效果 ---------- */
  const progressBar = $('.scroll-progress span');
  const header = $('.site-header');

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 區塊進入畫面時淡入
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  // 導覽列標示目前所在區塊
  const navLinks = $$('.nav-links a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- 4. 複製白貓＋眼睛跟著滑鼠 ---------- */
  const heroCat = $('#heroCat .cat');

  // 餵食區的白貓：直接複製主視覺那隻
  const feedCat = heroCat.cloneNode(true);
  $('#feedCat').appendChild(feedCat);

  // 檔案卡的大頭照：複製後把 viewBox 裁成頭部特寫
  const portraitCat = heroCat.cloneNode(true);
  portraitCat.setAttribute('viewBox', '58 14 304 304');
  $('#portrait').appendChild(portraitCat);

  const cats = [heroCat, feedCat, portraitCat];
  const EYE_CENTER = { x: 210, y: 152 }; // 雙眼中心（SVG 座標）
  let pointer = null;
  let eyeFrame = 0;

  function aimEyes(svg, x, y) {
    const r = svg.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return;
    const vb = svg.viewBox.baseVal;
    const scale = Math.min(r.width / vb.width, r.height / vb.height);
    const ex = r.left + r.width / 2 + (EYE_CENTER.x - vb.x - vb.width / 2) * scale;
    const ey = r.top + r.height / 2 + (EYE_CENTER.y - vb.y - vb.height / 2) * scale;
    const dx = x - ex;
    const dy = y - ey;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dist / 260);
    const tx = (dx / dist) * 6.5 * k;
    const ty = (dy / dist) * 5.5 * k;
    svg.querySelectorAll('.eye-track').forEach((g) => g.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`));
    svg.querySelector('.head-follow').setAttribute('transform', `rotate(${((dx / dist) * 3.5 * k).toFixed(2)} 210 232)`);
  }

  function updateEyes() {
    eyeFrame = 0;
    cats.forEach((svg) => {
      const target = svg._lookAt ? svg._lookAt() : pointer;
      if (target) aimEyes(svg, target.x, target.y);
    });
  }
  function requestEyes() {
    if (!eyeFrame) eyeFrame = requestAnimationFrame(updateEyes);
  }

  window.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    requestEyes();
  }, { passive: true });
  window.addEventListener('scroll', requestEyes, { passive: true });

  /* ---------- 5. 主視覺白貓：摸摸 ---------- */
  const heroBtn = $('#heroCat');
  const speech = $('#speech');
  const petCountEl = $('#petCount');
  const petLines = [
    '喵～', '呼嚕呼嚕……', '再摸一下嘛～', '今天也很有福氣喔！',
    '肚子有點餓了……', '摸頭好舒服～', '好運分你一點 ✦', '要一直陪著我喔！'
  ];
  let lastLine = '';
  let pets = store.get('whitecat-pets', 0);
  petCountEl.textContent = pets;

  heroBtn.addEventListener('click', (e) => {
    pets += 1;
    store.set('whitecat-pets', pets);
    petCountEl.textContent = pets;
    addLuck(1);

    replay(heroCat, 'is-squish', 800);
    replay(heroCat, 'is-joy', 1100);
    lastLine = pickOther(petLines, lastLine);
    say(speech, lastLine);

    const p = pointOf(e, heroBtn);
    burstHearts(p.x, p.y);
  });

  /* ---------- 6. 象徵卡片：3D 傾斜＋點擊翻面 ---------- */
  $$('.flip-card').forEach((card) => {
    card.addEventListener('click', () => {
      const flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(flipped));
      if (flipped) addLuck(1);
    });

    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', `${(px - 0.5) * 16}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 16}deg`);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- 7. 餵食時間＋白貓福籤 ---------- */
  const foodList = $('#foodList');
  const foodBtns = $$('.food', foodList);
  const fullFill = $('.meter-fill');
  const fullText = $('#fullText');
  const fullMeter = $('#fullMeter');
  const feedStatus = $('#feedStatus');
  const feedBubble = $('#feedBubble');
  const omikuji = $('#omikuji');
  const omikujiHint = $('#omikujiHint');
  const drawBtn = $('#drawBtn');
  const resetBtn = $('#resetBtn');

  const fortunes = [
    { level: '大吉', text: '吃飽睡好，好運自然就會來敲門。' },
    { level: '大吉', text: '有人在家等你，就是最大的幸運。' },
    { level: '上吉', text: '今天會被溫柔對待，也記得溫柔待人。' },
    { level: '上吉', text: '圓滾滾的不是肚子，是裝得滿滿的福氣。' },
    { level: '中吉', text: '慢慢來也沒關係，貓咪也是睡飽才起床。' },
    { level: '吉', text: '把喜歡的事好好做，就像貓咪認真吃飯。' },
    { level: '大吉', text: '陪伴是最好的禮物，今天多陪陪重要的人吧。' }
  ];
  const IDLE_STATUS = '牠正盯著你看……肚子好像有點餓了。';
  let fullness = 0;
  let busy = false;

  function setFullness(value) {
    fullness = Math.max(0, Math.min(100, value));
    fullFill.style.width = `${fullness}%`;
    fullText.textContent = `${fullness}%`;
    fullMeter.setAttribute('aria-valuenow', String(fullness));
    // 越吃越圓：身體寬度最多變成 1.16 倍
    feedCat.style.setProperty('--chub', (1 + (fullness / 100) * 0.16).toFixed(3));
  }

  function statusFor(v) {
    if (v >= 100) return '吃飽飽了！圓滾滾的肚子裝滿福氣，可以抽福籤囉！';
    if (v >= 70) return '快吃飽了，肚子圓得像顆湯圓～再一口！';
    if (v >= 35) return '肚子慢慢圓起來了，福氣也在累積中。';
    return '還想再吃一點……眼睛閃閃發亮。';
  }

  foodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (busy || fullness >= 100) return;
      busy = true;
      foodList.classList.add('is-busy');

      const icon = $('.food-icon', btn);
      const from = icon.getBoundingClientRect();
      const mouth = $('.cat-mouth', feedCat).getBoundingClientRect();
      const flyer = icon.cloneNode(true);
      flyer.classList.add('flyer');
      Object.assign(flyer.style, {
        left: `${from.left}px`, top: `${from.top}px`,
        width: `${from.width}px`, height: `${from.height}px`
      });
      fx.appendChild(flyer);

      const dx = mouth.left + mouth.width / 2 - (from.left + from.width / 2);
      const dy = mouth.top + mouth.height / 2 - (from.top + from.height / 2);
      const lift = Math.min(160, Math.abs(dx) * 0.4 + 80);

      // 飛行途中，貓咪的眼睛會盯著點心看
      feedCat._lookAt = () => {
        const r = flyer.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      };
      let watching = true;
      (function watch() {
        if (!watching) return;
        updateEyes();
        requestAnimationFrame(watch);
      })();

      const flight = flyer.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.25) rotate(-160deg)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(-340deg)`, opacity: 0.4 }
      ], { duration: reduceMotion ? 1 : 780, easing: 'cubic-bezier(.45,.05,.4,1)' });

      flight.onfinish = () => {
        watching = false;
        feedCat._lookAt = null;
        flyer.remove();
        eat(btn, mouth);
      };
    });
  });

  function eat(btn, mouth) {
    const value = Number(btn.dataset.value);
    replay(feedCat, 'is-eating', 850);
    replay(feedCat, 'is-joy', 900);
    say(feedBubble, btn.dataset.msg, 1700);
    burstHearts(mouth.left + mouth.width / 2, mouth.top, { count: 5, spread: 70 });

    setFullness(fullness + value);
    addLuck(Math.round(value / 5));
    feedStatus.textContent = statusFor(fullness);

    busy = false;
    foodList.classList.remove('is-busy');

    if (fullness >= 100) {
      foodList.classList.add('is-full');
      feedCat.classList.add('is-full');
      omikuji.classList.add('is-ready');
      omikujiHint.textContent = '準備好了！按下「抽福籤」';
      drawBtn.disabled = false;
      const r = feedCat.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height * 0.3, 28);
    }
  }

  drawBtn.addEventListener('click', () => {
    const f = fortunes[Math.floor(Math.random() * fortunes.length)];
    $('#fortuneLevel').textContent = f.level;
    $('#fortuneText').textContent = f.text;
    $('#fortuneNo').textContent = `白貓福籤・第 ${Math.floor(rand(1, 100))} 號`;
    omikuji.classList.add('is-flipped');
    omikuji.classList.remove('is-ready');
    drawBtn.disabled = true;
    addLuck(10);

    setTimeout(() => {
      const r = omikuji.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, 46);
    }, reduceMotion ? 0 : 450);
  });

  resetBtn.addEventListener('click', () => {
    omikuji.classList.remove('is-flipped', 'is-ready');
    omikujiHint.textContent = '吃飽飽才能抽籤喔';
    drawBtn.disabled = true;
    foodList.classList.remove('is-full');
    feedCat.classList.remove('is-full');
    setFullness(0);
    feedStatus.textContent = IDLE_STATUS;
    say(feedBubble, '咦？又餓了！', 1500);
  });

  /* ---------- 8. 心願：給牠一個擁抱 ---------- */
  const hugBtn = $('#hugBtn');
  const sleepCat = $('#sleepCat');
  const hugMessage = $('#hugMessage');
  const hugCountEl = $('#hugCount');
  const hugLines = [
    '謝謝你來到我們家。', '今天也一起度過吧。', '要一直健健康康的喔。',
    '吃飽飽、睡好好。', '有你在，家就很溫暖。', '我會一直陪著你。'
  ];
  let hugs = store.get('whitecat-hugs', 0);
  hugCountEl.textContent = hugs;

  function hug(e, source) {
    hugs += 1;
    store.set('whitecat-hugs', hugs);
    hugCountEl.textContent = hugs;
    addLuck(2);

    replay(sleepCat, 'is-hugged', 950);
    hugMessage.textContent = hugLines[(hugs - 1) % hugLines.length];
    replay(hugMessage, 'is-in');

    const r = sleepCat.getBoundingClientRect();
    const p = source === sleepCat ? pointOf(e, sleepCat) : { x: r.left + r.width * 0.33, y: r.top + r.height * 0.35 };
    burstHearts(p.x, p.y, { count: 10, spread: 120, colors: ['#F08A8A', '#FFE3B0', '#F2B2B2'] });
  }
  hugBtn.addEventListener('click', (e) => hug(e, hugBtn));
  sleepCat.addEventListener('click', (e) => hug(e, sleepCat));

  // 夜空星星
  const sky = $('#wishSky');
  for (let i = 0; i < 46; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.style.left = `${rand(0, 100)}%`;
    star.style.top = `${rand(0, 92)}%`;
    star.style.setProperty('--size', `${rand(1.5, 3.2).toFixed(1)}px`);
    star.style.setProperty('--dur', `${rand(2, 5).toFixed(1)}s`);
    star.style.setProperty('--delay', `${rand(0, 4).toFixed(1)}s`);
    sky.appendChild(star);
  }

  /* ---------- 點擊空白處留下肉球腳印 ---------- */
  document.addEventListener('click', (e) => {
    if (reduceMotion || e.detail === 0) return;
    if (e.target.closest('a, button, input, label, .flip-card, .feed-panel')) return;
    const paw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    paw.setAttribute('class', 'fx-paw');
    paw.innerHTML = '<use href="#paw"/>';
    paw.style.left = `${e.clientX}px`;
    paw.style.top = `${e.clientY}px`;
    paw.style.setProperty('--r', `${rand(-35, 35)}deg`);
    paw.addEventListener('animationend', () => paw.remove());
    fx.appendChild(paw);
  });
})();

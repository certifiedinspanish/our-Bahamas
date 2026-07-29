function createTester(opts) {
  const { container, islands } = opts;

  container.innerHTML = `
    <p style="text-align:center;color:var(--text-muted);font-size:14px;margin:0 0 20px;">
      Get it right a few times, on a couple of different days, and you'll earn a ⭐ for that island — forever!
    </p>
    <div class="modepick">
      <button class="modebtn active" data-mode="i2s">Island → Settlement</button>
      <button class="modebtn" data-mode="s2i">Settlement → Island</button>
      <button class="modebtn" data-mode="order">Song Order</button>
      <button class="modebtn" data-mode="size">Compare: Size</button>
    </div>
    <div class="progressbar" data-el="masteryBar">
      <span data-el="masteredCount">⭐ 0 / 16 earned</span>
      <div class="progresstrack"><div class="progressfill" data-el="progressFill"></div></div>
    </div>
    <div class="progressbar" data-el="streakBar" style="display:none;">
      <span data-el="streakNow">Streak: 0</span>
      <span data-el="streakBest" style="color:var(--text-muted);">Best: 0</span>
    </div>
    <p class="streak-hint hidden" data-el="streakHint">
      Best only grows when your current streak beats your all-time record. One miss resets the streak — not your Best.
    </p>
    <button class="browsebtn hidden" data-el="browseBtn">📖 See the rankings first</button>
    <div class="qcard" data-el="qcard"></div>
    <div class="finale" data-el="finale">
      <h2>🌟 All 16 Islands Earned! 🌟</h2>
      <p>You know every island and settlement by heart!</p>
    </div>
    <p class="stargrid-label">Your progress so far:</p>
    <div class="stargrid" data-el="starGrid"></div>
    <span class="resetlink" data-el="resetLink">Reset all progress</span>
  `;

  const el = {};
  container.querySelectorAll('[data-el]').forEach(node => { el[node.dataset.el] = node; });

  function flagSrc(key){ return 'flags/' + key + '.png'; }
  function todayStr(){
    // Local calendar day, NOT UTC — a real bug found and fixed once already; don't reintroduce it.
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  const STORAGE_KEY = 'bahamas_tester_v1';
  const STREAK_KEY = 'bahamas_streaks_v1';

  function loadProgress(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    const p = {};
    islands.forEach(c => p[c.key] = { correctDates: [] });
    return p;
  }
  function saveProgress(p){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }catch(e){} }
  function isMastered(p, key){
    const rec = p[key];
    if(!rec) return false;
    const distinctDays = new Set(rec.correctDates).size;
    return rec.correctDates.length >= 5 && distinctDays >= 2;
  }
  function loadStreaks(){
    try{
      const raw = localStorage.getItem(STREAK_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return { size: { current: 0, best: 0 } };
  }
  function saveStreaks(s){ try{ localStorage.setItem(STREAK_KEY, JSON.stringify(s)); }catch(e){} }

  let progress = loadProgress();
  let streaks = loadStreaks();
  let mode = 'i2s';
  let lastComparePair = null;
  let browsing = false;

  function renderStreak(){
    const bar = streaks[mode];
    if(!bar) return;
    el.streakNow.textContent = 'Streak: ' + bar.current;
    el.streakBest.textContent = 'Best: ' + bar.best;
  }

  function pickRandom(arr, n, excludeKey){
    const pool = arr.filter(c => c.key !== excludeKey);
    const out = [];
    while(out.length < n && pool.length){
      const i = Math.floor(Math.random()*pool.length);
      out.push(pool.splice(i,1)[0]);
    }
    return out;
  }

  function chooseTargetIsland(){
    const unmastered = islands.filter(c => !isMastered(progress, c.key));
    const pool = unmastered.length ? unmastered : islands;
    pool.sort((a,b) => (progress[a.key].correctDates.length) - (progress[b.key].correctDates.length));
    const topFew = pool.slice(0, Math.min(6, pool.length));
    return topFew[Math.floor(Math.random()*topFew.length)];
  }

  function renderProgress(){
    const masteredN = islands.filter(c => isMastered(progress, c.key)).length;
    el.masteredCount.textContent = '⭐ ' + masteredN + ' / 16 earned';
    el.progressFill.style.width = (masteredN/16*100) + '%';

    el.starGrid.innerHTML = '';
    islands.forEach(c => {
      const cell = document.createElement('div');
      cell.className = 'star-cell' + (isMastered(progress, c.key) ? ' earned' : '');
      cell.title = c.name;
      const img = document.createElement('img');
      img.src = flagSrc(c.key);
      cell.appendChild(img);
      if(isMastered(progress, c.key)){
        const star = document.createElement('span');
        star.className = 'star-badge';
        star.textContent = '⭐';
        cell.appendChild(star);
      }
      el.starGrid.appendChild(cell);
    });

    if(masteredN === 16){
      el.finale.classList.add('show');
      el.qcard.style.display = 'none';
    } else {
      el.finale.classList.remove('show');
      el.qcard.style.display = 'block';
    }
  }

  function renderBrowseList(){
    el.qcard.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'qprompt-label';
    label.textContent = 'Smallest area → Largest';
    el.qcard.appendChild(label);

    const sorted = islands.slice().sort((a, b) => a.size_sqmi - b.size_sqmi);
    const list = document.createElement('div');
    list.style.cssText = 'text-align:left;max-height:360px;overflow-y:auto;';
    sorted.forEach((c, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--line);';
      row.innerHTML =
        '<span style="font-size:12px;color:var(--text-muted);width:18px;">' + (i+1) + '</span>' +
        '<img src="' + flagSrc(c.key) + '" style="width:38px;height:26px;object-fit:cover;border-radius:4px;">' +
        '<span style="font-weight:700;">' + c.name + '</span>';
      list.appendChild(row);
    });
    el.qcard.appendChild(list);
  }

  function newQuestion(){
    if(browsing && mode === 'size'){
      renderBrowseList();
      return;
    }
    el.qcard.innerHTML = '';

    if(mode === 'i2s' || mode === 's2i'){
      const target = chooseTargetIsland();
      const distractors = pickRandom(islands, 3, target.key);
      const options = [target, ...distractors].sort(() => Math.random()-0.5);

      const label = document.createElement('div');
      label.className = 'qprompt-label';
      label.textContent = mode === 'i2s' ? 'What is the main settlement of...' : 'Which island has this settlement?';
      el.qcard.appendChild(label);

      if(mode === 'i2s'){
        const img = document.createElement('img');
        img.className = 'qflag'; img.src = flagSrc(target.key);
        el.qcard.appendChild(img);
        const text = document.createElement('div');
        text.className = 'qtext'; text.textContent = target.name;
        el.qcard.appendChild(text);
      } else {
        const text = document.createElement('div');
        text.className = 'qtext'; text.style.marginTop='20px'; text.textContent = target.settlement.replace('*','');
        el.qcard.appendChild(text);
      }

      const choicesWrap = document.createElement('div');
      choicesWrap.className = 'choices' + (mode === 'i2s' ? ' single-col' : '');
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.dataset.key = opt.key;
        if(mode === 'i2s'){
          btn.textContent = opt.settlement.replace('*','');
        } else {
          const img = document.createElement('img');
          img.src = flagSrc(opt.key);
          btn.appendChild(img);
          const span = document.createElement('span');
          span.textContent = opt.name;
          btn.appendChild(span);
        }
        btn.addEventListener('click', () => answer(btn, opt.key === target.key, target.key));
        choicesWrap.appendChild(btn);
      });
      el.qcard.appendChild(choicesWrap);

    } else if(mode === 'size'){
      const pair = pickRandom(islands, 2, null);
      const [a, b] = pair;
      const correctKey = a.size_sqmi >= b.size_sqmi ? a.key : b.key;
      lastComparePair = { a, b, correctKey };

      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:14px;';
      hint.textContent = "Just take your best guess — you'll find out the answer either way, and get a little sharper each round.";
      el.qcard.appendChild(hint);

      const label = document.createElement('div');
      label.className = 'qprompt-label';
      label.textContent = 'Which island is bigger in area?';
      el.qcard.appendChild(label);

      const choicesWrap = document.createElement('div');
      choicesWrap.className = 'choices';
      [a, b].forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.dataset.key = opt.key;
        const img = document.createElement('img');
        img.src = flagSrc(opt.key);
        btn.appendChild(img);
        const span = document.createElement('span');
        span.textContent = opt.name;
        btn.appendChild(span);
        btn.addEventListener('click', () => answer(btn, opt.key === correctKey, correctKey));
        choicesWrap.appendChild(btn);
      });
      el.qcard.appendChild(choicesWrap);

    } else if(mode === 'order'){
      const N = 3;
      const maxStart = islands.length - N - 1;
      const start = Math.floor(Math.random() * Math.max(1, maxStart));
      const shown = islands.slice(start, start + N);
      const correctNext = islands[start + N];
      const distractors = pickRandom(islands, 3, correctNext.key);
      const options = [correctNext, ...distractors].sort(() => Math.random()-0.5);

      const label = document.createElement('div');
      label.className = 'qprompt-label';
      label.textContent = 'What comes next in the song?';
      el.qcard.appendChild(label);

      const seqRow = document.createElement('div');
      seqRow.style.display = 'flex'; seqRow.style.justifyContent='center'; seqRow.style.gap='8px'; seqRow.style.marginBottom='16px';
      shown.forEach(c => {
        const img = document.createElement('img');
        img.src = flagSrc(c.key);
        img.style.width='54px'; img.style.height='38px'; img.style.objectFit='cover'; img.style.borderRadius='6px';
        seqRow.appendChild(img);
      });
      el.qcard.appendChild(seqRow);

      const choicesWrap = document.createElement('div');
      choicesWrap.className = 'choices';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.dataset.key = opt.key;
        const img = document.createElement('img');
        img.src = flagSrc(opt.key);
        btn.appendChild(img);
        const span = document.createElement('span');
        span.textContent = opt.name;
        btn.appendChild(span);
        btn.addEventListener('click', () => answer(btn, opt.key === correctNext.key, correctNext.key));
        choicesWrap.appendChild(btn);
      });
      el.qcard.appendChild(choicesWrap);
    }

    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.dataset.el2 = 'feedback';
    el.qcard.appendChild(feedback);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nextbtn';
    nextBtn.textContent = 'Next ▸';
    nextBtn.addEventListener('click', () => { newQuestion(); });
    el.qcard.appendChild(nextBtn);
  }

  function answer(btnEl, isCorrect, correctKey){
    const allChoices = el.qcard.querySelectorAll('.choice');
    allChoices.forEach(b => b.disabled = true);
    if(isCorrect){ btnEl.classList.add('correct'); } else { btnEl.classList.add('wrong'); }

    const feedback = el.qcard.querySelector('[data-el2="feedback"]');
    const nextBtn = el.qcard.querySelector('.nextbtn');

    if(mode === 'size'){
      const { a, b, correctKey: ck } = lastComparePair;
      const winner = ck === a.key ? a : b;
      const loser = ck === a.key ? b : a;

      const bar = streaks[mode];
      let milestoneMsg = '';
      if(isCorrect){
        bar.current += 1;
        if(bar.current > bar.best) bar.best = bar.current;
        const milestones = [5, 10, 15, 20, 25, 30];
        if(milestones.includes(bar.current)) milestoneMsg = ' 🔥 ' + bar.current + ' in a row!';
      } else {
        bar.current = 0;
      }
      saveStreaks(streaks);
      renderStreak();

      if(isCorrect){
        feedback.textContent = 'Correct! ' + winner.name + ' is bigger than ' + loser.name + '.' + milestoneMsg;
        feedback.className = 'feedback correct';
      } else {
        feedback.textContent = 'Not quite — ' + winner.name + ' is bigger than ' + loser.name + '.';
        feedback.className = 'feedback wrong';
        const correctBtn = el.qcard.querySelector('.choice[data-key="' + ck + '"]');
        if(correctBtn) correctBtn.classList.add('correct');
      }
      nextBtn.classList.add('show');
      return;
    }

    if(isCorrect){
      feedback.textContent = 'Correct! Nice work.';
      feedback.className = 'feedback correct';
      if(mode !== 'order'){
        const rec = progress[correctKey];
        const today = todayStr();
        rec.correctDates.push(today);
        saveProgress(progress);
      }
    } else {
      feedback.textContent = 'Not quite — the correct answer is highlighted.';
      feedback.className = 'feedback wrong';
      const correctBtn = el.qcard.querySelector('.choice[data-key="' + correctKey + '"]');
      if(correctBtn) correctBtn.classList.add('correct');
    }
    nextBtn.classList.add('show');
    renderProgress();
  }

  container.querySelectorAll('.modebtn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.modebtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      const isCompare = (mode === 'size');
      el.masteryBar.style.display = isCompare ? 'none' : 'flex';
      el.starGrid.style.display = isCompare ? 'none' : 'grid';
      el.streakBar.style.display = isCompare ? 'flex' : 'none';
      el.streakHint.classList.toggle('hidden', !isCompare);
      el.browseBtn.classList.toggle('hidden', !isCompare);
      browsing = false;
      el.browseBtn.textContent = '📖 See the rankings first';
      if(isCompare) renderStreak();
      newQuestion();
    });
  });

  el.browseBtn.addEventListener('click', () => {
    browsing = !browsing;
    el.browseBtn.textContent = browsing ? '🎯 Back to the quiz' : '📖 See the rankings first';
    newQuestion();
  });

  el.resetLink.addEventListener('click', () => {
    if(confirm('This clears all mastery progress AND compare-mode streaks. Continue?')){
      progress = {};
      islands.forEach(c => progress[c.key] = { correctDates: [] });
      saveProgress(progress);
      streaks = { size: { current: 0, best: 0 } };
      saveStreaks(streaks);
      renderProgress();
      renderStreak();
      newQuestion();
    }
  });

  renderProgress();
  newQuestion();
}

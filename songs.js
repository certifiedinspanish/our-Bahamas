// songs.js — Islands Song & Main Settlements Song synced players
// Uses real audio files (audio/islands-song.m4a, audio/settlements-song.m4a)
// and the real flag images already in /flags, matched via islands.json's "key" field.

const JUNKANOO_PALETTE = ["#0056A3", "#00C4CC", "#FFD700", "#FF6F61"]; // Deep Blue, Turquoise, Sunshine, Coral

const ISLANDS_SONG_CUES = [
  {time:0.97, key:"abaco"},
  {time:2.85, key:"acklins"},
  {time:4.66, key:"andros"},
  {time:6.68, key:"berry_islands"},
  {time:8.76, key:"bimini"},
  {time:10.61, key:"cat_island"},
  {time:12.71, key:"crooked_island"},
  {time:14.73, key:"eleuthera"},
  {time:16.72, key:"exuma"},
  {time:18.75, key:"grand_bahama"},
  {time:20.84, key:"inagua"},
  {time:22.91, key:"long_island"},
  {time:26.62, key:"mayaguana"},
  {time:29.94, key:"new_providence"},
  {time:31.75, key:"ragged_island"},
  {time:33.59, key:"san_salvador"}
];

const SETTLEMENTS_SONG_CUES = [
  {time:1.11, key:"abaco"},
  {time:3.72, key:"acklins"},
  {time:6.44, key:"andros"},
  {time:8.87, key:"berry_islands"},
  {time:14.12, key:"bimini"},
  {time:16.18, key:"cat_island"},
  {time:18.80, key:"crooked_island"},
  {time:22.02, key:"eleuthera"},
  {time:27.36, key:"exuma"},
  {time:30.44, key:"grand_bahama"},
  {time:33.31, key:"inagua"},
  {time:35.75, key:"long_island"},
  {time:41.23, key:"mayaguana"},
  {time:43.84, key:"new_providence"},
  {time:46.42, key:"ragged_island"},
  {time:49.38, key:"san_salvador"}
];

function fmtTime(t){
  if(isNaN(t)) return "0:00";
  const m = Math.floor(t/60);
  const s = Math.floor(t%60).toString().padStart(2,"0");
  return m+":"+s;
}

function buildSongPlayer({container, islands, cues, audioSrc, showSettlement, hasVerses}){
  const islandByKey = {};
  islands.forEach(isl => { islandByKey[isl.key] = isl; });

  const data = cues.map((c, i) => ({
    time: c.time,
    key: c.key,
    name: islandByKey[c.key].name,
    settlement: islandByKey[c.key].settlement,
    flagPath: `flags/${c.key}.png`,
    verse: hasVerses ? Math.floor(i/4)+1 : null
  }));

  container.innerHTML = `
    <div class="songPlayer">
      <div class="songStage" id="songStage"></div>
      <div class="songControls">
        <button class="songPlayBtn" id="songPlayBtn">▶</button>
        <div class="songProgressWrap">
          <div class="songProgressTrack" id="songProgressTrack">
            <div class="songProgressFill" id="songProgressFill"></div>
          </div>
          <div class="songTimeRow">
            <span id="songTimeCur">0:00</span>
            <span id="songTimeTotal">0:00</span>
          </div>
        </div>
      </div>
      <div class="songTracklist" id="songTracklist"></div>
      <audio id="songAudio" src="${audioSrc}" preload="metadata"></audio>
    </div>
  `;

  const stage = container.querySelector("#songStage");
  const audio = container.querySelector("#songAudio");
  const playBtn = container.querySelector("#songPlayBtn");
  const track = container.querySelector("#songProgressTrack");
  const fill = container.querySelector("#songProgressFill");
  const curLabel = container.querySelector("#songTimeCur");
  const totalLabel = container.querySelector("#songTimeTotal");
  const tracklist = container.querySelector("#songTracklist");

  const cards = data.map((d, i) => {
    const card = document.createElement("div");
    card.className = "songCard";
    const color = JUNKANOO_PALETTE[i % JUNKANOO_PALETTE.length];
    card.style.setProperty("--card-color", color);

    const flagCard = document.createElement("div");
    flagCard.className = "songFlagCard";
    const flagImg = document.createElement("img");
    flagImg.className = "songFlagImg";
    flagImg.src = d.flagPath;
    flagImg.alt = d.name + " flag";
    flagCard.appendChild(flagImg);

    const nameEl = document.createElement("div");
    nameEl.className = "songName";
    nameEl.textContent = d.name;

    card.appendChild(flagCard);
    card.appendChild(nameEl);

    if(showSettlement){
      const settEl = document.createElement("div");
      settEl.className = "songSettlement";
      settEl.textContent = d.settlement;
      card.appendChild(settEl);
    }

    stage.appendChild(card);
    return card;
  });

  const chips = data.map(d => {
    const chip = document.createElement("span");
    chip.className = "songChip";
    chip.textContent = d.name;
    tracklist.appendChild(chip);
    return chip;
  });

  function layoutTicks(){
    track.querySelectorAll(".songTick").forEach(t => t.remove());
    const dur = audio.duration || 0;
    if(!dur) return;
    data.forEach(d => {
      const tick = document.createElement("div");
      tick.className = "songTick";
      tick.style.left = (d.time/dur*100) + "%";
      track.appendChild(tick);
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    totalLabel.textContent = fmtTime(audio.duration);
    layoutTicks();
  });

  let currentIndex = -1;

  function activateIndex(idx){
    if(idx === currentIndex) return;
    currentIndex = idx;
    cards.forEach((c, i) => c.classList.toggle("active", i === idx));
    chips.forEach((c, i) => c.classList.toggle("done", i <= idx));
  }

  function tick(){
    const t = audio.currentTime;
    let idx = -1;
    for(let i=0; i<data.length; i++){
      if(data[i].time <= t) idx = i; else break;
    }
    activateIndex(idx);

    const dur = audio.duration || 1;
    fill.style.width = (t/dur*100) + "%";
    curLabel.textContent = fmtTime(t);

    if(!audio.paused && !audio.ended){
      requestAnimationFrame(tick);
    }
  }

  playBtn.addEventListener("click", () => {
    if(audio.paused){
      audio.play();
      requestAnimationFrame(tick);
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => { playBtn.textContent = "⏸"; });
  audio.addEventListener("pause", () => { playBtn.textContent = "▶"; });
  audio.addEventListener("ended", () => { playBtn.textContent = "▶"; });

  track.addEventListener("click", (e) => {
    const rect = track.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * (audio.duration || 0);
    if(audio.paused){ tick(); }
  });
}

function createIslandsSong({container, islands}){
  buildSongPlayer({
    container,
    islands,
    cues: ISLANDS_SONG_CUES,
    audioSrc: "audio/islands-song.m4a?v=1",
    showSettlement: true,
    hasVerses: false
  });
}

function createSettlementsSong({container, islands}){
  buildSongPlayer({
    container,
    islands,
    cues: SETTLEMENTS_SONG_CUES,
    audioSrc: "audio/settlements-song.m4a?v=1",
    showSettlement: true,
    hasVerses: true
  });
}

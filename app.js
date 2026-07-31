async function loadJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error('Failed to load ' + path);
  return res.json();
}

async function main(){
  const islands = await loadJSON('islands.json?v=1');

  let practiceBuilt = false;
  let islandsongBuilt = false;
  let settlementsBuilt = false;

  const views = {
    home: document.getElementById('view-home'),
    practice: document.getElementById('view-practice'),
    islandsong: document.getElementById('view-islandsong'),
    settlements: document.getElementById('view-settlements'),
  };
  const backBtn = document.getElementById('backBtn');

  function showView(name){
    Object.entries(views).forEach(([key, node]) => {
      node.classList.toggle('hidden', key !== name);
    });
    backBtn.classList.toggle('hidden', name === 'home');

    if(name === 'practice' && !practiceBuilt){
      createTester({
        container: document.getElementById('practiceRoot'),
        islands,
      });
      practiceBuilt = true;
    }

    if(name === 'islandsong' && !islandsongBuilt){
      createIslandsSong({
        container: document.getElementById('islandsongRoot'),
        islands,
      });
      islandsongBuilt = true;
    }

    if(name === 'settlements' && !settlementsBuilt){
      createSettlementsSong({
        container: document.getElementById('settlementsRoot'),
        islands,
      });
      settlementsBuilt = true;
    }

    window.scrollTo(0, 0);
  }

  document.querySelectorAll('[data-goto]').forEach(tile => {
    tile.addEventListener('click', () => showView(tile.dataset.goto));
  });
  backBtn.addEventListener('click', () => showView('home'));

  showView('home');
}

main().catch(err => {
  document.body.innerHTML =
    '<div style="padding:40px;text-align:center;color:#0B2A4A;font-family:sans-serif;">' +
    '<h2>Could not load the app</h2>' +
    '<p style="color:#5C7A96;">' + err.message + '</p>' +
    '<p style="color:#5C7A96;font-size:13px;">If you\'re opening this file directly from disk, that\'s expected — this app needs to be served from a real web address (like GitHub Pages) to load its data files.</p>' +
    '</div>';
  console.error(err);
});

// Theme toggle
(function theme(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  let dark = true;
  btn.addEventListener('click', ()=>{
    dark = !dark;
    document.documentElement.style.filter = dark ? 'none' : 'invert(1) hue-rotate(180deg)';
  });
})();

// ---------- Tab Switching ----------
(function tabs(){
  const tabs = document.querySelectorAll('.tab');
  const wraps = document.querySelectorAll('.game-wrap');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>{b.classList.remove('active'); b.setAttribute('aria-selected','false')});
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    wraps.forEach(w=>w.classList.remove('active'));
    document.getElementById(btn.dataset.target).classList.add('active');
  }));
})();

// Small helper: countdown overlay for any canvas section
function countdownOverlay(overlayEl, seconds=3){
  return new Promise(resolve=>{
    overlayEl.classList.remove('hidden');
    let n = seconds;
    const tick = ()=>{
      overlayEl.textContent = n>0 ? n : 'GO!';
      if(n<0){
        overlayEl.classList.add('hidden');
        resolve();
      } else {
        n--;
        setTimeout(tick, 700);
      }
    };
    tick();
  });
}

// ---------- Tic Tac Toe ----------
(function ttt(){
  const gridEl = document.getElementById('tttGrid');
  const statusEl = document.getElementById('tttStatus');
  const diffEl = document.getElementById('tttDiff');
  const startEl = document.getElementById('tttStart');
  const resetEl = document.getElementById('tttReset');
  let board, human='X', ai='O', gameOver=false, started=false;

  function emptyIndices(b){return b.map((v,i)=>v?null:i).filter(v=>v!==null)}
  function winner(b){
    const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,c,d] of L){if(b[a] && b[a]===b[c] && b[a]===b[d]) return b[a];}
    if(!b.includes(null)) return 'tie';
    return null;
  }
  function randomMove(){const e=emptyIndices(board);return e[Math.floor(Math.random()*e.length)]}
  function bestMoveRegular(){
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const sym of [ai,human]){
      for(const L of lines){
        const vals=L.map(i=>board[i]);
        if(vals.filter(v=>v===sym).length===2 && vals.includes(null)){
          return L[vals.indexOf(null)];
        }
      }
    }
    return randomMove();
  }
  function minimax(newBoard, player, depth=0){
    const W=winner(newBoard);
    if(W===human) return {score:-10+depth};
    if(W===ai) return {score:10-depth};
    if(W==='tie') return {score:0};
    const moves=[];
    for(const i of emptyIndices(newBoard)){
      const move={index:i};
      newBoard[i]=player;
      move.score=minimax(newBoard, player===ai?human:ai, depth+1).score;
      newBoard[i]=null;
      moves.push(move);
    }
    if(player===ai){
      return moves.reduce((a,b)=>a.score>b.score?a:b);
    } else {
      return moves.reduce((a,b)=>a.score<b.score?a:b);
    }
  }
  function aiMove(){
    if(gameOver || !started) return;
    let move;
    const d=diffEl.value;
    if(d==='trash') move=randomMove();
    else if(d==='regular') move=bestMoveRegular();
    else move=minimax([...board], ai).index;
    place(move, ai);
  }
  function place(i, sym){
    if(!started || board[i]||gameOver) return;
    board[i]=sym;
    render();
    const W=winner(board);
    if(W){
      gameOver=true;
      statusEl.textContent= W==='tie'? 'Tie game.' : (W===human? 'You win! 🎉' : 'AI wins.');
      return;
    }
    if(sym===human) setTimeout(aiMove, 220);
  }
  function render(){
    gridEl.innerHTML='';
    board.forEach((v,i)=>{
      const cell=document.createElement('div');
      cell.className='cell';
      cell.setAttribute('role','gridcell');
      cell.setAttribute('aria-label',`Cell ${i+1}`);
      cell.textContent=v||'';
      cell.addEventListener('click',()=>{ place(i,human); });
      gridEl.appendChild(cell);
    })
  }
  function resetBoard(){
    board=Array(9).fill(null); gameOver=false; started=false; statusEl.textContent='Select difficulty, then Start.'; render();
  }
  function start(){ resetBoard(); started=true; statusEl.textContent='You are X. Your move.'; }
  startEl.addEventListener('click', start);
  resetEl.addEventListener('click', resetBoard);
  diffEl.addEventListener('change', resetBoard);
  resetBoard();
})();

// ---------- Pong (difficulty now clearly affects AI) ----------
(function pong(){
  const canvas=document.getElementById('pongCanvas');
  const ctx=canvas.getContext('2d');
  const startBtn=document.getElementById('pongStart');
  const resetBtn=document.getElementById('pongReset');
  const diffSel=document.getElementById('pongDiff');
  const overlay=document.getElementById('pongOverlay');
  let anim, state, running=false, waiting=false;

  function reset(){
    state={
      w:canvas.width,h:canvas.height,
      p1:{x:24,y:canvas.height/2-40,w:14,h:90,vy:0,score:0},
      p2:{x:canvas.width-38,y:canvas.height/2-40,w:14,h:90,vy:0,score:0, lag:0},
      ball:{x:canvas.width/2,y:canvas.height/2,vx:0,vy:0,r:9,speed:5,started:false},
      keys:{}
    };
    drawFrame();
  }

  function aiParams(){
    const d = diffSel.value;
    if(d==='trash')   return {speed:3.0, lag:0.12};   // slower, noticeable delay
    if(d==='expert')  return {speed:8.5, lag:0.02};   // very quick, tiny delay
    return            {speed:5.5, lag:0.06};          // regular
  }

  function serve(dir){
    state.ball.x=state.w/2; state.ball.y=state.h/2;
    const d = diffSel.value;
    const base = d==='expert'?6.8 : d==='trash'?4.6 : 5.6;
    const angle = (Math.random()*0.6 - 0.3);
    state.ball.vx = Math.sign(dir|| (Math.random()>.5?1:-1)) * base;
    state.ball.vy = angle * base*1.2;
    state.ball.started = true;
  }
  function countdownStart(){
    if(waiting) return;
    waiting=true;
    countdownOverlay(overlay,3).then(()=>{ serve( (Math.random()>.5?1:-1) ); running=true; waiting=false; loop(); });
  }
  function gameOver(msg){
    running=false; cancelAnimationFrame(anim);
    overlay.textContent = msg; overlay.classList.remove('hidden');
  }
  function loop(){
    if(!running) return;
    anim=requestAnimationFrame(loop);
    const s=state; const {w,h,p1,p2,ball}=s;

    // input
    const up = s.keys['ArrowUp']||s.keys['KeyW'];
    const down = s.keys['ArrowDown']||s.keys['KeyS'];
    p1.vy = up? -7 : down? 7 : 0;
    p1.y+=p1.vy; p1.y=Math.max(0, Math.min(h-p1.h, p1.y));

    // AI with difficulty params
    const {speed:aiSpeed, lag} = aiParams();
    // simple reaction lag: p2 moves a fraction toward target each frame
    const targetY = ball.y - p2.h/2;
    p2.y += Math.max(-aiSpeed, Math.min(aiSpeed, (targetY - p2.y)*(1-lag)));
    p2.y=Math.max(0, Math.min(h-p2.h, p2.y));

    // ball
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.y<ball.r||ball.y>h-ball.r) {ball.vy*=-1;}
    function collide(p){ if(ball.x-ball.r<p.x+p.w && ball.x+ball.r>p.x && ball.y>p.y && ball.y<p.y+p.h){
      ball.vx*=-1; const off=(ball.y-(p.y+p.h/2))/(p.h/2); ball.vy=off*6; ball.x = p===p1? p.x+p.w+ball.r : p.x-ball.r; ball.speed*=1.02; }
    }
    collide(p1); collide(p2);
    if(ball.x<-30){ s.p2.score++; if(s.p2.score>=5) return gameOver('AI wins'); serve(1); }
    else if(ball.x>w+30){ s.p1.score++; if(s.p1.score>=5) return gameOver('You win'); serve(-1); } 
    drawFrame();
  }
  function drawFrame(){
    const {w,h,p1,p2,ball} = state;
    ctx.clearRect(0,0,w,h);
    // background
    const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#08101a'); g.addColorStop(1,'#0b0f18'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // center line
    ctx.strokeStyle='#2a3c66'; ctx.setLineDash([10,12]); ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke(); ctx.setLineDash([]);
    // paddles
    ctx.fillStyle='#00e0ff'; roundRect(ctx,p1.x,p1.y,p1.w,p1.h,6,true,false);
    ctx.fillStyle='#ff4d9d'; roundRect(ctx,p2.x,p2.y,p2.w,p2.h,6,true,false);
    // ball
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
    // score
    ctx.fillStyle='#b7c9ff'; ctx.font='bold 18px ui-monospace'; ctx.fillText(`${state.p1.score}`, w*0.25, 26);
    ctx.fillText(`${state.p2.score}`, w*0.75, 26);
  }
  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
    if (fill) ctx.fill(); if (stroke) ctx.stroke();
  }
  function start(){ cancelAnimationFrame(anim); overlay.classList.add('hidden'); running=false; reset(); countdownStart(); }
  function hardReset(){ cancelAnimationFrame(anim); overlay.classList.add('hidden'); running=false; reset(); }
  window.addEventListener('keydown',e=>state&&(state.keys[e.code]=true));
  window.addEventListener('keyup',e=>state&&(state.keys[e.code]=false));
  startBtn.addEventListener('click',start);
  resetBtn.addEventListener('click',hardReset);
  diffSel.addEventListener('change',()=>{ /* diff applies immediately */ });
  reset();
})();

// ---------- Flappy (pixel-style, responsive, 288x512 base, countdown) ----------
(function flappy(){
  const c = document.getElementById('flappyCanvas');
  const x = c.getContext('2d', { alpha: false });

  const startBtn = document.getElementById('flappyStart');
  const resetBtn = document.getElementById('flappyReset');
  const overlay  = document.getElementById('flappyOverlay');

  // Base logical size (close to original FB: 288x512)
  const BASE_W = 280, BASE_H = 570;

  function setupCanvas() {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  c.width  = BASE_W * dpr;
  c.height = BASE_H * dpr;

  // Remove forced sizing — let CSS keep portrait ratio
  c.style.removeProperty('width');
  c.style.removeProperty('height');

  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.imageSmoothingEnabled = false;
}


  // Game state
  let s, raf, running=false, started=false, t=0, groundScroll=0;

  function init() {
  setupCanvas();
  s = {
    g: 0.25,
    maxFall: 4.5,
    flapVy: -5.5,
    bird: { x: 72, y: BASE_H/2 - 12, vy: 0, r: 12, wing: 0, tilt: 0 },
    pipes: [],
    score: 0,
    best: +localStorage.getItem('flappyBest') || 0,

    // --- PIPE TUNING ---
    // vertical opening will be randomized between these:
    pipeGapMin: 110,
    pipeGapMax: 150,
    pipeSpeed: 2,          // scroll speed

    // horizontal spacing is controlled by spawn timing (in frames)
    // larger numbers = more distance between pipe pairs
    spawnEveryMin: 100,    // ~ more spread out than before
    spawnEveryMax: 150,

    groundH: 112,

    // internal scheduler for next spawn
    nextSpawn: 0
  };
  t = 0;
  groundScroll = 0;
  s.nextSpawn = 30;        // first pipe after a short delay
  draw();                  // first frame
}


  function spawnPipe() {
  // pick a random vertical gap
  const gap = Math.floor(s.pipeGapMin + Math.random() * (s.pipeGapMax - s.pipeGapMin));

  // choose a safe top position given the gap and ground
  const minTop = 40;
  const maxTop = BASE_H - s.groundH - 40 - gap;
  const top = Math.floor(minTop + Math.random() * (maxTop - minTop));

  const pipe = {
    x: BASE_W + 24,
    w: 52,
    top: top,
    gap: gap,
    passed: false
  };
  s.pipes.push(pipe);

  // schedule next pipe with randomized horizontal spacing (via time)
  const interval = Math.floor(s.spawnEveryMin + Math.random() * (s.spawnEveryMax - s.spawnEveryMin));
  s.nextSpawn = t + interval;
}


  // Controls
  function flap(){
    if(!running || !started) return;
    s.bird.vy = s.flapVy;
  }

  // Main loop
  function loop(){
    raf = requestAnimationFrame(loop);
    t++;

    // Pipe cadence ~ every 90 ticks
    if (started && t >= s.nextSpawn) spawnPipe();


    if(started){
      // Bird physics
      s.bird.vy = Math.min(s.maxFall, s.bird.vy + s.g);
      s.bird.y += s.bird.vy;
      s.bird.wing = (s.bird.wing + 1) % 30;
      s.bird.tilt = Math.max(-0.4, Math.min(0.6, s.bird.vy / 10));

      // Pipes move
      s.pipes.forEach(p => p.x -= s.pipeSpeed);
      s.pipes = s.pipes.filter(p => p.x > -80);

      // Scoring & collisions
      for(const p of s.pipes){
        // score once when passed
        if(!p.passed && p.x + p.w < s.bird.x - s.bird.r) {
          p.passed = true;
          s.score++;
        }
        // collision with pipe body
        const inX = s.bird.x + s.bird.r > p.x && s.bird.x - s.bird.r < p.x + p.w;
        const inTop = s.bird.y - s.bird.r < p.top;
        const inBottom = s.bird.y + s.bird.r > p.top + p.gap;
        if(inX && (inTop || inBottom)) return gameOver();
      }

      // Ground collision
      const groundY = BASE_H - s.groundH;
      if(s.bird.y + s.bird.r >= groundY) return gameOver();
      if(s.bird.y - s.bird.r <= 0) return gameOver();

      // Scroll ground
      groundScroll = (groundScroll + s.pipeSpeed) % 24;
    }

    draw();
  }

  // --- Drawing helpers (original-feeling but unique) ---

  function drawSky(){
    // Bright top sky to deeper lower blue
    const g = x.createLinearGradient(0,0,0,BASE_H);
    g.addColorStop(0,'#70c5ce');  // light aqua
    g.addColorStop(1,'#4ab3c7');  // deeper teal
    x.fillStyle = g;
    x.fillRect(0,0,BASE_W,BASE_H);
  }

  function drawClouds(){
    // Simple repeating “puffy” clouds—low alpha so they feel distant
    x.globalAlpha = 0.25;
    const base = (performance.now()/40)% (BASE_W+180);
    for(let i=0;i<5;i++){
      const cx = (base + i*140)%(BASE_W+180) - 90;
      const cy = 60 + (i%2? 22 : 0);
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(cx,cy,18,0,Math.PI*2);
      x.arc(cx+14,cy+2,14,0,Math.PI*2);
      x.arc(cx-14,cy+4,14,0,Math.PI*2);
      x.fill();
    }
    x.globalAlpha = 1;
  }

  function drawGround(){
    const y = BASE_H - s.groundH;

    // Dirt (bottom)
    x.fillStyle = '#ded895'; // sandy tan
    x.fillRect(0, y+24, BASE_W, s.groundH-24);

    // Grass strip (top)
    x.fillStyle = '#83d05d';
    x.fillRect(0, y, BASE_W, 26);

    // Pixel “tufts”
    x.fillStyle = '#6cb84b';
    for(let i=-groundScroll;i<BASE_W;i+=24){
      x.fillRect(i, y+16, 10, 4);
      x.fillRect(i+12, y+10, 8, 4);
      x.fillRect(i+6, y+20, 6, 4);
    }

    // Pebbles in dirt
    x.fillStyle = '#cfc57c';
    for(let i=4;i<BASE_W;i+=16){
      x.fillRect(i, y+34 + ((i/16)%2?2:0), 2, 2);
    }
  }

  function drawPipePair(p){
    const topH = p.top;
    const gap = p.gap;
    const bottomY = p.top + gap;
    const w = p.w;

    // Pipe color & shading (distinct green, not the exact sprite)
    const body = x.createLinearGradient(p.x,0,p.x+w,0);
    body.addColorStop(0,'#2abb4f');
    body.addColorStop(1,'#249f45');

    // TOP SHANK
    x.fillStyle = body;
    x.fillRect(p.x, 0, w, topH);

    // BOTTOM SHANK
    x.fillRect(p.x, bottomY, w, BASE_H - bottomY - s.groundH);

    // Lips/caps
    x.fillStyle = '#33cc63';
    x.fillRect(p.x-3, topH-16, w+6, 16);     // top cap
    x.fillRect(p.x-3, bottomY,  w+6, 16);     // bottom cap

    // Inner edge highlight to mimic “tube”
    x.fillStyle = 'rgba(255,255,255,0.15)';
    x.fillRect(p.x+4, 0, 3, topH);
    x.fillRect(p.x+4, bottomY, 3, BASE_H - bottomY - s.groundH);

    // Outline
    x.strokeStyle = '#1e803a';
    x.lineWidth = 1;
    x.strokeRect(p.x+0.5, 0.5, w, topH);
    x.strokeRect(p.x+0.5, bottomY+0.5, w, BASE_H - bottomY - s.groundH - 1);
  }

  function drawBird(){
    const b = s.bird;
    x.save();
    x.translate(b.x, b.y);
    x.rotate(b.tilt);

    // Body: yellow/orange radial (distinct from original but similar vibe)
    const g = x.createRadialGradient(-3,-3,2, 0,0,b.r+3);
    g.addColorStop(0,'#ffe9a3');
    g.addColorStop(1,'#ffc94d');
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, b.r, 0, Math.PI*2);
    x.fill();

    // Belly
    x.fillStyle = '#fff6dc';
    x.beginPath();
    x.arc(-2, 4, b.r*0.65, 0, Math.PI*2);
    x.fill();

    // Wing (simple bob)
    const wy = Math.sin(b.wing/30*Math.PI*2) * 3;
    x.fillStyle = '#f4c14d';
    x.beginPath();
    x.ellipse(-5, wy, 8, 5, 0, 0, Math.PI*2);
    x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.15)';
    x.stroke();

    // Eye
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(6, -4, 4, 0, Math.PI*2); x.fill();
    x.fillStyle = '#333';
    x.beginPath(); x.arc(7, -4, 2, 0, Math.PI*2); x.fill();

    // Beak
    x.fillStyle = '#ff9029';
    x.beginPath();
    x.moveTo(10, 2);
    x.lineTo(18, 6);
    x.lineTo(10, 10);
    x.closePath();
    x.fill();

    x.restore();
  }

  function drawHUD(){
    x.fillStyle = '#ffffff';
    x.font = 'bold 20px ui-monospace';
    x.fillText('Score: '+s.score, 10, 26);
    x.fillText('Best: '+s.best, 10, 46);
  }

  function draw(){
    drawSky();
    drawClouds();

    // Pipes
    for(const p of s.pipes) drawPipePair(p);

    // Bird
    drawBird();

    // Ground (drawn last so it overlaps lower pipes)
    drawGround();

    drawHUD();
  }

  function start(){
    cancelAnimationFrame(raf); running=false; started=false; init();
    countdownOverlay(overlay,3).then(()=>{
      started=true; running=true; loop();
    });
  }

  function hardReset(){
    cancelAnimationFrame(raf);
    overlay.classList.add('hidden');
    running=false; started=false;
    init();
  }

  function gameOver(){
    running=false; cancelAnimationFrame(raf);
    s.best = Math.max(s.best, s.score);
    localStorage.setItem('flappyBest', s.best);
    overlay.textContent = 'Game Over — ' + s.score;
    overlay.classList.remove('hidden');
  }

  // Input
  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', hardReset);
  window.addEventListener('keydown', e=>{
    if(e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp'){
      e.preventDefault();
      flap();
    }
  });
  c.addEventListener('mousedown', flap);

  // Re-setup on resize to keep crisp and sized
  window.addEventListener('resize', ()=>{
    const wasRunning = running, wasStarted = started, old = {...s};
    setupCanvas(); // re-scale backing resolution
    // Keep state (no hard reset) so it just looks sharper/smaller
    if(wasRunning){
      cancelAnimationFrame(raf);
      loop();
    } else {
      draw();
    }
  });

  init();
})();


// ---------- Asteroids (3s countdown + safe spawning) ----------
(function asteroids(){
  const c=document.getElementById('astCanvas'); const g=c.getContext('2d');
  const startBtn=document.getElementById('astStart'); const resetBtn=document.getElementById('astReset'); const diff=document.getElementById('astDiff');
  const overlay=document.getElementById('astOverlay');
  let s, raf, running=false;

  function params(){
    const d=diff.value;
    if(d==='easy')   return {spawn:5,  rockSpeed:1.1, split:2, bulletLife:70, fireDelay:200, safeRadius:160};
    if(d==='hard')   return {spawn:10, rockSpeed:1.8, split:3, bulletLife:55, fireDelay:130, safeRadius:160};
    return             {spawn:7,  rockSpeed:1.4, split:2, bulletLife:60, fireDelay:170, safeRadius:160}; // normal
  }

  function reset(){
    const P=params();
    s={
      keys:{},
      ship:{x:c.width/2,y:c.height/2,a:0,thrust:0,vel:{x:0,y:0}},
      bullets:[], rocks:[], score:0, lastFire:0, P
    };
    populateRocks(); // all rocks start away from ship
    draw();
  }

  function rockOk(x,y,r){
    const dx=x - s.ship.x, dy=y - s.ship.y;
    return Math.hypot(dx,dy) > (s.P.safeRadius + r);
  }

  function makeRock(r=18+Math.random()*24, x=null, y=null){
    let rx = x ?? Math.random()*c.width;
    let ry = y ?? Math.random()*c.height;
    // ensure not too close to ship
    let tries=0;
    while(!rockOk(rx,ry,r) && tries<40){
      rx = Math.random()*c.width; ry = Math.random()*c.height; tries++;
    }
    const sp = s.P.rockSpeed*(0.8+Math.random()*0.6);
    return {x:rx, y:ry, vx:(Math.random()*2-1)*sp, vy:(Math.random()*2-1)*sp, r};
  }

  function populateRocks(){
    s.rocks.length=0;
    for(let i=0;i<s.P.spawn;i++) s.rocks.push(makeRock());
  }

  function fire(){
    const now=performance.now();
    if(now - s.lastFire < s.P.fireDelay) return;
    s.lastFire=now;
    const sp=7;
    s.bullets.push({x:s.ship.x, y:s.ship.y, vx:Math.cos(s.ship.a)*sp+s.ship.vel.x, vy:Math.sin(s.ship.a)*sp+s.ship.vel.y, life:s.P.bulletLife});
  }

  function loop(){ raf=requestAnimationFrame(loop);
    // input (A/D rotate, W thrust, Space fire)
    if(s.keys['ArrowLeft']||s.keys['KeyA']) s.ship.a-=0.06;
    if(s.keys['ArrowRight']||s.keys['KeyD']) s.ship.a+=0.06;
    if(s.keys['ArrowUp']||s.keys['KeyW']) s.ship.thrust=0.16; else s.ship.thrust=0;
    if(s.keys['Space']) fire();

    // physics
    s.ship.vel.x+=Math.cos(s.ship.a)*s.ship.thrust; s.ship.vel.y+=Math.sin(s.ship.a)*s.ship.thrust;
    s.ship.vel.x*=0.992; s.ship.vel.y*=0.992;
    s.ship.x=(s.ship.x+s.ship.vel.x+c.width)%c.width; s.ship.y=(s.ship.y+s.ship.vel.y+c.height)%c.height;
    s.bullets.forEach(b=>{b.x=(b.x+b.vx+c.width)%c.width; b.y=(b.y+b.vy+c.height)%c.height; b.life--;});
    s.bullets=s.bullets.filter(b=>b.life>0);
    s.rocks.forEach(r=>{r.x=(r.x+r.vx+c.width)%c.width; r.y=(r.y+r.vy+c.height)%c.height;});

    // collisions
    for(let i=s.rocks.length-1;i>=0;i--){ const r=s.rocks[i];
      const dx=r.x-s.ship.x, dy=r.y-s.ship.y; if(Math.hypot(dx,dy)<r.r+10){ return gameOver(); }
      for(let j=s.bullets.length-1;j>=0;j--){ const b=s.bullets[j]; if(Math.hypot(r.x-b.x,r.y-b.y)<r.r){ s.bullets.splice(j,1); s.rocks.splice(i,1); s.score+=10;
            if(r.r>20){ for(let k=0;k<s.P.split;k++){ s.rocks.push(makeRock(r.r*0.6, r.x, r.y)); } }
            break; }
      }
    }

    if(s.rocks.length===0){ // next wave increases difficulty gradually
      s.P.spawn += 1; s.P.rockSpeed *= 1.05; s.P.fireDelay = Math.max(90, s.P.fireDelay-5);
      populateRocks(); // repopulate with safe distance again
    }
    draw();
  }

  function draw(){
    g.clearRect(0,0,c.width,c.height); g.fillStyle='#060a12'; g.fillRect(0,0,c.width,c.height);
    // stars
    g.fillStyle='#113'; for(let i=0;i<80;i++){ g.fillRect((i*37)%c.width, (i*71)%c.height, 2, 2); }
    // ship
    g.save(); g.translate(s.ship.x,s.ship.y); g.rotate(s.ship.a);
    g.strokeStyle='#00e0ff'; g.lineWidth=2;
    g.beginPath(); g.moveTo(16,0); g.lineTo(-12,9); g.lineTo(-6,0); g.lineTo(-12,-9); g.closePath(); g.stroke();
    if(s.ship.thrust>0){ g.strokeStyle='#ff8c42'; g.beginPath(); g.moveTo(-12,0); g.lineTo(-22,0); g.stroke(); }
    g.restore();
    // bullets
    g.fillStyle='#ffd166'; s.bullets.forEach(b=>{g.fillRect(b.x-2,b.y-2,4,4)});
    // rocks
    g.strokeStyle='#8ab6ff'; s.rocks.forEach(r=>{ g.beginPath(); for(let i=0;i<8;i++){ const ang=(i/8)*Math.PI*2; const rr=r.r*(0.75+Math.sin(i*1.7+performance.now()/500)*0.08); const px=r.x+Math.cos(ang)*rr; const py=r.y+Math.sin(ang)*rr; if(i===0) g.moveTo(px,py); else g.lineTo(px,py);} g.closePath(); g.stroke(); });
    // HUD
    g.fillStyle='#cfe4ff'; g.font='16px ui-monospace'; g.fillText('Score: '+s.score, 14, 22);
  }

  function start(){
    cancelAnimationFrame(raf); overlay.classList.add('hidden'); running=false; reset();
    countdownOverlay(overlay,3).then(()=>{ running=true; loop(); });
  }
  function hardReset(){ cancelAnimationFrame(raf); overlay.classList.add('hidden'); running=false; reset(); }
  function gameOver(){ running=false; cancelAnimationFrame(raf); overlay.textContent='Ship down — Score '+s.score; overlay.classList.remove('hidden'); }
  window.addEventListener('keydown',e=>{ s&& (s.keys[e.code]=true); });
  window.addEventListener('keyup',e=>{ s&& (s.keys[e.code]=false); });
  startBtn.addEventListener('click',start);
  resetBtn.addEventListener('click',hardReset);
  diff.addEventListener('change',()=>{ /* apply on next Start */ });
  reset();
})();

// ---------- Memory Match ----------
(function memory(){
  const grid=document.getElementById('memoryGrid');
  const startBtn=document.getElementById('memStart');
  const resetBtn=document.getElementById('memReset');
  const diff=document.getElementById('memDiff');
  const movesEl=document.getElementById('memMoves');
  const timeEl=document.getElementById('memTime');
  let first=null, lock=false, moves=0, startTime=0, timer=null, matched=0, totalPairs=0, revealDelay=700, started=false;

  const EMOJI = ['🍒','🥦','🍌','🍎','🍇','🥕','🍍','🍓','🍆','🌽','🥑','🍑','🥬','🍅','🍉','🍊','🍐','🥝','🫐','🥔','🍈','🥥'];

  function layout(){
    const d=diff.value; let cols, rows;
    if(d==='normal'){cols=4; rows=4; revealDelay=900;}
    else if(d==='hard'){cols=6; rows=4; revealDelay=700;}
    else {cols=6; rows=6; revealDelay=450;}
    grid.style.gridTemplateColumns=`repeat(${cols}, 86px)`; grid.style.gridTemplateRows=`repeat(${rows}, 110px)`; return {cols,rows};
  }
  function generate(){
    grid.innerHTML=''; moves=0; matched=0; first=null; movesEl.textContent='Moves: 0'; timeEl.textContent='Time: 0.0s'; clearInterval(timer); started=true;
    const {cols,rows}=layout(); const N=(cols*rows)/2; totalPairs=N;
    const icons = EMOJI.slice(0,N);
    const deck=[...icons,...icons].sort(()=>Math.random()-0.5);
    deck.forEach(v=>{
      const card=document.createElement('div'); card.className='card'; card.dataset.val=v;
      card.innerHTML=`<div class="card-inner"><div class="card-face card-front">★</div><div class="card-face card-back"><span class="emoji">${v}</span></div></div>`;
      card.addEventListener('click',()=>onFlip(card)); grid.appendChild(card);
    });
    startTime=performance.now(); timer=setInterval(()=>{
      timeEl.textContent='Time: '+(((performance.now()-startTime)/1000).toFixed(1))+'s';
    },100);
  }
  function onFlip(card){
    if(!started || lock || card.classList.contains('flipped')) return; card.classList.add('flipped');
    if(!first){ first=card; return; }
    moves++; movesEl.textContent='Moves: '+moves;
    if(card.dataset.val===first.dataset.val){ matched++; first=null; if(matched===totalPairs){ clearInterval(timer); }}
    else { lock=true; setTimeout(()=>{ card.classList.remove('flipped'); first.classList.remove('flipped'); first=null; lock=false; }, revealDelay); }
  }
  function reset(){ clearInterval(timer); started=false; grid.innerHTML=''; movesEl.textContent='Moves: 0'; timeEl.textContent='Time: 0.0s'; }
  startBtn.addEventListener('click',generate);
  resetBtn.addEventListener('click',reset);
  diff.addEventListener('change',reset);
  reset();
})();

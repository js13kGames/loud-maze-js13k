const s = c.width = c.height = 512;
const ctx = c.getContext('2d');

const [ EMPTY, WALL, END,
        MENU, LOADING, PLAYING, FINISHED,
        CAN_MOVE, HIT_WALL, HIT_FINISH, NO_INTERACTION ] = Array(100).fill().map((_,i)=>i);

let highestLevel = +localStorage.highestLevel || 0;
let currentLevel = highestLevel;
let levelMap;
let levelSize;
let levelCellSize = 10;
let levelBaseX;
let levelBaseY;

let playerX;
let playerY;
let playerMoves, playerWallsHit, playerAlreadyHitWalls, playerBeginTime;

const genLevel = () => {

  levelSize = 2 * currentLevel + 5;
  levelCellSize = currentLevel < 10 ? 20 : (s - 40)/levelSize;

  levelBaseX =
  levelBaseY = s/2 - (levelSize-2) * levelCellSize / 2;
  
  let genStack = [[1,1]];
  let genStackTop = 1;
  let genChecked = ['1,1'];
  let genFarthest;

  // this just fills a 2D array with a single value
  levelMap = Array(levelSize).fill(() => Array(levelSize).fill(WALL)).map((generator) => generator());
  levelMap[1][1] = EMPTY;

  const genInterval = setInterval(() => {
    let done = false;
    let head = genStack[genStack.length - 1];

    for(let i = 0; i < 100; ++i) {
      const possibilities = [
        [-2, 0],
        [+2, 0],
        [0, -2],
        [0, +2]
      ]
        .filter((delta) => {
          const x = head[0] + delta[0];
          const y = head[1] + delta[1];

          return x >= 0 && y >= 0 &&
                 x < levelSize && y < levelSize &&
                 !genChecked.includes([x, y] + ''); 
        });

      if(possibilities.length > 0) {
        const next = possibilities[Math.random() * possibilities.length |0];
        const nx = head[0] + next[0];
        const ny = head[1] + next[1];

        levelMap[nx][ny] = 
        levelMap[head[0] + next[0]/2][head[1] + next[1]/2] = EMPTY;

        head = [nx, ny];
        genStack.push(head);
        genChecked.push(head + '');

        if(genStack.length > genStackTop) {
          genStackTop = genStack.length;
          genFarthest = head;
        }

      } else {
        if(genStack.length === 1) {
          done = true;
          break;
        }

        genStack.pop();
        head = genStack[genStack.length - 1];
      }
    }

    if(done) {
      clearInterval(genInterval);

      levelMap[1][1] = END;

      [ playerX, playerY ] = genFarthest;
      playerMoves = 0;
      playerWallsHit = 0;
      playerAlreadyHitWalls = [];
      playerBeginTime = new Date;

      setState(PLAYING);
    }
  },  16);
};

const [LEFT, UP, RIGHT, DOWN, NEXT, VOL_UP, VOL_DOWN, HELP] = Array(20).fill().map((_,i)=>i);
let keys = Array(5).fill(false);
let keyCodes = [
  [37, 65, 72],
  [38, 87, 75],
  [39, 68, 76],
  [40, 83, 74],
  [13, 32],
  [77],
  [78],
  [27]
];
const setKey = (e, value) => {
  for(let i = 0; i < keyCodes.length; ++i) {
    if(keyCodes[i].includes(e.keyCode)) {
      keys[i] = value;

      if(value) {
        if(i === VOL_UP) {
          masterGain.gain.value = Math.min(masterGain.gain.value / .9 + .01, 1);
        } else if(i === VOL_DOWN) {
          masterGain.gain.value = Math.max(masterGain.gain.value * .9 - .01, 0);
        }

        if(i === HELP && state !== HELP) {
          setState(HELP);
        }
      } else {
        if(i === HELP && state === HELP) {
          setState(prevState);
        }
      }

      return e.preventDefault();
    }
  }
}
window.addEventListener('keydown', (e) => setKey(e, true));
window.addEventListener('keyup', (e) => setKey(e, false));
const setKeyFromTouch = (e, value) => {
  const x = e.clientX - window.innerWidth / 2;
  const y = e.clientY - window.innerHeight / 2;

  let interacted = true;
  if(x**2 + y**2 < 50**2) {
    keys[NEXT] = value;

  } else if(x < y && x < -y) {
    keys[LEFT] = value;

  } else if(x > y && x < -y ) {
    keys[UP] = value;

  } else if(x > y && x > -y ) {
    keys[RIGHT] = value;

  } else if(x < y && x > -y) {
    keys[DOWN] = value;

  } else {
    interacted = false;
  }

  if(interacted) {
    e.preventDefault();
  }
}
window.addEventListener('mousedown', (e) => setKeyFromTouch(e, true));
window.addEventListener('mouseup', (e) => keys.fill(false));
window.addEventListener('touchstart', (e) => setKeyFromTouch(e.touches[0], true));
window.addEventListener('touchend', (e) => keys.fill(false));

const menuTitle = `
x            x
x  xxx x x xxx
x  x x x x x x
xx xxx xxx xxx
`.trim()
  .split('\n')
  .map((row) => 
    row.split('')
      .map((char) =>
        char === 'x')
  );

const titleCellSize = 20;
const titleBaseX = s/2 - (menuTitle[0].length - 2) * titleCellSize / 2;
const titleBaseY = s/4 - menuTitle.length * titleCellSize / 2;

const loadingSizeX = 20;
const loadingSizeY = 20;

const menuLevelTexts = [
  'you are welcome',
  'we understand',
  'there are answers',
  'some things begin',
  'coffee is almost ready',
  'you do you',
  'that\'s nice',
  'time to go'
];
const playingTexts = [
  [
    'I need to take my time. I don\'t know where I am.',
    'I can\'t see, but I can hear. It feels like a maze.',
    'Someone tipped me about arrow keys a bit back'
  ], [
    'Who knew? I have no clue where I am, but',
    'I am finding it oddly relaxing. I still need to',
    'concentrate. It\'s not as easy as it looks'
  ], [
    'It is slightly unsettling. I didn\'t even notice',
    'my arms are missing. It doesn\'t hurt. What was I',
    'doing before getting here? Who am I?'
  ], [
    'It is as if I was one with myself, finally. I don\'t',
    'feel hungry or thirsty. In fact, I don\'t need',
    'anything from life. Is this how you\'ve always been?'
  ], [
    'I can really push my limits in here. A simple goal,',
    'and it\'s on the top left. Looks like I always need',
    'to take the longest path. This might take a while'
  ], [
    'I\'m going to spend some time going through these.',
    '',
    'I hope you don\'t mind. There\'s no rush here.',
  ], [
    '',
    '...',
    ''
  ], [
    '',
    'I don\'t need answers anymore',
    ''
  ]
]
const finishedTexts = [
  'Am I watching myself?',
  'what is this even made of?',
  'What\'s around me?',
  'I like this place',
  'Am I alone?',
  'I don\'t even care',
  'What is anything anyway?',
  'I am no longer lost'
]

let menuTicksSinceLastInteraction = 0;
let menuTicks = 0;
const draw3dCell = (cellSize, offset, baseX, baseY, colorTop, colorBottom, colorLeft) => {
  const joinX = baseX - offset;
  const joinY = baseY - offset/2;

  ctx.fillStyle = colorTop;
  ctx.fillRect(joinX - cellSize, joinY - cellSize, cellSize, cellSize);

  ctx.fillStyle = colorBottom;
  ctx.beginPath();
  ctx.moveTo(joinX, joinY);
  ctx.lineTo(baseX, baseY);
  ctx.lineTo(baseX - cellSize, baseY);
  ctx.lineTo(joinX - cellSize, joinY);
  ctx.fill();

  ctx.fillStyle = colorLeft;
  ctx.beginPath();
  ctx.moveTo(joinX, joinY);
  ctx.lineTo(baseX, baseY);
  ctx.lineTo(baseX, baseY - cellSize);
  ctx.lineTo(joinX, joinY - cellSize);
  ctx.fill();
}
const printText = (fontSize, text, x, y, center) => {
  ctx.font = `${fontSize}px monospace`;
  ctx.fillText(text, x - (center ? ctx.measureText(text).width / 2 : 0 ), y);
}

let moveTicksSinceLastInteraction = 0;
const moveInDirection = (x, y) => {
  const nx = playerX + x*2;
  const ny = playerY + y*2;
  const hnx = playerX + x;
  const hny = playerY + y;
  ++playerMoves;

  switch(levelMap[hnx][hny]) {
    case WALL:
      const wallHash = [hnx, hny] + '';
      if(playerAlreadyHitWalls.includes(wallHash)) {
        ++playerWallsHit;
      } else {
        playerAlreadyHitWalls.push(wallHash);
      }
      return HIT_WALL;
  }

  switch(levelMap[nx][ny]) {
    case EMPTY:
      playerX = nx;
      playerY = ny;
      return CAN_MOVE;
    case END:
      return HIT_FINISH;
  }
}
const movePlayer = () => {
  ++moveTicksSinceLastInteraction;
  let result = NO_INTERACTION;

  if(moveTicksSinceLastInteraction > 10) {

    ctx.beginPath();
    ctx.moveTo(s/2, s/2);
    if(keys[LEFT]) {
      result = moveInDirection(-1,0);
      ctx.lineTo(0, 0);
      ctx.lineTo(0, s)
       

    } else if(keys[UP]) {
      result = moveInDirection(0,-1);
      ctx.lineTo(0, 0);
      ctx.lineTo(s, 0)

    } else if(keys[RIGHT]) {
      result = moveInDirection(+1,0);
      ctx.lineTo(s, 0);
      ctx.lineTo(s, s)

    } else if(keys[DOWN]) {
      result = moveInDirection(0,+1);
      ctx.lineTo(s, s);
      ctx.lineTo(0, s)
    }

    switch(result) {
      case NO_INTERACTION:
        break;
      case CAN_MOVE:
        moveTicksSinceLastInteraction = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#eee';
        ctx.fill();
				globalAlphaTick = 0;
        soundPlayMove();
        break;
      case HIT_WALL:
        moveTicksSinceLastInteraction = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#111';
        ctx.fill();
				globalAlphaTick = 0;
        soundPlayHit();
        break;
      case HIT_FINISH:
        moveTicksSinceLastInteraction = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#3e7';
        ctx.fill();
				globalAlphaTick = 0;
        soundPlayFinish();
        break;
    }
    
  }

  return result;
}

const actx = new AudioContext;
const masterGain = actx.createGain();
masterGain.connect(actx.destination);
const getOscGainAndTime = () => {
  const osc = actx.createOscillator();
  const gain = actx.createGain();

  osc.connect(gain);
  gain.connect(masterGain);

  return [ osc, gain, actx.currentTime ];
}
const soundPlayMove = () => {
  const [ osc, gain, time ] = getOscGainAndTime();

  osc.frequency.value = 440;
  osc.frequency.exponentialRampToValueAtTime(550, time + .3)
  osc.type = 'sine';
  gain.gain.setValueAtTime(.25, time);
  gain.gain.exponentialRampToValueAtTime(.5, time + .1);
  gain.gain.exponentialRampToValueAtTime(.001, time + .3);

  osc.start(time);
  osc.stop(time + .3);
}
const soundPlayHit = () => {
  const [ osc, gain, time ] = getOscGainAndTime();

  osc.frequency.value = 300;
  osc.frequency.exponentialRampToValueAtTime(200, time + .6)
  osc.type = 'sine';
  gain.gain.setValueAtTime(.5, time);
  gain.gain.exponentialRampToValueAtTime(1, time + .2);
  gain.gain.exponentialRampToValueAtTime(.001, time + .6);

  osc.start(time);
  osc.stop(time + .3);
}
const soundPlayFinish = () => {
  const [ osc, gain, time ] = getOscGainAndTime();

  osc.frequency.value = 440;
  osc.frequency.exponentialRampToValueAtTime(880, time + .3)
  osc.type = 'sine';
  gain.gain.setValueAtTime(.5, time);
  gain.gain.exponentialRampToValueAtTime(1, time + .2);
  gain.gain.exponentialRampToValueAtTime(.001, time + .6);

  osc.start(time);
  osc.stop(time + .6);
}

let globalAlphaTick;
let state;
let prevState;
const setState = (newState) => {
  prevState = state;
  state = newState;
  globalAlphaTick = 0;
}
const anim = () => {
  requestAnimationFrame(anim);
  
  switch(state) {
    case HELP:
      if(globalAlphaTick < 100) {
        ++globalAlphaTick;
        ctx.globalAlpha = globalAlphaTick / 100;
      }

      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, s, s);

      ctx.fillStyle = '#eee';
      printText(30, 'HELP', s/2, 60, true);

      printText(16, 'try and navigate the mazes by memory.', 10, 120);
      printText(16, 'aim for never re-hitting the same wall.', 10, 150);
      printText(16, 'skip past seeing the layout with space/enter.', 10, 180);

      printText(20, 'navigate around blind maze', s/2, 240, true);
      printText(16, 'awsd, hjkl, arrows or click/tap away from center', s/2, 270, true);

      printText(20, 'progress or choose level', s/2, 330, true);
      printText(16, 'space, enter, or click/tap around center', s/2, 350, true);

      printText(20, '- volume +', s/2, 410, true);
      printText(16, 'N and M', s/2, 440, true);
      break;
    case MENU:
      if(globalAlphaTick < 100) {
        ++globalAlphaTick;
        ctx.globalAlpha = globalAlphaTick / 100;
      }

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, s, s);

      ++menuTicks;
      ++menuTicksSinceLastInteraction;

      if(menuTicksSinceLastInteraction > 10) {

        let interacted = true;
        if(keys[NEXT] || keys[UP] || keys[DOWN]) {
          setState(LOADING);
          soundPlayFinish();
          genLevel();
        } else if(keys[LEFT]) {
          if(currentLevel > 0) {
            --currentLevel;
            soundPlayMove();
          } else {
            soundPlayHit();
          }
        } else if(keys[RIGHT]) {
          if(currentLevel < highestLevel) {
            ++currentLevel;
            soundPlayMove();
          } else {
            soundPlayHit();
          }
        } else {
          interacted = false;
        }

        if(interacted) {
          menuTicksSinceLastInteraction = 0;
        }
      }
      
      menuTitle.forEach((row, y) => row.forEach((cell, x) => {
        if(!cell) {
          return;
        }

        const offset = Math.sin((x + y)*4 + menuTicks/30) * titleCellSize/6 + titleCellSize/2;
        const baseX = titleBaseX + x * titleCellSize;
        const baseY = titleBaseY + y * titleCellSize;

        draw3dCell(titleCellSize, offset, baseX, baseY, '#eee', '#bbb', '#888');
      }));

      ctx.fillStyle = '#eee';
      printText(60, currentLevel, s/2, 265, true);
      printText(20, menuLevelTexts[currentLevel] || `enjoy level ${currentLevel}!`, s/2, 320, true);

      ctx.fillStyle = '#888';
      printText(16, '@MateiCopot', 235, 410);
      printText(16, '/towc.eu', 235, 440);
      printText(16, 'matei@copot.eu', 235, 380);

      ctx.fillStyle = '#89e';
      printText(16, 't', 180, 410);
      ctx.fillStyle = '#45a';
      printText(16, 'f', 180, 440);
      ctx.fillStyle = '#a45';
      printText(16, 'm', 180, 380);

      ctx.fillStyle = currentLevel > 0 ? '#aaa' : '#333';
      ctx.beginPath();
      ctx.moveTo(100, 243);
      ctx.lineTo(120, 223);
      ctx.lineTo(120, 263);
      ctx.fill();

      ctx.fillStyle = currentLevel < highestLevel ? '#aaa' : '#333';
      ctx.beginPath();
      ctx.moveTo(412, 243);
      ctx.lineTo(392, 223);
      ctx.lineTo(392, 263);
      ctx.fill();
    
      break;
    case LOADING:
      if(globalAlphaTick < 30) {
        ++globalAlphaTick;
        ctx.globalAlpha = globalAlphaTick / 30;
      }

      ctx.fillStyle = '#eee';
      ctx.fillRect(0, 0, s, s);

      ++menuTicks;
      
      levelMap.forEach((row, x) => row.forEach((cell, y) => {
        const offset = Math.sin((x + y) + menuTicks/10) * levelCellSize/6 + levelCellSize/2;
        const baseX = titleBaseX + x * levelCellSize;
        const baseY = titleBaseY + y * levelCellSize;

        draw3dCell(levelCellSize, offset, baseX, baseY, '#eee', '#bbb', '#888');
      }));
      break;
    case PLAYING:
      if(globalAlphaTick < 700) {
        ++globalAlphaTick;
        ctx.globalAlpha = globalAlphaTick / 700;
      }

      ctx.fillStyle = '#888';
      ctx.fillRect(0, 0, s, s);

      ctx.fillStyle = '#f22';
      let delta = new Date - playerBeginTime;
      printText(100, delta / 1000 |0, s/2, 200, true);
      printText(50, playerWallsHit, s/2, 320, true);

      ctx.fillStyle = '#333';
      printText(20, 'seconds', s/2, 230, true);
      printText(16, 'walls re-hit', s/2, 350, true)

      ctx.fillStyle = '#111';
      const playingText = playingTexts[currentLevel] || ['', '', ''];
      printText(16, playingText[0], s/2, 400, true);
      printText(16, playingText[1], s/2, 430, true);
      printText(16, playingText[2], s/2, 460, true);

      switch(movePlayer()) {
        case HIT_FINISH:
          if(currentLevel + 1 > highestLevel) {
            highestLevel = currentLevel + 1;
            localStorage.highestLevel = highestLevel;
          }
          setState(FINISHED);
          break;
      }

      ++menuTicksSinceLastInteraction;
      if(keys[NEXT] && menuTicksSinceLastInteraction > 10) {
        menuTicksSinceLastInteraction = 0;
        setState(MENU);
      }

      break;
    case FINISHED:
      if(globalAlphaTick < 30) {
        ++globalAlphaTick;
        ctx.globalAlpha = globalAlphaTick / 30;
      }

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, s, s);

      ++menuTicks;

      levelMap.forEach((row, x) => row.forEach((cell, y) => {
        switch(cell) {
          case EMPTY: {
            if(playerX === x && playerY === y) {
              const offset = Math.sin(menuTicks/30) * levelCellSize/6 + levelCellSize;
              const baseX = levelBaseX + x * levelCellSize;
              const baseY = levelBaseY + y * levelCellSize;
              draw3dCell(levelCellSize * 1/2, offset, baseX, baseY, '#e55', '#a33', '#822');
            }
          } break;
          case WALL: {
            const offset = Math.sin((x + y**2) + menuTicks/50) * levelCellSize/6 + levelCellSize/4;
            const baseX = levelBaseX + x * levelCellSize;
            const baseY = levelBaseY + y * levelCellSize;
            draw3dCell(levelCellSize, offset, baseX, baseY, '#eee', '#bbb', '#888');
          } break;
          case END: {
            const offset = Math.sin(menuTicks/30) * levelCellSize/6 + levelCellSize;
            const baseX = levelBaseX + x * levelCellSize;
            const baseY = levelBaseY + y * levelCellSize;
            draw3dCell(levelCellSize, offset, baseX, baseY, '#3e7', '#2b5', '#183');
          } break;
        }
      }));

      ctx.fillStyle = '#f22';
      printText(20, finishedTexts[currentLevel] || '', s/2, 460, true);

      switch(movePlayer()) {
        case CAN_MOVE:
        case HIT_WALL:
        case HIT_FINISH:
          setState(FINISHED);
      };

      if(keys[NEXT]) {
        menuTicksSinceLastInteraction = 0;
        ++currentLevel;
        setState(MENU);
      }
      break;

  }
}

setState(MENU);
anim();

const getMusicRound = () => {
  const seed = Math.random() * 12 |0;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  const time = actx.currentTime;
  const timeDelta = Math.random() * 4;

  osc.connect(gain);
  gain.connect(masterGain);

  osc.type = Math.random() < .2 ? 'square' : 'sine';
  osc.frequency.value = 220 * seed;
  osc.frequency.exponentialRampToValueAtTime(440 * seed + (Math.random() < .2 ? -220: 220), time + timeDelta/2)
  gain.gain.setValueAtTime(state === MENU ? .1 : .005, time);
  gain.gain.exponentialRampToValueAtTime(.0001, time + timeDelta);
  osc.start(time);
  osc.stop(time + timeDelta);
}
setInterval(getMusicRound, 200);

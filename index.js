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

const genLevel = () => {

  levelSize = 2 * currentLevel + 5;
  levelCellSize = 20;

  levelBaseX =
  levelBaseY = s/2 - levelSize * levelCellSize / 2;
  
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
      playerBeginTime = new Date;

      setState(PLAYING);
    }
  },  16);
};

const [LEFT, UP, RIGHT, DOWN, NEXT] = Array(5).fill().map((_,i)=>i);
let keys = Array(5).fill(false);
let keyCodes = [
  [37, 65, 72],
  [38, 87, 75],
  [39, 68, 76],
  [40, 83, 74],
  [13, 32]
];
const setKey = (e, value) => {
  for(let i = 0; i < keyCodes.length; ++i) {
    if(keyCodes[i].includes(e.keyCode)) {
      keys[i] = value;
      return e.preventDefault();
    }
  }
}
window.addEventListener('keydown', (e) => setKey(e, true));
window.addEventListener('keyup', (e) => setKey(e, false));

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

const titleCellSize = 10;
const titleBaseX = s/2 - menuTitle[0].length * titleCellSize / 2;
const titleBaseY = s/2 - menuTitle.length * titleCellSize / 2;

const loadingSizeX = 20;
const loadingSizeY = 20;

const menuLevelTexts = [
  'just turn around',
  'simply more turns',
  'the goal is always on the top left',
  'the path is always the longest one',
  'isn\'t it somewhat peaceful?',
  'feel the maze'
];

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

let moveTicksSinceLastInteraction = 0;
const moveInDirection = (x, y) => {
  const nx = playerX + x*2;
  const ny = playerY + y*2;

  switch(levelMap[playerX + x][playerY + y]) {
    case WALL:
      return HIT_WALL;
  }

  switch(levelMap[nx][ny]) {
    case EMPTY:
      playerX = nx;
      playerY = ny;
      return CAN_MOVE;
    case WALL:
      return HIT_WALL;
    case END:
      return HIT_FINISH;
  }
}
const movePlayer = () => {
  ++moveTicksSinceLastInteraction;
  let result = NO_INTERACTION;

  if(moveTicksSinceLastInteraction > 10) {

    if(keys[LEFT]) {
      result = moveInDirection(-1,0);

    } else if(keys[UP]) {
      result = moveInDirection(0,-1);

    } else if(keys[RIGHT]) {
      result = moveInDirection(+1,0);

    } else if(keys[DOWN]) {
      result = moveInDirection(0,+1);
    }

    switch(result) {
      case NO_INTERACTION:
        break;
      case CAN_MOVE:
        moveTicksSinceLastInteraction = 0;
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, 0, s, s);
        soundPlayMove();
        break;
      case HIT_WALL:
        moveTicksSinceLastInteraction = 0;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, s, s);
        soundPlayHit();
        break;
      case HIT_FINISH:
        moveTicksSinceLastInteraction = 0;
        ctx.fillStyle = '#3e7';
        ctx.fillRect(0, 0, s, s);
        soundPlayFinish();
        break;
    }
    
  }

  return result;
}

const actx = new AudioContext;
const getOscGainAndTime = () => {
  const osc = actx.createOscillator();
  const gain = actx.createGain();

  osc.connect(gain);
  gain.connect(actx.destination);

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

  osc.frequency.value = 550;
  osc.frequency.exponentialRampToValueAtTime(440, time + .3)
  osc.type = 'triangle';
  gain.gain.setValueAtTime(.5, time);
  gain.gain.exponentialRampToValueAtTime(1, time + .1);
  gain.gain.exponentialRampToValueAtTime(.001, time + .3);

  osc.start(time);
  osc.stop(time + .3);
}
const soundPlayFinish = () => {
  const [ osc, gain, time ] = getOscGainAndTime();

  osc.frequency.value = 4400;
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
const setState = (newState) => {
  state = newState;
  globalAlphaTick = 0;
}
const anim = () => {
  requestAnimationFrame(anim);
  
  if(globalAlphaTick < 100) {
    ++globalAlphaTick;
    ctx.globalAlpha = globalAlphaTick / 100;
  }

  switch(state) {
    case MENU:
      ctx.fillStyle = 'rgba(16,16,16,.1)';
      ctx.fillRect(0,0,s,s);

      ++menuTicks;
      ++menuTicksSinceLastInteraction;

      if(keys[NEXT] && menuTicksSinceLastInteraction > 10) {
        menuTicksSinceLastInteraction = 0;
        setState(LOADING);
        genLevel();
        return;
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
      break;
    case LOADING:
      ctx.fillStyle = 'rgba(239,239,239,.2)';
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
      ctx.fillStyle = 'rgba(127,127,127,.2)';
      ctx.fillRect(0, 0, s, s);

      switch(movePlayer()) {
        case HIT_FINISH:
          setState(FINISHED);
          break;
      }

      break;
    case FINISHED:
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
      }))

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

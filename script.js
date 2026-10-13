/* =========================
   游戏状态
========================= */

const savedState = JSON.parse(
  localStorage.getItem("namelessWeddingSave")
);

const gameState = savedState || {
  currentScene: "hall",

  clues: [],

  unlockedScenes: ["hall"],

  soundEnabled: true
};

if (!gameState.inventory) {
  gameState.inventory = [];
}

if (!gameState.solvedDolls) {
  gameState.solvedDolls = [];
}
if (!gameState.usedItems) {
  gameState.usedItems = [];
}
if (!gameState.collectedRewards) {
  gameState.collectedRewards = [];
}
if (!gameState.bedroomProgress) {
  gameState.bedroomProgress = {
    scissorsCollected: false,
    diaryCollected: false,
    dressCut: false,
    keyCollected: false
  };
}
const hasBedroomKey =
  gameState.bedroomProgress.keyCollected ||
  gameState.inventory.includes("key");

if (
  hasBedroomKey &&
  !gameState.unlockedScenes.includes("workshop")
) {
  gameState.unlockedScenes.push("workshop");
}
if (!gameState.workshopProgress) {
  gameState.workshopProgress = {
    ledgerFound: false,
    ledgerRevealed: false,
    cabinetOpened: false,
    contractBottomCollected: false,
    photoFragmentCollected: false
  };
}
if (!gameState.corridorProgress) {
  gameState.corridorProgress = {
    mirrorRevealed: false,
    narrativePlayed: false,
    ending: null
  };
}
const savedMarriageTop =
  gameState.clues.some(function (clue) {
    return clue.id === "marriage-top";
  });

if (savedMarriageTop) {
  if (
    !gameState.inventory.includes(
      "marriage-top"
    )
  ) {
    gameState.inventory.push(
      "marriage-top"
    );
  }

  gameState.clues =
    gameState.clues.filter(function (clue) {
      return clue.id !== "marriage-top";
    });
}
const savedMarriageBottom =
  gameState.clues.some(function (clue) {
    return clue.id === "marriage-bottom";
  });

if (savedMarriageBottom) {
  if (
    !gameState.inventory.includes(
      "marriage-bottom"
    )
  ) {
    gameState.inventory.push(
      "marriage-bottom"
    );
  }

  gameState.clues =
    gameState.clues.filter(function (clue) {
      return clue.id !== "marriage-bottom";
    });
}
let selectedItemId = null;


/* =========================
   音频系统 (Audio & SFX System)
========================= */

const bgmAudio = new Audio();
bgmAudio.loop = true;
let currentBgmPath = "";

const bgmTracks = {
  start: "audio/Opening&LivingRoom.mp3",
  hall: "audio/Opening&LivingRoom.mp3",
  wedding: "audio/FourPeople.mp3",
  bedroom: "audio/BrideRoom.mp3",
  workshop: "audio/PaperDoll.mp3",
  corridor: "audio/Corridor.mp3"
};

// 场景背景音乐播放控制
function playSceneBgm(sceneKey) {
  const targetTrack = bgmTracks[sceneKey];
  if (!targetTrack) return;

  if (currentBgmPath !== targetTrack) {
    currentBgmPath = targetTrack;
    bgmAudio.src = targetTrack;
    bgmAudio.load();
  }

  bgmAudio.muted = !gameState.soundEnabled;

  if (gameState.soundEnabled) {
    bgmAudio.play().catch(function (err) {
      console.log("等待用户交互以触发自动播放:", err);
    });
  }
}

// 1. 页面一加载立刻尝试播放开场背景音乐 Opening&LivingRoom.mp3
playSceneBgm("start");

// 2. 解决浏览器自动播放限制：捕获全页面的任意点击/按键动作，瞬间启动音频
function startInitialAudio() {
  if (gameState.soundEnabled) {
    if (bgmAudio.paused || !currentBgmPath) {
      playSceneBgm("start");
    }
  }
  // 触发一次后移除监听器
  document.removeEventListener("click", startInitialAudio);
  document.removeEventListener("keydown", startInitialAudio);
  document.removeEventListener("touchstart", startInitialAudio);
}

document.addEventListener("click", startInitialAudio);
document.addEventListener("keydown", startInitialAudio);
document.addEventListener("touchstart", startInitialAudio);


// 独立音效播放器（包含音量调节与限时播放功能）
function playSfx(sfxPath, loop = false, maxDurationSeconds = null, volume = 1.0) {
  if (!gameState.soundEnabled) return null;
  const sfx = new Audio(sfxPath);
  sfx.loop = loop;
  sfx.volume = Math.min(Math.max(volume, 0.0), 1.0);
  
  sfx.play().catch(function (err) {
    console.log("SFX play error:", err);
  });

  if (maxDurationSeconds) {
    setTimeout(function () {
      if (!sfx.paused) {
        sfx.pause();
        sfx.currentTime = 0;
      }
    }, maxDurationSeconds * 1000);
  }

  return sfx;
}

// 广播及长语音控制器
let radioAudioObj = null;
let radioNarrativeObj = null;

function playRadioEffects() {
  stopRadioEffects();
  if (!gameState.soundEnabled) return;
  radioAudioObj = playSfx("audio/Radio.mp3", true);
  radioNarrativeObj = playSfx("audio/Radionarrative.mp3", false);
}

function stopRadioEffects() {
  if (radioAudioObj) {
    radioAudioObj.pause();
    radioAudioObj = null;
  }
  if (radioNarrativeObj) {
    radioNarrativeObj.pause();
    radioNarrativeObj = null;
  }
}

// 播放开场背景音乐
playSceneBgm("start");

// 处理浏览器自动播放限制
document.addEventListener("click", function unlockAudio() {
  if (gameState.soundEnabled && bgmAudio.paused && currentBgmPath) {
    bgmAudio.play().catch(function () {});
  }
}, { once: true });


/* =========================
   线索计数器 (Clue Counter UI)
========================= */

function updateClueCounter() {
  const counterElement = document.querySelector("#clue-counter");
  if (!counterElement) return;

  let remaining = 0;

  switch (gameState.currentScene) {
    case "hall": {
      const required = ["radio", "photo", "invitation"];
      const found = required.filter(function (id) {
        return gameState.clues.some(function (clue) {
          return clue.id === id;
        });
      }).length;
      remaining = Math.max(0, required.length - found);
      break;
    }

    case "wedding": {
      remaining = Math.max(0, 4 - gameState.solvedDolls.length);
      break;
    }

    case "bedroom": {
      const hasDiary = gameState.clues.some(function (c) { return c.id === "diary"; });
      const hasKey = gameState.bedroomProgress.keyCollected || gameState.inventory.includes("key");
      let count = 0;
      if (!hasDiary) count++;
      if (!hasKey) count++;
      remaining = count;
      break;
    }

    case "workshop": {
      let count = 0;
      if (!gameState.workshopProgress.ledgerRevealed) count++;
      if (!gameState.workshopProgress.contractBottomCollected) count++;
      if (!gameState.workshopProgress.photoFragmentCollected) count++;
      remaining = count;
      break;
    }

    case "corridor": {
      remaining = gameState.corridorProgress.mirrorRevealed ? 0 : 1;
      break;
    }

    default:
      remaining = 0;
  }

  counterElement.textContent = "剩余线索: " + remaining;
}


/* =========================
   场景一透明道具数据
========================= */

const hallProps = [
  {
    id: "radio",
    name: "旧收音机",
    image: "images/hall/radio.png",

    left: "2%",
    top: "36%",
    width: "25%",

    clueTitle: "失灵的收音机",

    description:
      "收音机没有接通电源，却不断传出断断续续的杂音。\n\n" +
      "一个模糊的声音重复说道：\n" +
      "“把婚礼完成……她就能离开……”"
  },
  

  {
    id: "photo",
    name: "残缺喜照",
    image: "images/hall/photo-front.png",

    left: "66%",
    top: "20%",
    width: "9%",

    clueTitle: "残缺喜照",

    description:
      "一张严重破损的旧式结婚照片。\n\n" +
      "新娘的面部被黑色划痕覆盖，新郎脸上贴着一张符纸。照片的一角已经缺失。"
  },

  {
    id: "invitation",
    name: "无名喜帖",
    image: "images/hall/invitation-front.png",

    left: "41%",
    top: "55%",
    width: "9%",

    clueTitle: "无名喜帖",

    description:
      "喜帖已经褪色，上面没有写新娘的姓名。\n\n" +
      "封面上的红线似乎被人重新缠绕过。"
  }
];
const bedroomProps = [
  {
    id: "wedding-dress",
    name: "血红嫁衣",
    image: "images/bedroom/wedding-dress.png",
    left: "58%",
top: "13%",
width: "19%",
    description:
      "一件悬挂在木架上的旧嫁衣。衣襟被红线紧紧缝住，里面似乎藏着什么。"
  },

  {
    id: "sewing-box",
    name: "上锁的绣盒",
    image: "images/bedroom/sewing-box.png",
    left: "2%",
top: "45%",
width: "14%",
    description:
      "梳妆台上放着一个旧绣盒。盒盖被红线缠住，现在无法打开。"
  },

  {
    id: "scissors",
    name: "生锈剪刀",
    image: "images/bedroom/scissors.png",
    left: "24%",
top: "55%",
width: "9%",
    description:
      "一把生锈的旧剪刀，刀刃上残留着暗红色痕迹。"
  },

  {
    id: "diary",
    name: "新娘日记",
    image: "images/bedroom/diary.png",
    left: "30%",
top: "20%",
width: "14%",
    description:
      "一本被藏在梳妆台旁的旧日记，里面记录着新娘真正的身份。"
  }
];
const bedroomKey = {
  id: "key",
  name: "旧铜钥匙",
  image: "images/bedroom/key.png",
  description:
    "一把藏在绣盒里的旧铜钥匙，钥匙齿上还缠着一小段褪色红线。"
};
const workshopItems = {
  ledger: {
    id: "ledger",
    name: "旧账册",
    image: "images/workshop/ledger.png",
    left: "18%",
    top: "55%",
    width: "13%",
    description:
      "一本沾满纸灰的旧账册。部分记录已经褪色，普通光线下无法看清。"
  },

  contractBottom: {
    id: "marriage-bottom",
    name: "婚契下半部分",
    image: "images/workshop/marriage-bottom.png",
    description:
      "从旧柜子里找到的婚契下半部分，可以与喜堂中的上半部分拼合。"
  },

  photoFragment: {
    id: "photo-fragment",
    name: "喜照碎片",
    image: "images/workshop/photo-fragment.png",
    description:
      "一块从旧柜子中找到的喜照碎片，上面残留着被撕去的人脸轮廓。"
  }
};
/* =========================
   场景二纸人数据
========================= */

const paperDolls = [
  {
    id: "paper-doll-1",
    name: "纸人一",
    image: "images/wedding/paper-doll-1.png",

  left: "28.5%",
    top: "39%",
    width: "9%",

    correctItem: "lantern",

    description:
      "纸人的双手空空，袖口画着一圈模糊的火焰纹样。"
  },

  {
    id: "paper-doll-2",
    name: "纸人二",
    image: "images/wedding/paper-doll-2.png",

     left: "39%",
    top: "39%",
    width: "9%",

    correctItem: "cup",

    description:
      "纸人胸前留着暗色水渍，像是曾经被酒水浸湿过。"
  },

  {
    id: "paper-doll-3",
    name: "纸人三",
    image: "images/wedding/paper-doll-3.png",

  left: "50%",
    top: "39%",
    width: "9%",

    correctItem: "comb",

    description:
      "纸人的衣领旁画着几缕细长黑线，看起来像散落的头发。"
  },

  {
    id: "paper-doll-4",
    name: "纸人四",
    image: "images/wedding/paper-doll-4.png",

     left: "60%",
    top: "39%",
    width: "9%",

    correctItem: "small-mirror",

    description:
      "纸人胸口画着一个残缺的圆形，表面泛着暗淡的银光。"
  }
];

/* =========================
   场景二供品数据
========================= */

const offeringItems = [
  {
    id: "lantern",
    name: "旧纸灯笼",
    image: "images/wedding/lantern.png",

    left: "23%",
    top: "57%",
    width: "6%",

    description:
      "一盏褪色的纸灯笼，内部仍然残留着微弱的光。"
  },

  {
    id: "cup",
    name: "旧酒杯",
    image: "images/wedding/cup.png",

    left: "39%",
    top: "59%",
    width: "4%",

    description:
      "一只旧酒杯，杯底残留着已经干涸的暗红色液体。"
  },

  {
    id: "comb",
    name: "断齿木梳",
    image: "images/wedding/comb.png",

    left: "54%",
    top: "60%",
    width: "6%",

    description:
      "木梳缺了几根梳齿，缝隙中缠着几根黑色长发。"
  },

  {
    id: "small-mirror",
    name: "浑浊小铜镜",
    image: "images/wedding/small-mirror.png",

    left: "70%",
    top: "56%",
    width: "5%",

    description:
      "镜面已经变得浑浊，里面隐约映出一个模糊的人影。"
  }
];

const candleItem = {
  id: "candle",
  name: "熄灭的喜烛",
  image: "images/wedding/candle.png",

  description:
    "一根从暗格中找到的旧喜烛。烛芯已经熄灭，却仍然带着一点余温。"
};

const marriageTopItem = {
  id: "marriage-top",
  name: "婚契上半部分",
  image: "images/wedding/marriage-top.png",
  description:
    "一张从中间撕断的旧婚契。需要找到下半部分，才能看清完整内容。"
};
const allInventoryItems = [
  ...offeringItems,
  candleItem,
  bedroomKey,
  marriageTopItem,
  workshopItems.contractBottom,

  bedroomProps.find(function (prop) {
    return prop.id === "scissors";
  })
];
/* =========================
   页面元素
========================= */

const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const game = document.querySelector("#game");

const propLayer = document.querySelector("#prop-layer");
const inventoryList =
  document.querySelector("#inventory-list");
const sceneBackground =
  document.querySelector("#scene-background");
  const sceneTitle = document.querySelector("#scene-title");
const messageText = document.querySelector("#message-text");

const mapButton = document.querySelector("#map-button");
const clueButton = document.querySelector("#clue-button");
const soundButton = document.querySelector("#sound-button");
const resetButton = document.querySelector("#reset-button");

const mapPanel = document.querySelector("#map-panel");
const cluePanel = document.querySelector("#clue-panel");

const locationList = document.querySelector("#location-list");
const clueList = document.querySelector("#clue-list");

const itemModal = document.querySelector("#item-modal");
const modalImage = document.querySelector("#modal-image");
const modalTitle = document.querySelector("#modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalActions = document.querySelector("#modal-actions");


/* =========================
   保存进度
========================= */

function saveGame() {
  localStorage.setItem(
    "namelessWeddingSave",
    JSON.stringify(gameState)
  );
}

/* =========================
   场景解锁检查
========================= */

function checkWorkshopUnlock() {
  const hasBedroomKey =
    gameState.bedroomProgress.keyCollected ||
    gameState.inventory.includes("key");

  if (
    hasBedroomKey &&
    !gameState.unlockedScenes.includes("workshop")
  ) {
    gameState.unlockedScenes.push("workshop");
  }
}
/* =========================
   进入游戏
========================= */

startButton.addEventListener("click", function () {
  startScreen.classList.add("hidden");
  game.classList.remove("hidden");

  playSceneBgm("hall");
  renderHall();
  renderCluePanel();
  renderMap();
  updateSoundButton();
  renderInventory();
  checkWorkshopUnlock();
  checkWeddingRewards();
  checkMarriageContractReady();
  checkPhotoRepairReady();
});


/* =========================
   显示场景一
========================= */

function renderHall() {
  gameState.currentScene = "hall";
  playSceneBgm("hall");

  sceneBackground.src = "images/hall/screen1.jpg";
  sceneBackground.alt = "宅院门厅";

  sceneTitle.textContent = "宅院门厅";

  messageText.textContent =
    "院门在身后关上了。柜台上的收音机突然传来杂音。";

  propLayer.innerHTML = "";

  hallProps.forEach(function (propData) {
    createSceneProp(propData);
  });

  saveGame();
  renderMap();
  checkHallCompletion();
  updateClueCounter();
}
function renderWeddingHall() {
  gameState.currentScene = "wedding";
  playSceneBgm("wedding");

  sceneBackground.src = "images/wedding/screen2.jpg";
  sceneBackground.alt = "无人喜堂";

  sceneTitle.textContent = "无人喜堂";

  messageText.textContent =
    "四个纸人双手空空，桌面散落着几件婚礼用品。";

  propLayer.innerHTML = "";

  paperDolls.forEach(function (dollData) {
  createPaperDoll(dollData);

  const isSolved =
    gameState.solvedDolls.includes(dollData.id);

  if (isSolved) {
    createPlacedOffering(dollData);
  }
});

  offeringItems.forEach(function (itemData) {
    const alreadyCollected =
  gameState.inventory.includes(itemData.id);

const alreadyUsed =
  gameState.usedItems.includes(itemData.id);

if (!alreadyCollected && !alreadyUsed) {
  createOfferingItem(itemData);
}
  });
  if (
  gameState.solvedDolls.length ===
  paperDolls.length
) {
  createWeddingRewards();
}

  renderInventory();
  saveGame();
  renderMap();
  checkWeddingRewards();
  updateClueCounter();
}
function renderBedroom() {
  gameState.currentScene = "bedroom";
  playSceneBgm("bedroom");

  sceneBackground.src =
    "images/bedroom/screen3.jpg";

  sceneBackground.alt = "新娘绣房";
  sceneTitle.textContent = "新娘绣房";

  messageText.textContent =
    "绣房里没有人，架上的嫁衣却像刚刚被人穿过。";

  propLayer.innerHTML = "";

 bedroomProps.forEach(function (propData) {
  const scissorsCollected =
    propData.id === "scissors" &&
    gameState.bedroomProgress.scissorsCollected;

  const diaryCollected =
    propData.id === "diary" &&
    gameState.bedroomProgress.diaryCollected;

  if (!scissorsCollected && !diaryCollected) {
    createBedroomProp(propData);
  }
});

  renderInventory();
  saveGame();
  renderMap();
  checkBedroomCompletion();
  updateClueCounter();
}
function renderWorkshop() {
  gameState.currentScene = "workshop";
  playSceneBgm("workshop");

  sceneBackground.src =
    "images/workshop/screen4.jpg";

  sceneBackground.alt = "后院纸扎铺";
  sceneTitle.textContent = "后院纸扎铺";

  messageText.textContent =
    "纸扎铺里堆满了未完成的纸人。一只上锁的旧柜子藏在工作台后面。";

  propLayer.innerHTML = "";
createWorkshopLedger();

if (gameState.workshopProgress.cabinetOpened) {
  createWorkshopCabinetRewards();
} else {
  createWorkshopCabinetHotspot();
}
 renderInventory();
checkWorkshopCompletion();
saveGame();
renderMap();
updateClueCounter();
}
function checkWorkshopCompletion() {
  const progress = gameState.workshopProgress;

  const workshopComplete =
    progress.ledgerRevealed &&
    progress.contractBottomCollected &&
    progress.photoFragmentCollected;

  if (!workshopComplete) {
    return;
  }

  if (
    !gameState.unlockedScenes.includes("corridor")
  ) {
    gameState.unlockedScenes.push("corridor");
  }

  messageText.textContent =
    "纸扎铺的线索已经找齐，通往回门长廊的门打开了。";

  if (!document.querySelector("#workshop-continue-btn")) {
    const continueBtn = document.createElement("button");
    continueBtn.id = "workshop-continue-btn";
    continueBtn.type = "button";
    continueBtn.className = "continue-button";
    continueBtn.textContent = "继续探索";

    continueBtn.style.left = "45%";
    continueBtn.style.top = "50%";

    continueBtn.addEventListener("click", function () {
      renderCorridor();
    });

    propLayer.appendChild(continueBtn);
  }
}

function renderCorridor() {
  gameState.currentScene = "corridor";
  playSceneBgm("corridor");

  sceneBackground.src =
    "images/corridor/screen5.jpg";

  sceneBackground.alt = "回门长廊";
  sceneTitle.textContent = "回门长廊";

  messageText.textContent =
    "白灯照着没有尽头的长廊，尽头的红门紧紧关闭。";

  propLayer.innerHTML = "";
  createCorridorMirror();
  createCorridorDoor();
  renderInventory();
  saveGame();
  renderMap();
  updateClueCounter();
}
function createCorridorMirror() {
  const mirror = document.createElement("img");

  mirror.src =
    "images/corridor/bronze-mirror.png";

  mirror.alt = "长廊铜镜";
  mirror.title = "长廊铜镜";

  mirror.classList.add(
    "scene-prop",
    "corridor-prop"
  );

  mirror.style.left = "6%";
mirror.style.top = "12%";
mirror.style.width = "14%";

  mirror.addEventListener("click", function () {
    inspectCorridorMirror();
  });

  propLayer.appendChild(mirror);
}

function createCorridorDoor() {
  const door = document.createElement("img");

  door.src =
    "images/corridor/red-door.png";

  door.alt = "红色木门";
  door.title = "红色木门";

  door.classList.add(
    "scene-prop",
    "corridor-prop"
  );

  door.style.left = "41%";
  door.style.top = "20%";
  door.style.width = "20%";

door.addEventListener("click", function () {
  inspectCorridorDoor();
});

propLayer.appendChild(door);
}

function inspectCorridorMirror() {
  gameState.corridorProgress.mirrorRevealed = true;

  // 播放 BrideNarrative.mp3（设为最大音量 1.0）
  if (!gameState.corridorProgress.narrativePlayed) {
    gameState.corridorProgress.narrativePlayed = true;
    playSfx("audio/Bridenarrative.mp3", false, null, 1.0);
  }

  saveGame();
  updateClueCounter();

  openModal({
    title: "长廊铜镜",
    image: "images/corridor/bronze-mirror.png",
    description:
      "镜面逐渐浮现出一名没有面孔的新娘。她抬起手，在镜中写下：把名字还给我。",
    actions: [
      {
        label: "记住真相",
        action: closeItemModal
      }
    ]
  });
}

function inspectCorridorDoor() {
  if (!gameState.corridorProgress.mirrorRevealed) {
    openModal({
      title: "紧闭的红门",
      image: "images/corridor/red-door.png",
      description:
        "红门被一股看不见的力量封住。长廊里的铜镜似乎正在注视着你。",
      actions: [
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  if (
    gameState.corridorProgress.ending === "truth"
  ) {
    showTruthEnding();
    return;
  }

  if (
    gameState.corridorProgress.ending === "substitute"
  ) {
    showSubstituteEnding();
    return;
  }

  openModal({
    title: "最后的选择",
    image: "images/corridor/red-door.png",
    description:
      "红门上的封印已经松动。你必须决定如何结束这场无名婚礼。",
    actions: [
      {
        label: "归还新娘姓名",
        action: attemptTruthEnding
      },
      {
        label: "按照收音机完成婚礼",
        action: showSubstituteEnding
      },
      {
        label: "再想想",
        action: closeItemModal
      }
    ]
  });
}

function attemptTruthEnding() {
 const requiredClues = [
  "diary",
  "ledger",
  "marriage-contract",
  "repaired-photo"
];

  const hasAllClues =
    requiredClues.every(function (clueId) {
      return gameState.clues.some(function (clue) {
        return clue.id === clueId;
      });
    });

  const redThreadCut =
    gameState.bedroomProgress.dressCut;

  if (!hasAllClues || !redThreadCut) {
    openModal({
      title: "真相仍有缺失",
      image:
        "images/corridor/bronze-mirror.png",
      description:
        "你想归还她的姓名，却无法证明她真正的身份。也许还有日记或其他线索没有找到。",
      actions: [
        {
          label: "继续调查",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  showTruthEnding();
}

function showTruthEnding() {
  gameState.corridorProgress.ending = "truth";
  // 结局 A 播放 HappyEnding.mp3（大音量 1.0）
  playSfx("audio/HappyEnding.mp3", false, null, 1.0);

  saveGame();

  openModal({
    title: "结局 A：还名",
    image:
      "images/corridor/bronze-mirror.png",
    description:
      "你将日记、婚契和账册中的记录拼在一起，念出了新娘真正的名字。\n\n嫁衣上的红线彻底断裂，镜中的新娘终于露出完整的面容。红门缓缓打开，她没有回头，只留下一句：“这一次，我终于不是谁的替身。”",
    actions: [
      {
        label: "重新调查",
        action: restartInvestigation
      }
    ]
  });
}

function showSubstituteEnding() {
  gameState.corridorProgress.ending =
    "substitute";
  playSfx("audio/BadEnding.mp3");

  saveGame();

  openModal({
    title: "结局 B：替嫁",
    image: "images/corridor/red-door.png",
    description:
      "你相信了收音机中的声音，按照婚契完成了最后的仪式。\n\n红门打开后，门外却不是出口。镜中出现了你的身影，而原来的新娘已经消失。婚契上的空白处，慢慢写出了你的名字。",
    actions: [
      {
        label: "重新调查",
        action: restartInvestigation
      }
    ]
  });
}

function restartInvestigation() {
  localStorage.removeItem(
    "namelessWeddingSave"
  );

  window.location.reload();
}

function createBedroomProp(propData) {
  const prop = document.createElement("img");

  prop.src = propData.image;
  prop.alt = propData.name;
  prop.title = propData.name;

  prop.classList.add(
    "scene-prop",
    "bedroom-prop"
  );

  prop.style.left = propData.left;
  prop.style.top = propData.top;
  prop.style.width = propData.width;

  prop.dataset.propId = propData.id;

  prop.addEventListener("click", function () {
    inspectBedroomProp(propData);
  });

  propLayer.appendChild(prop);
}
  function inspectBedroomProp(propData) {
  // 剪刀
  if (propData.id === "scissors") {
    openModal({
      title: propData.name,
      image: propData.image,
      description: propData.description,
      actions: [
        {
          label: "拾取",
          action: function () {
            collectBedroomScissors(propData);
          }
        },
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  // 日记
  if (propData.id === "diary") {
    playSfx("audio/PageTurn.mp3");
    openModal({
      title: propData.name,
      image: propData.image,
      description:
        propData.description +
        "\n\n日记里写着：“他们需要的不是新娘，只是一个替身。”",
      actions: [
        {
          label: "收下线索",
          action: function () {
            collectBedroomDiary(propData);
          }
        },
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  // 嫁衣
  if (propData.id === "wedding-dress") {
    if (gameState.bedroomProgress.dressCut) {
      openModal({
        title: "被剪开的嫁衣",
        image: propData.image,
        description:
          "嫁衣上的红线已经被剪断。衣襟内侧绣着一句话：“名字归还，亡者方休。”",
        actions: [
          {
            label: "收起",
            action: closeItemModal
          }
        ]
      });

      return;
    }

    if (selectedItemId !== "scissors") {
      openModal({
        title: propData.name,
        image: propData.image,
        description:
          propData.description +
          "\n\n这些红线非常坚韧，也许需要先从道具栏选择剪刀。",
        actions: [
          {
            label: "收起",
            action: closeItemModal
          }
        ]
      });

      return;
    }

    openModal({
      title: propData.name,
      image: propData.image,
      description:
        "你将剪刀伸向嫁衣。红线微微颤动，像是有生命一样。",
      actions: [
        {
          label: "剪断红线",
          action: function () {
            playSfx("audio/Scissor.mp3", false, 7);
            cutWeddingDress();
          }
        },
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  // 绣盒
  if (propData.id === "sewing-box") {
    if (!gameState.bedroomProgress.dressCut) {
      openModal({
        title: propData.name,
        image: propData.image,
        description:
          "绣盒被红线紧紧缠住，现在还无法打开。",
        actions: [
          {
            label: "收起",
            action: closeItemModal
          }
        ]
      });

      return;
    }

    if (gameState.bedroomProgress.keyCollected) {
      openModal({
        title: "空绣盒",
        image: propData.image,
        description:
          "绣盒已经被打开，里面什么都没有了。",
        actions: [
          {
            label: "收起",
            action: closeItemModal
          }
        ]
      });

      return;
    }

    openModal({
      title: propData.name,
      image: propData.image,
      description:
        "红线已经断开。轻轻掀开盒盖，里面藏着一把旧铜钥匙。",
      actions: [
        {
          label: "拿走钥匙",
          action: collectBedroomKey
        },
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }
}
function collectBedroomScissors(propData) {
  gameState.bedroomProgress.scissorsCollected = true;

  if (!gameState.inventory.includes(propData.id)) {
    gameState.inventory.push(propData.id);
  }

  selectedItemId = propData.id;

  messageText.textContent =
    "获得道具：" + propData.name;

  saveGame();
  closeItemModal();
  renderInventory();
  renderBedroom();
  updateClueCounter();
}
function collectBedroomDiary(propData) {
  gameState.bedroomProgress.diaryCollected = true;

  const alreadyInClues =
    gameState.clues.some(function (clue) {
      return clue.id === propData.id;
    });

  if (!alreadyInClues) {
    gameState.clues.push({
      id: propData.id,
      name: propData.name,
      image: propData.image,
      description:
        "日记中记载，这场婚礼需要的并不是一位真正的新娘，而是一个代替死者完成仪式的替身。"
    });
  }

  messageText.textContent =
    "发现线索：" + propData.name;

  saveGame();
  closeItemModal();
  renderCluePanel();
  renderBedroom();
  updateClueCounter();
}
function cutWeddingDress() {
  gameState.bedroomProgress.dressCut = true;
  gameState.inventory =
  gameState.inventory.filter(function (itemId) {
    return itemId !== "scissors";
  });

if (!gameState.usedItems.includes("scissors")) {
  gameState.usedItems.push("scissors");
}
  selectedItemId = null;

  saveGame();
  closeItemModal();
  renderInventory();
  renderBedroom();

  messageText.textContent =
    "红线被剪断了。嫁衣内侧露出一行被隐藏的文字。";
}

function collectBedroomKey() {
  gameState.bedroomProgress.keyCollected = true;

  if (!gameState.inventory.includes("key")) {
    gameState.inventory.push("key");
  }
  
  checkWorkshopUnlock();

  if (!gameState.unlockedScenes.includes("workshop")) {
    gameState.unlockedScenes.push("workshop");
  }
  
  selectedItemId = null;

  saveGame();
  closeItemModal();
  renderInventory();
  renderBedroom();
  renderMap();
  updateClueCounter();

  messageText.textContent =
    "获得道具：旧铜钥匙。它或许可以打开某个上锁的柜子。";
}

function createOfferingItem(itemData) {
  const item = document.createElement("img");

  item.src = itemData.image;
  item.alt = itemData.name;
  item.title = itemData.name;

  item.classList.add(
    "scene-prop",
    "offering-item"
  );

  item.style.left = itemData.left;
  item.style.top = itemData.top;
  item.style.width = itemData.width;

  item.dataset.itemId = itemData.id;

  item.addEventListener("click", function () {
    inspectOfferingItem(itemData);
  });

  propLayer.appendChild(item);
}


function inspectOfferingItem(itemData) {
  openModal({
    title: itemData.name,
    image: itemData.image,
    description: itemData.description,

    actions: [
      {
        label: "拾取",
        action: function () {
          collectInventoryItem(itemData);
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function collectInventoryItem(itemData) {
  const alreadyCollected =
    gameState.inventory.includes(itemData.id);

  if (!alreadyCollected) {
    gameState.inventory.push(itemData.id);
  }

  selectedItemId = itemData.id;

  messageText.textContent =
    "获得道具：" + itemData.name;

  saveGame();
  renderInventory();
  closeItemModal();
  renderWeddingHall();
}

function renderInventory() {
  inventoryList.innerHTML = "";

  if (gameState.inventory.length === 0) {
    return;
  }

  gameState.inventory.forEach(function (itemId) {
    const itemData = allInventoryItems.find(
      function (item) {
        return item.id === itemId;
      }
    );

    if (!itemData) {
      return;
    }

    const slot = document.createElement("button");

    slot.type = "button";
    slot.classList.add("inventory-slot");
    slot.title = itemData.name;

    if (selectedItemId === itemId) {
      slot.classList.add("selected");
    }

    const image = document.createElement("img");

    image.src = itemData.image;
    image.alt = itemData.name;

    slot.appendChild(image);

    slot.addEventListener("click", function () {
      selectInventoryItem(itemId);
    });

    inventoryList.appendChild(slot);
  });
}


function selectInventoryItem(itemId) {
  if (selectedItemId === itemId) {
    selectedItemId = null;

    messageText.textContent =
      "已取消选择道具。";

    renderInventory();
    return;
  }

  selectedItemId = itemId;

  const itemData = allInventoryItems.find(
    function (item) {
      return item.id === itemId;
    }
  );

  if (!itemData) {
    messageText.textContent =
      "已选择道具。";

    renderInventory();
    return;
  }

  // 场景二的四件供品
  const isOffering = offeringItems.some(
    function (item) {
      return item.id === itemId;
    }
  );

  if (
    gameState.currentScene === "wedding" &&
    isOffering
  ) {
    messageText.textContent =
      "已选择：" + itemData.name +
      "。请选择一个纸人交付道具。";
  }

  // 场景三的剪刀
  else if (
    gameState.currentScene === "bedroom" &&
    itemId === "scissors"
  ) {
    messageText.textContent =
      "已选择：剪刀。现在点击嫁衣，尝试剪断红线。";
  }

  // 其他道具
  else {
    messageText.textContent =
      "已选择：" + itemData.name +
      "。寻找场景中可以使用它的位置。";
  }

  renderInventory();
}

function createPaperDoll(dollData) {
  const doll = document.createElement("img");

  doll.src = dollData.image;
  doll.alt = dollData.name;
  doll.title = dollData.name;

  doll.classList.add(
    "scene-prop",
    "paper-doll"
  );

  doll.style.left = dollData.left;
  doll.style.top = dollData.top;
  doll.style.width = dollData.width;

  doll.dataset.dollId = dollData.id;
  if (
  gameState.solvedDolls.includes(dollData.id)
) {
  doll.classList.add("solved");
}

  doll.addEventListener("click", function () {
    inspectPaperDoll(dollData);
  });

  propLayer.appendChild(doll);
}


function inspectPaperDoll(dollData) {
  const isSolved =
    gameState.solvedDolls.includes(dollData.id);

  if (isSolved) {
    openModal({
      title: dollData.name,
      image: dollData.image,

      description:
        "纸人已经接过供品，僵硬地低下了头。",

      actions: [
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  if (!selectedItemId) {
    openModal({
      title: dollData.name,
      image: dollData.image,

      description:
        dollData.description +
        "\n\n它的双手空空，似乎正在等待某件东西。\n\n" +
        "请先从底部道具栏选择一件供品。",

      actions: [
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  giveItemToPaperDoll(dollData);
}

function giveItemToPaperDoll(dollData) {
  const selectedItem = offeringItems.find(
    function (item) {
      return item.id === selectedItemId;
    }
  );

  if (!selectedItem) {
    return;
  }

  if (selectedItemId !== dollData.correctItem) {
    openModal({
      title: "供品错误",
      image: selectedItem.image,

      description:
        "纸人的头转向你。\n\n" +
        "它没有接过这件东西，看来供品放错了。",

      actions: [
        {
          label: "取回道具",
          action: closeItemModal
        }
      ]
    });

    messageText.textContent =
      "纸人拒绝了这件供品。";

    return;
  }

  const solvedItemId = selectedItemId;

  gameState.solvedDolls.push(dollData.id);
  gameState.usedItems.push(solvedItemId);

  gameState.inventory =
    gameState.inventory.filter(
      function (itemId) {
        return itemId !== solvedItemId;
      }
    );

  selectedItemId = null;

  saveGame();
  renderInventory();
  renderWeddingHall();
  updateClueCounter();

  openModal({
    title: "供品归位",
    image: selectedItem.image,

    description:
      "纸人缓缓抬起双手，接过了" +
      selectedItem.name +
      "。\n\n喜堂中传来一声低沉的木头摩擦声。",

    actions: [
      {
        label: "继续调查",
        action: closeItemModal
      }
    ]
  });

  checkPaperDollPuzzle();
}
const placedOfferingPositions = {
  "paper-doll-1": {
    left: "31.5%",
    top: "53%",
    width: "4%"
  },

  "paper-doll-2": {
    left: "42%",
    top: "54%",
    width: "3%"
  },

  "paper-doll-3": {
    left: "53%",
    top: "54%",
    width: "4%"
  },

  "paper-doll-4": {
    left: "63%",
    top: "52%",
    width: "3.5%"
  }
};


function createPlacedOffering(dollData) {
  const itemData = allInventoryItems.find(
    function (item) {
      return item.id === dollData.correctItem;
    }
  );

  const position =
    placedOfferingPositions[dollData.id];

  if (!itemData || !position) {
    return;
  }

  const placedItem = document.createElement("img");

  placedItem.src = itemData.image;
  placedItem.alt = itemData.name;

  placedItem.classList.add("placed-offering");

  placedItem.style.left = position.left;
  placedItem.style.top = position.top;
  placedItem.style.width = position.width;

  propLayer.appendChild(placedItem);
  
}
function createWeddingRewards() {
  const contractCollected =
    gameState.collectedRewards.includes(
      "marriage-top"
    );

  const candleCollected =
    gameState.collectedRewards.includes(
      "candle"
    );

  if (!contractCollected) {
    createWeddingReward({
      id: "marriage-top",
      name: "婚契上半部分",

      image:
        "images/wedding/marriage-top.png",

      left: "43%",
      top: "64%",
      width: "12%",

      description:
        "一张从中间撕断的旧婚契，上面的人名和日期已经模糊。"
    });
  }

  if (!candleCollected) {
    createWeddingReward({
      id: "candle",
      name: "熄灭的喜烛",

      image: "images/wedding/candle.png",

      left: "57%",
      top: "66%",
      width: "5%",

      description:
        "一根已经熄灭的喜烛，烛芯却仍然带着余温。"
    });
  }
}


function createWeddingReward(rewardData) {
  const reward = document.createElement("img");

  reward.src = rewardData.image;
  reward.alt = rewardData.name;
  reward.title = rewardData.name;

  reward.classList.add(
    "scene-prop",
    "wedding-reward"
  );

  reward.style.left = rewardData.left;
  reward.style.top = rewardData.top;
  reward.style.width = rewardData.width;

  reward.addEventListener("click", function () {
    inspectWeddingReward(rewardData);
  });

  propLayer.appendChild(reward);
}


function inspectWeddingReward(rewardData) {
  if (rewardData.id === "marriage-top") {
    playSfx("audio/PageTurn.mp3");
  }

  openModal({
    title: rewardData.name,
    image: rewardData.image,
    description: rewardData.description,

    actions: [
      {
        label: "收下",
        action: function () {
          collectWeddingReward(rewardData);
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function collectWeddingReward(rewardData) {
  const alreadyCollected =
    gameState.collectedRewards.includes(
      rewardData.id
    );

  if (!alreadyCollected) {
    gameState.collectedRewards.push(
      rewardData.id
    );
  }

  if (
    rewardData.id === "candle" &&
    !gameState.inventory.includes("candle")
  ) {
    gameState.inventory.push("candle");
  }

if (
  rewardData.id === "marriage-top" &&
  !gameState.inventory.includes("marriage-top")
) {
  gameState.inventory.push("marriage-top");
}
  saveGame();
  closeItemModal();

  renderInventory();
  renderCluePanel();
  renderWeddingHall();

  messageText.textContent =
    "获得：" + rewardData.name;

  checkWeddingRewards();
}


function checkWeddingRewards() {
  const hasContract =
    gameState.collectedRewards.includes(
      "marriage-top"
    );

  const hasCandle =
    gameState.collectedRewards.includes(
      "candle"
    );

  if (!hasContract || !hasCandle) {
    return;
  }

  if (
    !gameState.unlockedScenes.includes(
      "bedroom"
    )
  ) {
    gameState.unlockedScenes.push(
      "bedroom"
    );
    playSfx("audio/DoorOpen.mp3");
  }

  messageText.textContent =
    "暗格已经空了。通往新娘绣房的门缓缓打开。";

  if (!document.querySelector("#wedding-continue-btn")) {
    const continueBtn = document.createElement("button");
    continueBtn.id = "wedding-continue-btn";
    continueBtn.type = "button";
    continueBtn.className = "continue-button";
    continueBtn.textContent = "继续探索";

    continueBtn.style.left = "12%";
    continueBtn.style.top = "45%";

    continueBtn.addEventListener("click", function () {
      renderBedroom();
    });

    propLayer.appendChild(continueBtn);
  }

  saveGame();
  renderMap();
}
function checkPaperDollPuzzle() {
  if (
    gameState.solvedDolls.length <
    paperDolls.length
  ) {
    return;
  }

  playSfx("audio/Mechanical.mp3");

  messageText.textContent =
    "四件供品全部归位。喜宴桌下传来机关打开的声音。";

  openModal({
    title: "桌下暗格",

    image:
      "images/wedding/marriage-top.png",

    description:
      "四个纸人同时低下头。\n\n" +
      "喜宴桌下的暗格缓缓打开，里面似乎藏着一张残缺婚契和一根熄灭的喜烛。",

    actions: [
      {
        label: "查看暗格",
        action: closeItemModal
      }
    ]
  });
}

function checkBedroomCompletion() {
  const requiredClues = ["diary"];
  const bedroomCompleted = requiredClues.every(function (clueId) {
    return gameState.clues.some(function (clue) {
      return clue.id === clueId;
    });
  });

  if (bedroomCompleted && gameState.bedroomProgress.keyCollected) {
    playSfx("audio/DoorOpen.mp3");

    if (!document.querySelector("#bedroom-continue-btn")) {
      const continueBtn = document.createElement("button");
      continueBtn.id = "bedroom-continue-btn";
      continueBtn.type = "button";
      continueBtn.className = "continue-button";
      continueBtn.textContent = "继续探索";

      continueBtn.style.right = "12%";
      continueBtn.style.top = "45%";

      continueBtn.addEventListener("click", function () {
        renderWorkshop();
      });

      propLayer.appendChild(continueBtn);
    }
  }
}

/* =========================
   创建透明互动道具
========================= */

function createSceneProp(propData) {
  const prop = document.createElement("img");

  prop.src = propData.image;
  prop.alt = propData.name;
  prop.title = propData.name;

  prop.classList.add("scene-prop");

  prop.style.left = propData.left;
  prop.style.top = propData.top;
  prop.style.width = propData.width;

  prop.dataset.propId = propData.id;

  prop.addEventListener("click", function () {
    handlePropClick(propData);
  });

  propLayer.appendChild(prop);
}


/* =========================
   点击道具
========================= */

function handlePropClick(propData) {
  collectClue(propData);

  if (propData.id === "radio") {
    playRadioEffects();
    openRadioModal(propData);
  }

  if (propData.id === "photo") {
    playSfx("audio/PageTurn.mp3");
    openPhotoModal(propData);
  }

  if (propData.id === "invitation") {
    playSfx("audio/PageTurn.mp3");
    openInvitationModal(propData);
  }

  checkHallCompletion();
  updateClueCounter();
}


/* =========================
   收集线索
========================= */

function collectClue(propData) {
  const alreadyCollected = gameState.clues.some(
    function (clue) {
      return clue.id === propData.id;
    }
  );

  if (!alreadyCollected) {
    gameState.clues.push({
      id: propData.id,
      name: propData.clueTitle,
      image: propData.image,
      description: propData.description
    });

    messageText.textContent =
      "发现线索：" + propData.clueTitle;

    saveGame();
    renderCluePanel();
    updateClueCounter();
  }
}


/* =========================
   收音机弹窗
========================= */

function openRadioModal(propData) {
  openModal({
    title: propData.clueTitle,
    image: propData.image,
    description: propData.description,

    actions: [
      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


/* =========================
   喜照弹窗
========================= */

function openPhotoModal(propData) {
  openModal({
    title: "残缺喜照，正面",
    image: "images/hall/photo-front.png",
    description:
      "照片中的新郎和新娘并排坐在喜堂中。\n\n" +
      "新娘面部被划去，新郎脸上贴着符纸，照片右下角缺失了一块。",

    actions: [
      {
        label: "翻到背面",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          showPhotoBack();
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function showPhotoBack() {
  openModal({
    title: "残缺喜照，背面",
    image: "images/hall/photo-back.png",
    description:
      "照片背面留下了一句已经模糊的警告：\n\n" +
      "“别替我。把我的名字还给我。”",

    actions: [
      {
        label: "翻回正面",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          openPhotoFrontAgain();
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function openPhotoFrontAgain() {
  const photoData = hallProps.find(
    function (prop) {
      return prop.id === "photo";
    }
  );

  openPhotoModal(photoData);
}


/* =========================
   喜帖弹窗
========================= */

function openInvitationModal(propData) {
  openModal({
    title: "无名喜帖，封面",
    image: "images/hall/invitation-front.png",
    description:
      "喜帖封面已经严重褪色。\n\n" +
      "封口处缠绕着一根暗红色细线。",

    actions: [
      {
        label: "打开喜帖",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          showInvitationOpen();
        }
      },

      {
        label: "查看背面",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          showInvitationBack();
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function showInvitationOpen() {
  openModal({
    title: "无名喜帖，内页",
    image: "images/hall/invitation-open.png",
    description:
      "喜帖上的新娘姓名被墨迹完全覆盖。\n\n" +
      "旁边画着四个模糊图案：灯、杯、梳、镜。",

    actions: [
      {
        label: "查看背面",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          showInvitationBack();
        }
      },

      {
        label: "合上喜帖",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          openInvitationAgain();
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function showInvitationBack() {
  openModal({
    title: "无名喜帖，背面",
    image: "images/hall/invitation-back.png",
    description:
      "喜帖背面留下了一行褪色小字：\n\n" +
      "“迎亲客各有所持，四礼归位，喜堂方开。”",

    actions: [
      {
        label: "打开喜帖",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          showInvitationOpen();
        }
      },

      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


function openInvitationAgain() {
  const invitationData = hallProps.find(
    function (prop) {
      return prop.id === "invitation";
    }
  );

  openInvitationModal(invitationData);
}


/* =========================
   通用弹窗
========================= */

function openModal(modalData) {
  modalTitle.textContent = modalData.title;
  if (modalData.image) {
  modalImage.src = modalData.image;
  modalImage.alt = modalData.title;
  modalImage.classList.remove("hidden");
} else {
  modalImage.removeAttribute("src");
  modalImage.alt = "";
  modalImage.classList.add("hidden");
}
  modalDescription.textContent = modalData.description;

  modalActions.innerHTML = "";

  modalData.actions.forEach(function (actionData) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = actionData.label;

    button.addEventListener(
      "click",
      actionData.action
    );

    modalActions.appendChild(button);
  });

  itemModal.classList.remove("hidden");
  itemModal.setAttribute("aria-hidden", "false");
}


function closeItemModal() {
  stopRadioEffects();
  itemModal.classList.add("hidden");
  itemModal.setAttribute("aria-hidden", "true");
}


/* =========================
   检查场景一是否完成
========================= */

function checkHallCompletion() {
  const requiredClues = [
    "radio",
    "photo",
    "invitation"
  ];

  const hallCompleted = requiredClues.every(
    function (clueId) {
      return gameState.clues.some(
        function (clue) {
          return clue.id === clueId;
        }
      );
    }
  );

  if (hallCompleted) {
    if (!gameState.unlockedScenes.includes("wedding")) {
      gameState.unlockedScenes.push("wedding");
      playSfx("audio/DoorOpen.mp3");
    }

    messageText.textContent =
      "喜帖上的红线自行断开。通往无人喜堂的门已经解锁。";

    if (!document.querySelector("#hall-continue-btn")) {
      const continueBtn = document.createElement("button");
      continueBtn.id = "hall-continue-btn";
      continueBtn.type = "button";
      continueBtn.className = "continue-button";
      continueBtn.textContent = "继续探索";

      continueBtn.style.left = "45%";
      continueBtn.style.top = "48%";

      continueBtn.addEventListener("click", function () {
        renderWeddingHall();
      });

      propLayer.appendChild(continueBtn);
    }

    saveGame();
    renderMap();
  }
}


/* =========================
   线索面板
========================= */

function renderCluePanel() {
  clueList.innerHTML = "";

  if (gameState.clues.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.classList.add("empty-message");
    emptyMessage.textContent = "暂时没有发现线索。";

    clueList.appendChild(emptyMessage);
    return;
  }

  gameState.clues.forEach(function (clue) {
    const clueCard = document.createElement("button");

    clueCard.type = "button";
    clueCard.classList.add("clue-card");

    clueCard.textContent = clue.name;

    clueCard.addEventListener("click", function () {
      openSavedClue(clue);
    });

    clueList.appendChild(clueCard);
  });
}

function checkMarriageContractReady() {
  const hasTop =
    gameState.inventory.includes(
      "marriage-top"
    );

  const hasBottom =
    gameState.inventory.includes(
      "marriage-bottom"
    );

  const alreadyCombined =
    gameState.clues.some(function (clue) {
      return clue.id === "marriage-contract";
    });

  if (
    !hasTop ||
    !hasBottom ||
    alreadyCombined
  ) {
    return;
  }

  openModal({
    title: "两张残缺婚契",
    image:
      "images/workshop/marriage-contract.png",
    description:
      "婚契的两张残片边缘完全吻合。现在可以将它们拼合起来。",
    actions: [
      {
        label: "拼合婚契",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          combineMarriageContract();
        }
      },
      {
        label: "稍后处理",
        action: closeItemModal
      }
    ]
  });
}

function combineMarriageContract() {
  gameState.inventory =
    gameState.inventory.filter(
      function (itemId) {
        return (
          itemId !== "marriage-top" &&
          itemId !== "marriage-bottom"
        );
      }
    );

  const alreadyCombined =
    gameState.clues.some(function (clue) {
      return clue.id === "marriage-contract";
    });

  if (!alreadyCombined) {
    gameState.clues.push({
      id: "marriage-contract",
      name: "完整婚契",
      image:
        "images/workshop/marriage-contract.png",
      description:
        "完整婚契证明，新娘的姓名被人为抹去，她被当作替身写进了这场仪式。"
    });
  }

  selectedItemId = null;

  saveGame();
  closeItemModal();
  renderInventory();
  renderCluePanel();
  updateClueCounter();

  messageText.textContent =
    "婚契已经拼合，完整婚契已加入线索栏。";

  openModal({
    title: "完整婚契",
    image:
      "images/workshop/marriage-contract.png",
    description:
      "两张残片严丝合缝地拼在一起。被遮住的仪式内容终于完整显现。",
    actions: [
      {
        label: "收下完整线索",
        action: closeItemModal
      }
    ]
  });
}
function checkPhotoRepairReady() {
  const hasPhoto =
    gameState.clues.some(function (clue) {
      return clue.id === "photo";
    });

  const hasFragment =
    gameState.clues.some(function (clue) {
      return clue.id === "photo-fragment";
    });

  const alreadyRepaired =
    gameState.clues.some(function (clue) {
      return clue.id === "repaired-photo";
    });

  if (
    !hasPhoto ||
    !hasFragment ||
    alreadyRepaired
  ) {
    return;
  }

  openModal({
    title: "残缺喜照",
    image: "images/hall/photo-front.png",
    description:
      "从旧柜子中找到的碎片，与残缺喜照右下角完全吻合。",
    actions: [
      {
        label: "修复喜照",
        action: function () {
          playSfx("audio/PageTurn.mp3");
          repairWeddingPhoto();
        }
      },
      {
        label: "稍后处理",
        action: closeItemModal
      }
    ]
  });
}

function repairWeddingPhoto() {
  gameState.clues =
    gameState.clues.filter(function (clue) {
      return (
        clue.id !== "photo" &&
        clue.id !== "photo-fragment"
      );
    });

  gameState.clues.push({
    id: "repaired-photo",
    name: "修复后的喜照",
    image: "images/workshop/photo-repaired.png",
    description:
      "喜照缺失的一角已经被拼回。照片背面的日期与婚契完全一致，证明它们属于同一场仪式。"
  });

  saveGame();
  closeItemModal();
  renderCluePanel();
  updateClueCounter();

  messageText.textContent =
    "喜照已经修复，并加入线索栏。";

  openModal({
    title: "修复后的喜照",
    image:
      "images/workshop/photo-repaired.png",
    description:
      "照片碎片严丝合缝地回到了原位，一段被掩盖的婚礼记录重新完整。",
    actions: [
      {
        label: "收下完整线索",
        action: closeItemModal
      }
    ]
  });
}
function openSavedClue(clue) {
  const originalProp = hallProps.find(function (prop) {
    return prop.id === clue.id;
  });

  if (originalProp) {
    handlePropClick(originalProp);
    return;
  }

  playSfx("audio/PageTurn.mp3");
  openModal({
    title: clue.name,
    image: clue.image || "images/workshop/photo-repaired.png",
    description: clue.description,

    actions: [
      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}


/* =========================
   地图面板
========================= */

const locations = [
  {
    id: "hall",
    name: "宅院门厅"
  },

  {
    id: "wedding",
    name: "无人喜堂"
  },

  {
    id: "bedroom",
    name: "新娘绣房"
  },

  {
    id: "workshop",
    name: "后院纸扎铺"
  },

  {
    id: "corridor",
    name: "回门长廊"
  }
];


function renderMap() {
  locationList.innerHTML = "";

  locations.forEach(function (location) {
    const locationButton =
      document.createElement("button");

    locationButton.type = "button";
    locationButton.classList.add("location-button");

    const isUnlocked =
      gameState.unlockedScenes.includes(location.id);

    if (isUnlocked) {
      locationButton.textContent = location.name;
    } else {
      locationButton.textContent = "？？？";
      locationButton.disabled = true;
    }

    if (location.id === gameState.currentScene) {
      locationButton.textContent += "，当前位置";
    }

    locationButton.addEventListener(
      "click",
      function () {
        handleLocationClick(location.id);
      }
    );

    locationList.appendChild(locationButton);
  });
}


function handleLocationClick(locationId) {
  if (
    !gameState.unlockedScenes.includes(locationId)
  ) {
    return;
  }

  closePanel(mapPanel);

  if (locationId === "hall") {
    renderHall();
    return;
  }

  if (locationId === "wedding") {
    renderWeddingHall();
    return;
  }

 if (locationId === "bedroom") {
  renderBedroom();
  return;
}
if (locationId === "workshop") {
  renderWorkshop();
  return;
}
if (locationId === "corridor") {
  renderCorridor();
  return;
}
}
function createWorkshopLedger() {
  const ledgerData = workshopItems.ledger;

  const ledger = document.createElement("img");

  ledger.src = ledgerData.image;
  ledger.alt = ledgerData.name;
  ledger.title = ledgerData.name;

  ledger.classList.add(
    "scene-prop",
    "workshop-prop"
  );

  ledger.style.left = ledgerData.left;
  ledger.style.top = ledgerData.top;
  ledger.style.width = ledgerData.width;

  ledger.addEventListener("click", function () {
    playSfx("audio/PageTurn.mp3");
    inspectWorkshopLedger();
  });

  propLayer.appendChild(ledger);
}
function createWorkshopCabinetHotspot() {
  const cabinet = document.createElement("button");

  cabinet.type = "button";
  cabinet.title = "上锁的旧柜子";
  cabinet.setAttribute(
    "aria-label",
    "查看上锁的旧柜子"
  );

cabinet.classList.add(
  "scene-prop",
  "workshop-cabinet-hotspot"
);
  cabinet.style.left = "72%";
  cabinet.style.top = "35%";
  cabinet.style.width = "18%";
  cabinet.style.height = "42%";

cabinet.addEventListener("click", function () {
  inspectWorkshopCabinet();
});
  propLayer.appendChild(cabinet);
}
function inspectWorkshopCabinet() {
  if (gameState.workshopProgress.cabinetOpened) {
    openModal({
      title: "已经打开的旧柜子",
      description:
        "柜门已经打开，里面压着半张婚契和一块喜照碎片。",
      actions: [
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  if (selectedItemId !== "key") {
    openModal({
      title: "上锁的旧柜子",
      description:
        "柜门被铜锁锁住。请先从底部道具栏选择旧铜钥匙。",
      actions: [
        {
          label: "收起",
          action: closeItemModal
        }
      ]
    });

    return;
  }

  openModal({
    title: "上锁的旧柜子",
    description:
      "旧铜钥匙正好能够插进锁孔。转动钥匙后，柜门内传来一声闷响。",
    actions: [
      {
        label: "打开柜子",
        action: function () {
          playSfx("audio/DoorOpen.mp3");
          openWorkshopCabinet();
        }
      },
      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}

function openWorkshopCabinet() {
  gameState.workshopProgress.cabinetOpened = true;

  gameState.inventory =
    gameState.inventory.filter(function (itemId) {
      return itemId !== "key";
    });

  if (!gameState.usedItems.includes("key")) {
    gameState.usedItems.push("key");
  }

  selectedItemId = null;

  saveGame();
  closeItemModal();
  renderInventory();
  renderWorkshop();
  updateClueCounter();

  messageText.textContent =
    "旧柜子打开了，里面压着半张婚契和一块喜照碎片。";
}
function createWorkshopCabinetRewards() {
  if (
    !gameState.workshopProgress.contractBottomCollected
  ) {
    createWorkshopReward(
      workshopItems.contractBottom,
      "68%",
      "49%",
      "10%"
    );
  }

  if (
    !gameState.workshopProgress.photoFragmentCollected
  ) {
    createWorkshopReward(
      workshopItems.photoFragment,
      "79%",
      "52%",
      "7%"
    );
  }
}

function createWorkshopReward(
  itemData,
  left,
  top,
  width
) {
  const reward = document.createElement("img");

  reward.src = itemData.image;
  reward.alt = itemData.name;
  reward.title = itemData.name;

  reward.classList.add(
    "scene-prop",
    "workshop-reward"
  );

  reward.style.left = left;
  reward.style.top = top;
  reward.style.width = width;

  reward.addEventListener("click", function () {
    inspectWorkshopReward(itemData);
  });

  propLayer.appendChild(reward);
}

function inspectWorkshopReward(itemData) {
  openModal({
    title: itemData.name,
    image: itemData.image,
    description: itemData.description,
    actions: [
      {
        label: "收下线索",
        action: function () {
          collectWorkshopReward(itemData);
        }
      },
      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}

function collectWorkshopReward(itemData) {
  if (itemData.id === "marriage-bottom") {
    gameState.workshopProgress
      .contractBottomCollected = true;

    if (
      !gameState.inventory.includes(
        "marriage-bottom"
      )
    ) {
      gameState.inventory.push(
        "marriage-bottom"
      );
    }
  }

  if (itemData.id === "photo-fragment") {
    gameState.workshopProgress
      .photoFragmentCollected = true;

    const alreadyCollected =
      gameState.clues.some(function (clue) {
        return clue.id === "photo-fragment";
      });

    if (!alreadyCollected) {
      gameState.clues.push({
        id: itemData.id,
        name: itemData.name,
        image: itemData.image,
        description: itemData.description
      });
    }
  }

  saveGame();
  closeItemModal();
  renderInventory();
  renderCluePanel();
  renderWorkshop();
  updateClueCounter();

  messageText.textContent =
    "发现物品：" + itemData.name;
    checkMarriageContractReady();
    checkPhotoRepairReady();
}
function inspectWorkshopLedger() {
  const ledgerData = workshopItems.ledger;

  if (gameState.workshopProgress.ledgerRevealed) {
    openModal({
      title: "显字后的旧账册",
      image: ledgerData.image,
      description:
        "烛光照过纸面，隐藏记录已经出现。",
      actions: [
        { label: "收起", action: closeItemModal }
      ]
    });
    return;
  }

  if (selectedItemId !== "candle") {
    openModal({
      title: ledgerData.name,
      image: ledgerData.image,
      description:
        ledgerData.description +
        "\n\n请先从道具栏选择蜡烛。",
      actions: [
        { label: "收起", action: closeItemModal }
      ]
    });
    return;
  }

  openModal({
    title: ledgerData.name,
    image: ledgerData.image,
    description:
      "你把蜡烛靠近账册，暗红色字迹逐渐浮现。",
    actions: [
      {
        label: "照亮账册",
        action: revealWorkshopLedger
      },
      {
        label: "收起",
        action: closeItemModal
      }
    ]
  });
}
function revealWorkshopLedger() {
  const ledgerData = workshopItems.ledger;

  gameState.workshopProgress.ledgerRevealed = true;

  gameState.inventory =
    gameState.inventory.filter(function (itemId) {
      return itemId !== "candle";
    });

  if (!gameState.usedItems.includes("candle")) {
    gameState.usedItems.push("candle");
  }

  const alreadyInClues =
    gameState.clues.some(function (clue) {
      return clue.id === "ledger";
    });

  if (!alreadyInClues) {
    gameState.clues.push({
      id: "ledger",
      name: "显字后的旧账册",
      image: ledgerData.image,
      description:
        "账册隐藏记录显示，林家长女的姓名被人为除去，她被当作无名替身写入婚契。"
    });
  }

  selectedItemId = null;

  saveGame();
  closeItemModal();
  renderInventory();
  renderCluePanel();
  renderWorkshop();
  updateClueCounter();

  messageText.textContent =
    "烛光照出了隐藏记录，旧账册已加入线索栏。";
}
/* =========================
   打开与关闭面板
========================= */

mapButton.addEventListener("click", function () {
  renderMap();

  mapPanel.classList.remove("hidden");
  mapPanel.setAttribute("aria-hidden", "false");
});


clueButton.addEventListener("click", function () {
  renderCluePanel();

  cluePanel.classList.remove("hidden");
  cluePanel.setAttribute("aria-hidden", "false");
});


document
  .querySelectorAll(".close-button")
  .forEach(function (button) {
    button.addEventListener("click", function () {
      const panelId = button.dataset.close;
      const panel = document.querySelector(
        "#" + panelId
      );

      closePanel(panel);
    });
  });


function closePanel(panel) {
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}


/* 点击黑色背景关闭弹窗 */

document
  .querySelectorAll(".overlay-panel")
  .forEach(function (panel) {
    panel.addEventListener("click", function (event) {
      if (event.target === panel) {
        closePanel(panel);
      }
    });
  });


/* =========================
   音效按钮 (Sound & Music Toggle)
========================= */

soundButton.addEventListener("click", function () {
  gameState.soundEnabled =
    !gameState.soundEnabled;

  bgmAudio.muted = !gameState.soundEnabled;

  if (gameState.soundEnabled) {
    bgmAudio.play().catch(function () {});
  } else {
    bgmAudio.pause();
    stopRadioEffects();
  }

  updateSoundButton();
  renderInventory();
  saveGame();
});


function updateSoundButton() {
  if (gameState.soundEnabled) {
    soundButton.textContent = "音效：开";
  } else {
    soundButton.textContent = "音效：关";
  }
}


/* =========================
   重置游戏
========================= */

resetButton.addEventListener("click", function () {
  const shouldReset = window.confirm(
    "确定要清空所有调查进度并重新开始吗？"
  );

  if (!shouldReset) {
    return;
  }

  localStorage.removeItem("namelessWeddingSave");
  window.location.reload();
});


/* =========================
   键盘关闭弹窗
========================= */

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") {
    return;
  }

  closeItemModal();
  closePanel(mapPanel);
  closePanel(cluePanel);
});
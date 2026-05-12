let capture;
let facemesh;
let handpose;
let predictions = [];
let handPredictions = [];
let camReady = false;
let modelReadyFlag = false;
let handReadyFlag = false;

let earringImgs = [];
let currentEarringIndex = 0; // 0 到 4 分別對應 5 款耳環

function preload() {
  // 預先載入 5 款耳環的圖片
  earringImgs[0] = loadImage('pic/acc/acc1_ring.png');
  earringImgs[1] = loadImage('pic/acc/acc2_pearl.png');
  earringImgs[2] = loadImage('pic/acc/acc3_tassel.png');
  earringImgs[3] = loadImage('pic/acc/acc4_jade.png');
  earringImgs[4] = loadImage('pic/acc/acc5_phoenix.png');
}

function setup() {
  // 第一步驟：產生一個全螢幕的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 擷取攝影機影像
  capture = createCapture(VIDEO, () => {
    console.log('攝影機載入成功！');
    camReady = true;
    checkReady();
  });
  
  // 捕捉攝影機錯誤 (例如: 未安裝攝影機或拒絕權限)
  capture.elt.onerror = () => {
    console.error('無法存取攝影機，請確認設備是否連接並已授權。');
  };
  capture.hide(); // 隱藏預設的 HTML 影片元素，避免重複顯示

  // 載入最新版 ml5.js (v1.x) 的 faceMesh 模型
  facemesh = ml5.faceMesh({ maxFaces: 1 }, () => {
    console.log('Facemesh 模型載入完成！');
    modelReadyFlag = true;
    checkReady();
  });

  // 載入最新版 ml5.js (v1.x) 的 handPose 模型
  handpose = ml5.handPose({ maxHands: 1 }, () => {
    console.log('HandPose 模型載入完成！');
    handReadyFlag = true;
    checkReady();
  });
}

// 必須等「攝影機」與所有「模型」都完全載入後，才能開始持續偵測影像
function checkReady() {
  if (camReady && modelReadyFlag && handReadyFlag) {
    facemesh.detectStart(capture, results => { 
      predictions = results; 
    });
    handpose.detectStart(capture, results => {
      handPredictions = results;
    });
  }
}

function draw() {
  // 畫布背景顏色為淡黃色
  background(255, 255, 204);

  // 設定影像繪製模式為中心點，方便後續置中對齊
  imageMode(CENTER);

  push();
  // 將座標原點移動到畫布的中間
  translate(width / 2, height / 2);
  
  // 如果攝影機或模型還沒準備好，顯示載入中提示
  if (capture.width === 0 || !modelReadyFlag || !handReadyFlag) {
    fill(150);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(24);
    text("攝影機、臉部與手勢模型載入中，請稍候...", 0, 0);
  } else {
    // 進行左右顛倒處理 (對 X 軸進行 -1 的縮放)
    scale(-1, 1);
    
    // 顯示影像：寬高為整個畫布寬高的 50%
    image(capture, 0, 0, width * 0.5, height * 0.5);
    
    // 判斷手勢並決定要顯示哪一款耳環
    if (handPredictions.length > 0) {
      let fingers = countFingers(handPredictions[0]);
      if (fingers >= 1 && fingers <= 5) {
        currentEarringIndex = fingers - 1;
      }
    }

    // 如果有辨識到臉部，且影片已成功載入，則畫出耳環
    if (predictions.length > 0) {
      for (let i = 0; i < predictions.length; i++) {
        const keypoints = predictions[i].keypoints;
        if (keypoints && keypoints.length > 361) {
          // Facemesh 節點索引：132 大約是左耳垂，361 大約是右耳垂
          drawEarrings(keypoints[132], false); // 左耳
          drawEarrings(keypoints[361], true);  // 右耳
        }
      }
    }
  }
  pop();

  // 在影像外部上方置中加上深咖啡色的名字
  fill(92, 64, 51);     // 深咖啡色
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(32);         // 設定文字大小
  text("414730233 林子靖", width / 2, height * 0.12);

  // 在影像外部下方置中加上作品名稱
  text("作品為影像辨識_耳環臉譜", width / 2, height * 0.88);
}

// 繪製耳環並根據比例往上往外偏移
function drawEarrings(pt, isRightEar) {
  if (!pt || pt.x === undefined || pt.y === undefined) return;

  // 將原始影像的座標轉換為當前畫布上置中與縮放後的座標
  let x = map(pt.x, 0, capture.width, -width * 0.25, width * 0.25);
  let y = map(pt.y, 0, capture.height, -height * 0.25, height * 0.25);

  // 根據畫布大小自適應計算耳環圖片的大小
  let imgSize = min(width, height) * 0.08; 
  
  // 依照比例往外、往上移動
  // isRightEar 為 true 時代表原影像中的右耳 (x 座標較大)，往外移則是加；左耳則為減
  let offsetX = imgSize * 0.4 * (isRightEar ? 1 : -1);
  let offsetY = -imgSize * 0.3;
  
  // 在耳垂位置畫出當前對應的耳環圖片
  image(earringImgs[currentEarringIndex], x + offsetX, y + offsetY + imgSize / 2, imgSize, imgSize);
}

// 當視窗大小改變時，自動調整畫布以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 計算伸出的手指數量
function countFingers(hand) {
  let fingers = 0;
  let kp = hand.keypoints;
  if (!kp || kp.length < 21) return 0;

  // 判斷四根手指 (食指 8, 中指 12, 無名指 16, 小指 20)
  // 若指尖的 y 座標小於第二關節的 y 座標，代表手指向上伸直
  if (kp[8].y < kp[6].y) fingers++;
  if (kp[12].y < kp[10].y) fingers++;
  if (kp[16].y < kp[14].y) fingers++;
  if (kp[20].y < kp[18].y) fingers++;
  
  // 判斷大拇指 (利用指尖到小指根部的距離，比較大拇指第二關節到小指根部的距離)
  if (dist(kp[4].x, kp[4].y, kp[17].x, kp[17].y) > dist(kp[3].x, kp[3].y, kp[17].x, kp[17].y)) fingers++;
  
  return fingers;
}
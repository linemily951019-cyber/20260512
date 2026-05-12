let capture;
let facemesh;
let predictions = [];
let camReady = false;
let modelReadyFlag = false;

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
}

// 必須等「攝影機」與「模型」都完全載入後，才能開始持續偵測影像
function checkReady() {
  if (camReady && modelReadyFlag) {
    facemesh.detectStart(capture, results => { 
      predictions = results; 
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
  if (capture.width === 0 || !modelReadyFlag) {
    fill(150);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(24);
    text("攝影機與 AI 模型載入中，請稍候...", 0, 0);
  } else {
    // 進行左右顛倒處理 (對 X 軸進行 -1 的縮放)
    scale(-1, 1);
    
    // 顯示影像：寬高為整個畫布寬高的 50%
    image(capture, 0, 0, width * 0.5, height * 0.5);
    
    // 如果有辨識到臉部，且影片已成功載入，則畫出耳環
    if (predictions.length > 0) {
      for (let i = 0; i < predictions.length; i++) {
        const keypoints = predictions[i].keypoints;
        if (keypoints && keypoints.length > 361) {
          // Facemesh 節點索引：132 大約是左耳垂，361 大約是右耳垂
          drawEarrings(keypoints[132]);
          drawEarrings(keypoints[361]);
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

// 繪製三個金色空心圓圈作為耳環
function drawEarrings(pt) {
  if (!pt || pt.x === undefined || pt.y === undefined) return;

  // 將原始影像的座標轉換為當前畫布上置中與縮放後的座標
  let x = map(pt.x, 0, capture.width, -width * 0.25, width * 0.25);
  let y = map(pt.y, 0, capture.height, -height * 0.25, height * 0.25);

  noFill();             // 設定為空心
  stroke(255, 215, 0);  // 金色線條
  strokeWeight(2);      // 設定線條粗細

  let circleSize = min(width, height) * 0.015; // 圓圈大小自適應
  let spacing = circleSize * 1.5; // 圓圈之間的間距

  // 從耳垂位置開始往下畫三個空心圓圈
  for (let j = 0; j < 3; j++) {
    circle(x, y + j * spacing, circleSize);
  }
}

// 當視窗大小改變時，自動調整畫布以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
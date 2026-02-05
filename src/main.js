console.log(1);

import "./style.css";
import gsap from "gsap";

import bg from './assets/bg.png';
import logo from './assets/logo.svg';
import handImgSrc from './assets/hand.png';
import shaking1 from './shaking1.png';
import shaking2 from './shaking2.png';
import shaking3 from './shaking3.png';

/* ============================
   iOS DETECT
============================ */
const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

/* ============================
   DOM
============================ */
const chest = document.getElementById("chest");
const progressBar = document.getElementById("progress-bar");
const frames = [shaking1, shaking2, shaking3];

let progress = 0;
let isOpened = false;
let lastShakeTime = 0;
let lastAcceleration = null;
let shakeSamples = [];
let shakeCount = 0;
let lastProgressTime = Date.now();
let decayInterval = null;
let idleSidewaysAnimation = null;

const SHAKE_SAMPLE_SIZE = 5;

/* ============================
   CONFIG
============================ */
const CONFIG = {
  shakeThreshold: 15,
  minShakeInterval: 200,
  progressPerShake: 25,
  decayRate: 1.5,
  progressDecayDelay: 2000,
  minProgressForShaking2: 25
};

/* ============================
   INIT
============================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('main').style.backgroundImage = `url(${bg})`;
  document.querySelector('.logo').src = logo;
  document.querySelector('.hand').src = handImgSrc;

  chest.src = frames[0];
  progressBar.style.width = "0%";

  animateHandIntro();
  startProgressDecay();

  if (!window.DeviceMotionEvent) {
    setupClickFallback();
    return;
  }

  // iOS — ТОЛЬКО через клик
  if (
    IS_IOS &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    setupIOSMotionPopup();
  } else {
    startShakeDetection(); // Android / Desktop
  }
});

/* ============================
   iOS PERMISSION
============================ */
function setupIOSMotionPopup() {
  const popup = document.getElementById('ios-motion-popup');
  const btn = document.getElementById('ios-motion-btn');
  if (!popup || !btn) return;

  popup.style.display = 'flex';

  btn.onclick = async () => {
    try {
      const res = await DeviceMotionEvent.requestPermission();
      popup.remove();

      if (res === 'granted') {
        startShakeDetection();
      } else {
        setupClickFallback();
      }
    } catch (e) {
      popup.remove();
      setupClickFallback();
    }
  };
}

/* ============================
   SHAKE DETECTION
============================ */
function startShakeDetection() {
  console.log('Shake detection started');

  window.addEventListener('devicemotion', (event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    if (!lastAcceleration) {
      lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
      return;
    }

    const deltaX = Math.abs(acc.x - lastAcceleration.x);
    const deltaY = Math.abs(acc.y - lastAcceleration.y);
    const deltaZ = Math.abs(acc.z - lastAcceleration.z);
    const totalDelta = Math.sqrt(deltaX**2 + deltaY**2 + deltaZ**2);

    shakeSamples.push(totalDelta);
    if (shakeSamples.length > SHAKE_SAMPLE_SIZE) shakeSamples.shift();

    const avg =
      shakeSamples.reduce((a, b) => a + b, 0) / shakeSamples.length;

    if (
      totalDelta > CONFIG.shakeThreshold &&
      avg > CONFIG.shakeThreshold * 0.7
    ) {
      handleShake();
    }

    lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
  });
}

/* ============================
   SHAKE HANDLER
============================ */
function handleShake() {
  const now = Date.now();
  if (now - lastShakeTime < CONFIG.minShakeInterval || isOpened) return;

  lastShakeTime = now;
  lastProgressTime = now;
  shakeCount++;

  flashScreen();
  animateHandShake();
  updateProgress(CONFIG.progressPerShake);
}

/* ============================
   PROGRESS
============================ */
function updateProgress(amount) {
  progress = Math.min(progress + amount, 100);

  gsap.to(progressBar, {
    width: `${progress}%`,
    duration: 0.3,
    ease: "power2.out",
    onUpdate: updateChestImage
  });

  if (progress >= 100 && !isOpened) {
    openChest();
  }
}

function updateChestImage() {
  if (isOpened) return;
  chest.src = progress < CONFIG.minProgressForShaking2 ? frames[0] : frames[1];
}

/* ============================
   DECAY
============================ */
function startProgressDecay() {
  decayInterval = setInterval(() => {
    if (progress <= 0 || isOpened) return;

    if (Date.now() - lastProgressTime > CONFIG.progressDecayDelay) {
      progress = Math.max(progress - CONFIG.decayRate, 0);
      progressBar.style.width = `${progress}%`;
    }
  }, 1000);
}

/* ============================
   OPEN CHEST
============================ */
function openChest() {
  isOpened = true;
  chest.src = frames[2];

  stopHandAnimation();

  gsap.to(chest, {
    scale: 1.15,
    duration: 0.4,
    yoyo: true,
    repeat: 1
  });

  progressBar.innerHTML = `<span>GET YOUR BONUS</span>`;
  progressBar.style.cursor = "pointer";
  progressBar.onclick = () => location.reload();
}

/* ============================
   HAND ANIMATIONS
============================ */
function animateHandIntro() {
  const hand = document.querySelector('.hand');
  gsap.fromTo(hand,
    { opacity: 0, x: 100, rotation: -30 },
    {
      opacity: 1,
      x: 0,
      rotation: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
      onComplete: startIdleSidewaysAnimation
    }
  );
}

function animateHandShake() {
  const hand = document.querySelector('.hand');
  gsap.killTweensOf(hand);

  gsap.fromTo(hand,
    { rotation: -15, x: -10 },
    {
      rotation: 15,
      x: 10,
      duration: 0.08,
      repeat: 5,
      yoyo: true,
      onComplete: startIdleSidewaysAnimation
    }
  );
}

function startIdleSidewaysAnimation() {
  const hand = document.querySelector('.hand');
  if (idleSidewaysAnimation) idleSidewaysAnimation.kill();

  idleSidewaysAnimation = gsap.to(hand, {
    x: -20,
    duration: 2.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut"
  });
}

function stopHandAnimation() {
  const hand = document.querySelector('.hand');
  gsap.killTweensOf(hand);
}

/* ============================
   FALLBACK CLICK
============================ */
function setupClickFallback() {
  document.body.addEventListener('click', handleShake);
}

/* ============================
   FX
============================ */
function flashScreen() {
  gsap.fromTo(document.body,
    { backgroundColor: 'rgba(255,255,0,0.15)' },
    { backgroundColor: 'rgba(255,255,0,0)', duration: 0.25 }
  );
}

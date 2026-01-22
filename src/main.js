import "./style.css";
import gsap from "gsap";

// Явно импортируем ВСЕ изображения
import bg from './assets/bg.png';
import logo from './assets/logo.svg';
import hand from './assets/hand.png';
import shaking1 from './shaking1.png';
import shaking2 from './shaking2.png';
import shaking3 from './shaking3.png';

const chest = document.getElementById("chest");
const progressBar = document.getElementById("progress-bar");

// Используем импортированные изображения
const frames = [shaking1, shaking2, shaking3];

// Устанавливаем начальное изображение
chest.src = frames[0];

// Устанавливаем другие изображения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  // Устанавливаем фон
  document.querySelector('main').style.backgroundImage = `url(${bg})`;

  // Устанавливаем логотип
  const logoImg = document.querySelector('.logo');
  if (logoImg) logoImg.src = logo;

  // Устанавливаем руку
  const handImg = document.querySelector('.hand');
  if (handImg) handImg.src = hand;

  // Инициализируем приложение
  init();
});

let progress = 0;
let isOpened = false;
let isShaking = false;
let lastShakeTime = 0;
let lastAcceleration = null;
let shakeCount = 0;
let shakeSamples = [];
const SHAKE_SAMPLE_SIZE = 5;

// Конфигурация - ОСНОВНЫЕ ИЗМЕНЕНИЯ ДЛЯ 3-5 ТРЯСОК
const CONFIG = {
  shakeThreshold: 15,   // УВЕЛИЧИЛИ порог силы встряхивания
  shakeTimeout: 500,    // Время между встряхиваниями (мс)
  progressPerShake: 25, // УВЕЛИЧИЛИ для 4 трясок (100/4 = 25)
  decayRate: 1.5,       // УВЕЛИЧИЛИ скорость уменьшения прогресса
  minProgressForShaking2: 25, // УМЕНЬШИЛИ минимальный прогресс для shaking2.png
  minShakeInterval: 200,      // Минимальный интервал между встряхиваниями
  maxShakeSamples: 10,        // Максимальное количество образцов для усреднения
  stabilityThreshold: 2.0,    // Порог стабильности
  targetShakes: 4,            // Целевое количество трясок
  progressDecayDelay: 2000,   // Задержка перед началом уменьшения прогресса (2 сек)
  timeBetweenShakes: 500      // Максимальное время между трясками для сохранения прогресса
};

// Счетчик для отслеживания времени без тряски
let lastProgressTime = Date.now();
let shakeDurations = [];

// Анимация встряхивания руки
function animateHandShake() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  // Останавливаем текущую анимацию
  gsap.killTweensOf(hand);

  // Анимация встряхивания
  gsap.fromTo(hand,
    { 
      rotation: -15,
      x: -10,
      scale: 1.05
    },
    {
      rotation: 15,
      x: 10,
      scale: 0.95,
      duration: 0.08,
      repeat: 5,
      yoyo: true,
      ease: "power1.inOut",
      onComplete: () => {
        // Возвращаем руку в исходное положение
        gsap.to(hand, {
          rotation: 0,
          x: 0,
          scale: 1,
          duration: 0.2,
          ease: "elastic.out(1, 0.5)"
        });
      }
    }
  );
}

// Анимация руки при первом появлении
function animateHandIntro() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  // Сначала скрываем руку
  gsap.set(hand, {
    opacity: 0,
    x: 100,
    rotation: -30
  });

  // Анимация появления
  gsap.to(hand, {
    opacity: 1,
    x: 0,
    rotation: 0,
    duration: 0.8,
    ease: "back.out(1.7)",
    delay: 0.5
  });
}

// Покачивание руки в ожидании
function animateHandIdle() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  // Останавливаем предыдущую анимацию ожидания
  gsap.killTweensOf(hand);

  // Мягкое покачивание
  gsap.to(hand, {
    rotation: 3,
    y: 3,
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
}

// Интенсивная анимация при активном тряске
function animateHandActive() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  gsap.killTweensOf(hand);

  gsap.to(hand, {
    rotation: 8,
    y: 5,
    duration: 0.3,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
  });
}

// Остановка анимации руки
function stopHandAnimation() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  gsap.killTweensOf(hand);
  
  // Плавный возврат к исходному состоянию
  gsap.to(hand, {
    rotation: 0,
    x: 0,
    y: 0,
    scale: 1,
    duration: 0.5,
    ease: "elastic.out(1, 0.5)"
  });
}

// Анимация "совета" - подсказка трясти
function animateHandHint() {
  const hand = document.querySelector('.hand');
  if (!hand) return;

  // Сильная анимация для привлечения внимания
  gsap.fromTo(hand,
    { 
      rotation: -20,
      x: -30
    },
    {
      rotation: 20,
      x: 30,
      duration: 0.5,
      repeat: 1,
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        // Возвращаем к легкому покачиванию
        gsap.to(hand, {
          rotation: 0,
          x: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    }
  );
}

// Обновление анимации руки в зависимости от прогресса
function updateHandAnimation() {
  if (isOpened) return;

  const hand = document.querySelector('.hand');
  if (!hand) return;

  // Останавливаем предыдущие анимации
  gsap.killTweensOf(hand);

  if (progress < 25) {
    // Мало прогресса - показываем подсказку если давно не трясли
    if (Date.now() - lastShakeTime > 3000) {
      animateHandHint();
    } else {
      animateHandIdle();
    }
  } else if (progress < 50) {
    // Средний прогресс - активная анимация
    gsap.to(hand, {
      rotation: 5,
      scale: 1.05,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });
  } else if (progress < 75) {
    // Больше половины - интенсивная анимация
    gsap.to(hand, {
      rotation: 10,
      y: 8,
      scale: 1.1,
      duration: 0.3,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });
  } else {
    // Почти готово - предвкушающая анимация
    gsap.to(hand, {
      rotation: 15,
      y: 10,
      scale: 1.15,
      duration: 0.2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });
  }
}

// Инициализация
function init() {
  chest.src = frames[0];
  progressBar.style.width = "0%";
  
  // Анимация появления руки
  animateHandIntro();
  
  // Через секунду начинаем покачивание
  setTimeout(() => {
    animateHandIdle();
  }, 1500);

  // Запускаем автоуменьшение прогресса
  startProgressDecay();

  // Запускаем детектор встряхивания
  if (window.DeviceMotionEvent) {
    requestMotionPermission();
  } else {
    console.warn("DeviceMotion не поддерживается в этом браузере");
    setupClickFallback();
  }
}

// Запрос разрешения на доступ к акселерометру
async function requestMotionPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        console.log("Разрешение на доступ к акселерометру получено");
        startShakeDetection();
      } else {
        console.warn("Разрешение на доступ к акселерометру отклонено");
        setupClickFallback();
      }
    } catch (error) {
      console.error("Ошибка при запросе разрешения:", error);
      setupClickFallback();
    }
  } else {
    startShakeDetection();
  }
}

// Улучшенный детектор встряхивания
function startShakeDetection() {
  let lastUpdate = 0;
  const updateInterval = 100;

  window.addEventListener('devicemotion', (event) => {
    const now = Date.now();
    if (now - lastUpdate < updateInterval) return;
    lastUpdate = now;

    const acceleration = event.accelerationIncludingGravity ||
      event.acceleration ||
      { x: 0, y: 0, z: 0 };

    if (acceleration.x === null || acceleration.y === null || acceleration.z === null) {
      return;
    }

    if (!lastAcceleration) {
      lastAcceleration = {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0
      };
      return;
    }

    const delta = {
      x: Math.abs(acceleration.x - lastAcceleration.x),
      y: Math.abs(acceleration.y - lastAcceleration.y),
      z: Math.abs(acceleration.z - lastAcceleration.z)
    };

    const totalDelta = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z);
    const currentMagnitude = Math.sqrt(
      acceleration.x * acceleration.x +
      acceleration.y * acceleration.y +
      acceleration.z * acceleration.z
    );

    shakeSamples.push(totalDelta);
    if (shakeSamples.length > SHAKE_SAMPLE_SIZE) {
      shakeSamples.shift();
    }

    const averageDelta = shakeSamples.length > 0 ?
      shakeSamples.reduce((a, b) => a + b, 0) / shakeSamples.length : 0;

    if (totalDelta > CONFIG.shakeThreshold &&
      averageDelta > CONFIG.shakeThreshold * 0.7 &&
      currentMagnitude > CONFIG.stabilityThreshold) {
      handleShake();
    }

    lastAcceleration = {
      x: acceleration.x || 0,
      y: acceleration.y || 0,
      z: acceleration.z || 0
    };
  });

  console.log("Детектор встряхивания запущен");
}

// Обработка встряхивания
function handleShake() {
  const currentTime = Date.now();

  if (currentTime - lastShakeTime < CONFIG.minShakeInterval) {
    return;
  }

  // Сохраняем время между трясками
  if (lastShakeTime > 0) {
    const duration = currentTime - lastShakeTime;
    shakeDurations.push(duration);
    if (shakeDurations.length > 5) {
      shakeDurations.shift();
    }
  }

  lastShakeTime = currentTime;
  lastProgressTime = currentTime; // Сбрасываем таймер уменьшения
  shakeCount++;

  console.log(`Встряхивание #${shakeCount} обнаружено! Прогресс: ${progress + CONFIG.progressPerShake}%`);

  // Визуальная обратная связь
  flashScreen();
  
  // Анимация руки
  animateHandShake();

  // Увеличиваем прогресс
  updateProgress(CONFIG.progressPerShake);
  
  // Обновляем анимацию руки
  updateHandAnimation();

  // Показываем подсказку сколько осталось
  showRemainingShakes();
}

// Мигание экрана при встряхивании
function flashScreen() {
  gsap.fromTo(document.body,
    { backgroundColor: 'rgba(255, 255, 0, 0.1)' },
    {
      backgroundColor: 'rgba(255, 255, 0, 0)',
      duration: 0.3,
      ease: "power2.out"
    }
  );
}

// Обновление прогресса
function updateProgress(increment) {
  if (isOpened) return;

  progress = Math.min(progress + increment, 100);
  lastProgressTime = Date.now();

  // Анимация прогресс-бара
  gsap.to(progressBar, {
    width: `${progress}%`,
    duration: 0.3,
    ease: "power2.out",
    onUpdate: function () {
      updateChestImage();
    }
  });

  // Если достигли 100%, открываем сундук
  if (progress >= 100 && !isOpened) {
    openChest();
  }
}

// Обновление картинки сундука
function updateChestImage() {
  if (isOpened) return;

  if (progress < CONFIG.minProgressForShaking2) {
    if (chest.src !== frames[0]) {
      chest.src = frames[0];
      isShaking = false;
    }
  } else if (progress < 100) {
    if (chest.src !== frames[1]) {
      chest.src = frames[1];
      isShaking = true;
    }

    if (Date.now() - lastShakeTime < 500) {
      animateShaking();
    }
  }
}

// Анимация встряхивания сундука
function animateShaking() {
  if (isOpened) return;

  gsap.killTweensOf(chest);

  gsap.fromTo(chest,
    { x: -5, rotation: -2 },
    {
      x: 5,
      rotation: 2,
      duration: 0.08,
      repeat: 3,
      yoyo: true,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.to(chest, { x: 0, rotation: 0, duration: 0.1 });
        isShaking = false;
      }
    }
  );
}

// Открытие сундука
function openChest() {
  isOpened = true;
  chest.src = frames[2];

  console.log(`Сундук открыт! Потребовалось ${shakeCount} встряхиваний`);

  // Останавливаем анимации руки
  stopHandAnimation();
  
  // Удаляем подсказку оставшихся трясок
  const shakeHint = document.getElementById('shake-hint');
  if (shakeHint) shakeHint.remove();

  // Анимация руки при открытии
  const hand = document.querySelector('.hand');
  if (hand) {
    gsap.to(hand, {
      rotation: 25,
      x: 50,
      scale: 1.2,
      duration: 0.7,
      ease: "back.out(1.7)",
      onComplete: () => {
        gsap.to(hand, {
          rotation: 0,
          x: 0,
          scale: 1,
          duration: 1,
          ease: "elastic.out(1, 0.5)",
          delay: 0.5
        });
      }
    });
  }

  // Анимация прогресс-бара
  gsap.to("#progress-bar", {
    background: "linear-gradient(90deg, #FFD700, #FF8C00, #FF4500)",
    duration: 0.3,
    ease: "power2.out"
  });

  // Вибрация
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }

  // Анимация открытия сундука
  gsap.to(chest, {
    scale: 1.15,
    duration: 0.5,
    yoyo: true,
    repeat: 1,
    ease: "power2.inOut"
  });

  gsap.fromTo(chest,
    { filter: "brightness(1) drop-shadow(0 0 0px gold)" },
    {
      filter: "brightness(1.3) drop-shadow(0 0 20px gold)",
      duration: 0.5,
      repeat: 1,
      yoyo: true
    }
  );

  // Анимация исчезновения прогресс-бара
  gsap.to("#progress-container", {
    opacity: 0,
    scale: 0.8,
    duration: 0.7,
    ease: "power2.inOut",
    delay: 0.3,
    onComplete: function () {
      document.getElementById("progress-container").style.display = "none";
    }
  });

  // Отключаем автоуменьшение прогресса
  stopProgressDecay();

  // Показываем сообщение об успехе
  showSuccessMessage();
}

// Показываем сообщение об успехе
function showSuccessMessage() {
  const successMessage = document.createElement('div');
  successMessage.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 140, 0, 0.95));
      color: #000;
      padding: 30px 40px;
      border-radius: 20px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 24px;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border: 3px solid #fff;
    ">
      🎉 Сундук открыт! 🎉<br>
      <div style="font-size: 16px; margin-top: 10px; color: #333">
        Вы потрясли устройство всего ${shakeCount} раз!
      </div>
      <div style="font-size: 14px; margin-top: 5px; color: #555">
        Отличный результат!
      </div>
    </div>
  `;
  
  document.querySelector('main').appendChild(successMessage.firstElementChild);
  
  gsap.from(successMessage.firstElementChild, {
    scale: 0,
    opacity: 0,
    duration: 0.5,
    ease: "back.out(1.7)"
  });
}

// Показываем подсказку сколько осталось трясок
function showRemainingShakes() {
  const remainingShakes = Math.ceil((100 - progress) / CONFIG.progressPerShake);
  
  let shakeHint = document.getElementById('shake-hint');
  
  if (!shakeHint) {
    shakeHint = document.createElement('div');
    shakeHint.id = 'shake-hint';
    shakeHint.style.cssText = `
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
      border: 1px solid #ffc700;
    `;
    document.querySelector('main').appendChild(shakeHint);
  }
  
  if (remainingShakes > 0 && !isOpened) {
    shakeHint.textContent = `Осталось трясок: ${remainingShakes}`;
    shakeHint.style.display = 'block';
    
    // Исчезает через 2 секунды
    setTimeout(() => {
      if (shakeHint && !isOpened) {
        gsap.to(shakeHint, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            if (shakeHint) shakeHint.style.display = 'none';
          }
        });
      }
    }, 2000);
  } else if (shakeHint) {
    shakeHint.remove();
  }
}

// Автоматическое уменьшение прогресса
let decayInterval;

function startProgressDecay() {
  decayInterval = setInterval(() => {
    if (progress > 0 && !isOpened) {
      const currentTime = Date.now();
      const timeSinceLastProgress = currentTime - lastProgressTime;
      
      // Начинаем уменьшать прогресс только если прошло больше 2 секунд без тряски
      if (timeSinceLastProgress > CONFIG.progressDecayDelay) {
        const oldProgress = progress;
        progress = Math.max(progress - CONFIG.decayRate, 0);

        gsap.to(progressBar, {
          width: `${progress}%`,
          duration: 0.5,
          ease: "power1.out",
          onUpdate: () => {
            if (progress < CONFIG.minProgressForShaking2 && oldProgress >= CONFIG.minProgressForShaking2) {
              chest.src = frames[0];
              isShaking = false;
              updateHandAnimation();
            }
          }
        });
        
        // Если прогресс упал до 0, сбрасываем счетчик трясок
        if (progress === 0) {
          shakeCount = 0;
          shakeDurations = [];
        }
      }
    }
  }, 1000);
}

function stopProgressDecay() {
  if (decayInterval) {
    clearInterval(decayInterval);
  }
}

// Альтернатива для тестирования на ПК
function setupClickFallback() {
  console.log("Используется клик-режим для тестирования на ПК");

  const instruction = document.createElement('div');
  instruction.innerHTML = `
    <div style="
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 10px;
      text-align: center;
      font-family: Arial, sans-serif;
      z-index: 1000;
    ">
      <p>Кликайте по экрану для эмуляции встряхивания</p>
      <p style="font-size: 12px; margin-top: 5px; color: #ffc700">
        Цель: 3-5 кликов для открытия сундука
      </p>
    </div>
  `;
  document.querySelector('main').appendChild(instruction);

  // Обработчик кликов для тестирования
  document.addEventListener('click', handleClickForShake);
}

let clickCount = 0;

function handleClickForShake(e) {
  if (isOpened) return;

  if (e.target.closest('div[style*="bottom: 20px"]')) {
    return;
  }

  clickCount++;
  
  // Эмулируем handleShake
  handleShake();
  
  // Визуальная обратная связь для клика
  gsap.fromTo(document.body,
    { backgroundColor: 'rgba(255, 100, 0, 0.1)' },
    {
      backgroundColor: 'rgba(255, 100, 0, 0)',
      duration: 0.2,
      ease: "power2.out"
    }
  );
}

// Для отладки в консоли
window.debugProgress = function (amount = 25) {
  updateProgress(amount);
  updateHandAnimation();
  showRemainingShakes();
};

window.resetProgress = function () {
  progress = 0;
  isOpened = false;
  chest.src = frames[0];
  progressBar.style.width = '0%';
  shakeCount = 0;
  clickCount = 0;
  shakeSamples = [];
  shakeDurations = [];
  lastAcceleration = null;
  lastProgressTime = Date.now();
  console.log("Прогресс сброшен");
  
  // Удаляем подсказки
  const shakeHint = document.getElementById('shake-hint');
  if (shakeHint) shakeHint.remove();
  
  const successMsg = document.querySelector('div[style*="background: linear-gradient(135deg, rgba(255, 215, 0, 0.95)"]');
  if (successMsg) successMsg.remove();
  
  // Восстанавливаем прогресс-бар
  const progressContainer = document.getElementById("progress-container");
  if (progressContainer) {
    progressContainer.style.display = "block";
    progressContainer.style.opacity = "1";
    progressContainer.style.transform = "translateX(-50%) scale(1)";
  }

  // Восстанавливаем анимацию руки
  stopHandAnimation();
  setTimeout(() => {
    animateHandIdle();
  }, 500);
  
  // Перезапускаем детектор
  if (window.DeviceMotionEvent) {
    startShakeDetection();
  }
  
  // Перезапускаем автоуменьшение
  startProgressDecay();
};

window.getShakeStats = function () {
  const remainingShakes = Math.ceil((100 - progress) / CONFIG.progressPerShake);
  return {
    progress,
    shakeCount,
    remainingShakes,
    lastShakeTime,
    shakeSamples,
    isOpened,
    requiredShakes: CONFIG.targetShakes,
    progressPerShake: CONFIG.progressPerShake
  };
};

// Показываем подсказку при старте
setTimeout(() => {
  if (progress === 0 && !isOpened) {
    showRemainingShakes();
  }
}, 2000);
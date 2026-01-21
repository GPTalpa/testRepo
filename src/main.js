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

// Конфигурация
const CONFIG = {
  shakeThreshold: 15,   // УВЕЛИЧИЛИ порог силы встряхивания
  shakeTimeout: 500,    // Время между встряхиваниями (мс)
  progressPerShake: 5,  // УМЕНЬШИЛИ прогресс за одно встряхивание
  decayRate: 0.5,       // Скорость уменьшения прогресса (% в секунду)
  minProgressForShaking2: 30, // Минимальный прогресс для показа shaking2.png
  minShakeInterval: 300,      // Минимальный интервал между встряхиваниями
  maxShakeSamples: 10,        // Максимальное количество образцов для усреднения
  stabilityThreshold: 2.0     // Порог стабильности (ниже этого - телефон лежит)
};

// Инициализация
function init() {
  chest.src = frames[0];
  progressBar.style.width = "0%";
  
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

// Запрос разрешения на доступ к акселерометру (особенно важно для iOS)
async function requestMotionPermission() {
  // Проверяем, нужны ли разрешения (iOS 13+)
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
    // Для Android и других браузеров
    startShakeDetection();
  }
}

// Улучшенный детектор встряхивания
function startShakeDetection() {
  let lastUpdate = 0;
  const updateInterval = 100; // Проверяем каждые 100мс
  
  window.addEventListener('devicemotion', (event) => {
    const now = Date.now();
    if (now - lastUpdate < updateInterval) return;
    lastUpdate = now;
    
    const acceleration = event.accelerationIncludingGravity || 
                        event.acceleration || 
                        { x: 0, y: 0, z: 0 };
    
    // Пропускаем, если данные неполные
    if (acceleration.x === null || acceleration.y === null || acceleration.z === null) {
      return;
    }
    
    // Инициализируем lastAcceleration при первом вызове
    if (!lastAcceleration) {
      lastAcceleration = {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0
      };
      return;
    }
    
    // Рассчитываем изменение ускорения
    const delta = {
      x: Math.abs(acceleration.x - lastAcceleration.x),
      y: Math.abs(acceleration.y - lastAcceleration.y),
      z: Math.abs(acceleration.z - lastAcceleration.z)
    };
    
    // Векторная норма изменения ускорения (более точная, чем сумма)
    const totalDelta = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z);
    
    // Норма текущего ускорения (для фильтрации стабильных состояний)
    const currentMagnitude = Math.sqrt(
      acceleration.x * acceleration.x + 
      acceleration.y * acceleration.y + 
      acceleration.z * acceleration.z
    );
    
    // Добавляем образец в историю
    shakeSamples.push(totalDelta);
    if (shakeSamples.length > SHAKE_SAMPLE_SIZE) {
      shakeSamples.shift();
    }
    
    // Вычисляем среднее значение из последних образцов
    const averageDelta = shakeSamples.length > 0 ? 
      shakeSamples.reduce((a, b) => a + b, 0) / shakeSamples.length : 0;
    
    // Для отладки - выводим в консоль
    console.log(`Delta: ${totalDelta.toFixed(2)}, Avg: ${averageDelta.toFixed(2)}, Threshold: ${CONFIG.shakeThreshold}`);
    
    // Проверяем условия для встряхивания:
    // 1. Текущее изменение выше порога
    // 2. Среднее изменение тоже выше порога (чтобы исключить одиночные скачки)
    // 3. Телефон не в стабильном положении (величина ускорения не слишком мала)
    if (totalDelta > CONFIG.shakeThreshold && 
        averageDelta > CONFIG.shakeThreshold * 0.7 &&
        currentMagnitude > CONFIG.stabilityThreshold) {
      handleShake();
    }
    
    // Сохраняем текущие значения для следующего сравнения
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
  
  // Проверяем, не слишком ли часто трясём
  if (currentTime - lastShakeTime < CONFIG.minShakeInterval) {
    return;
  }
  
  lastShakeTime = currentTime;
  shakeCount++;
  
  console.log(`Встряхивание #${shakeCount} обнаружено!`);
  
  // Визуальная обратная связь
  flashScreen();
  
  // Увеличиваем прогресс
  updateProgress(CONFIG.progressPerShake);
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
  
  const oldProgress = progress;
  progress = Math.min(progress + increment, 100);
  
  // Анимация прогресс-бара
  gsap.to(progressBar, {
    width: `${progress}%`,
    duration: 0.3,
    ease: "power2.out",
    onUpdate: function() {
      // Обновляем картинку сундука в зависимости от прогресса
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
      chest.src = frames[0]; // shaking1.png
      isShaking = false;
    }
  } else if (progress < 100) {
    if (chest.src !== frames[1]) {
      chest.src = frames[1]; // shaking2.png
      isShaking = true;
    }
    
    // Добавляем анимацию встряхивания только если недавно было встряхивание
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
  chest.src = frames[2]; // shaking3.png
  
  console.log("Сундук открыт!");
  
  // Анимация открытия
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
  
  // Отключаем автоуменьшение прогресса
  stopProgressDecay();
  
  // Показываем сообщение об успехе
  showSuccessMessage();
  
  // Останавливаем детектор встряхивания
  window.removeEventListener('devicemotion', handleDeviceMotion);
}

// Обработчик для удаления события
function handleDeviceMotion() {
  // Пустая функция для удаления события
}

// Автоматическое уменьшение прогресса
let decayInterval;

function startProgressDecay() {
  decayInterval = setInterval(() => {
    if (progress > 0 && !isOpened) {
      const oldProgress = progress;
      progress = Math.max(progress - CONFIG.decayRate, 0);
      
      gsap.to(progressBar, {
        width: `${progress}%`,
        duration: 0.5,
        ease: "power1.out",
        onUpdate: () => {
          // Если прогресс упал ниже порога, возвращаем первую картинку
          if (progress < CONFIG.minProgressForShaking2 && oldProgress >= CONFIG.minProgressForShaking2) {
            chest.src = frames[0];
            isShaking = false;
          }
        }
      });
    }
  }, 1000);
}

function stopProgressDecay() {
  if (decayInterval) {
    clearInterval(decayInterval);
  }
}

// Показ сообщения об успехе
function showSuccessMessage() {
  const message = document.createElement('div');
  message.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: gold;
      padding: 20px;
      border-radius: 15px;
      text-align: center;
      font-family: Arial, sans-serif;
      z-index: 1000;
    ">
      <h2>🎉 Сундук открыт! 🎉</h2>
      <p>Вы сделали ${shakeCount} встряхиваний</p>
    </div>
  `;
  document.querySelector('main').appendChild(message);
  
  // Автоматическое скрытие сообщения
  setTimeout(() => {
    message.style.opacity = '0';
    setTimeout(() => message.remove(), 1000);
  }, 3000);
}

// Альтернатива для тестирования на ПК
function setupClickFallback() {
  console.log("Используется клик-режим для тестирования на ПК");
  
  // Добавляем инструкцию
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
      <p>Для тестирования: кликайте по экрану (на мобильном - встряхивайте устройство)</p>
    </div>
  `;
  document.querySelector('main').appendChild(instruction);
  
  // Обработчик кликов для тестирования
  document.addEventListener('click', handleClickForShake);
}

let clickCount = 0;

function handleClickForShake(e) {
  if (isOpened) return;
  
  // Проверяем, чтобы клик был не на самой инструкции
  if (e.target.closest('div[style*="bottom: 20px"]')) {
    return;
  }
  
  clickCount++;
  console.log(`Клик #${clickCount} (эмуляция встряхивания)`);
  
  // Эмулируем встряхивание при клике
  const currentTime = Date.now();
  if (currentTime - lastShakeTime < CONFIG.minShakeInterval) {
    return;
  }
  
  lastShakeTime = currentTime;
  shakeCount++;
  
  // Визуальная обратная связь для клика
  gsap.fromTo(e.target,
    { scale: 1 },
    { 
      scale: 0.95, 
      duration: 0.1, 
      yoyo: true, 
      repeat: 1,
      ease: "power2.out"
    }
  );
  
  // Увеличиваем прогресс
  updateProgress(CONFIG.progressPerShake);
}

// Для отладки в консоли
window.debugProgress = function(amount = 10) {
  updateProgress(amount);
};

window.resetProgress = function() {
  progress = 0;
  isOpened = false;
  chest.src = frames[0];
  progressBar.style.width = '0%';
  shakeCount = 0;
  shakeSamples = [];
  lastAcceleration = null;
  console.log("Прогресс сброшен");
  
  // Перезапускаем детектор
  if (window.DeviceMotionEvent) {
    startShakeDetection();
  }
};

window.getShakeStats = function() {
  return {
    progress,
    shakeCount,
    lastShakeTime,
    shakeSamples,
    isOpened
  };
};
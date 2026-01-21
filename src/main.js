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
});

let progress = 0;
let isOpened = false;
let isShaking = false;
let lastShakeTime = 0;
let lastAcceleration = { x: 0, y: 0, z: 0 };
let shakeCount = 0;

// Конфигурация
const CONFIG = {
  shakeThreshold: 3.5, // Порог силы встряхивания
  shakeTimeout: 400,   // Время между встряхиваниями (мс)
  progressPerShake: 8, // Прогресс за одно встряхивание (%)
  decayRate: 0.3,      // Скорость уменьшения прогресса (% в секунду)
  minProgressForShaking2: 30 // Минимальный прогресс для показа shaking2.png
};

// Инициализация
function init() {
  chest.src = frames[0];
  progressBar.style.width = "0%";
  
  // Запускаем автоуменьшение прогресса
  startProgressDecay();
  
  // Запускаем детектор встряхивания
  if (window.DeviceMotionEvent) {
    startShakeDetection();
  } else {
    console.warn("DeviceMotion не поддерживается в этом браузере");
    // Альтернатива для тестирования на ПК
    setupClickFallback();
  }
}

// Собственная реализация детектора встряхивания
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
    
    // Рассчитываем изменение ускорения
    const delta = {
      x: Math.abs(acceleration.x - lastAcceleration.x),
      y: Math.abs(acceleration.y - lastAcceleration.y),
      z: Math.abs(acceleration.z - lastAcceleration.z)
    };
    
    // Суммарное изменение по всем осям
    const totalDelta = delta.x + delta.y + delta.z;
    
    // Для отладки - выводим в консоль
    console.log(`[${new Date().toLocaleTimeString()}] acc x:${acceleration.x.toFixed(2)} y:${acceleration.y.toFixed(2)} z:${acceleration.z.toFixed(2)} delta:${totalDelta.toFixed(2)}`);
    
    // Проверяем, достаточно ли сильное встряхивание
    if (totalDelta > CONFIG.shakeThreshold) {
      handleShake();
    }
    
    // Сохраняем текущие значения для следующего сравнения
    lastAcceleration = {
      x: acceleration.x || 0,
      y: acceleration.y || 0,
      z: acceleration.z || 0
    };
  });
}

// Обработка встряхивания
function handleShake() {
  const currentTime = Date.now();
  
  // Проверяем, не слишком ли часто трясём
  if (currentTime - lastShakeTime < CONFIG.shakeTimeout) {
    return;
  }
  
  lastShakeTime = currentTime;
  shakeCount++;
  
  console.log(`Встряхивание #${shakeCount} обнаружено!`);
  
  // Увеличиваем прогресс
  updateProgress(CONFIG.progressPerShake);
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
    chest.src = frames[0]; // shaking1.png
    isShaking = false;
  } else if (progress < 100) {
    chest.src = frames[1]; // shaking2.png
    
    // Добавляем анимацию встряхивания только если недавно было встряхивание
    if (Date.now() - lastShakeTime < 500 && !isShaking) {
      isShaking = true;
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
  
  let clickCount = 0;
  document.addEventListener('click', (e) => {
    if (isOpened) return;
    
    clickCount++;
    console.log(`Клик #${clickCount} (эмуляция встряхивания)`);
    
    // Эмулируем встряхивание при клике
    handleShake();
    
    // Визуальная обратная связь
    gsap.fromTo(document.body,
      { backgroundColor: '#ffffff' },
      { backgroundColor: '#f0f0f0', duration: 0.1, yoyo: true, repeat: 1 }
    );
  });
  
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);

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
  console.log("Прогресс сброшен");
};
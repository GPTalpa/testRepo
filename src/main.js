// Обновите конфигурацию в начале файла
const CONFIG = {
  shakeThreshold: 15,   // Порог силы встряхивания
  shakeTimeout: 500,    // Время между встряхиваниями (мс)
  progressPerShake: 4,  // УМЕНЬШИЛИ для увеличения времени
  decayRate: 0.3,       // УМЕНЬШИЛИ скорость уменьшения прогресса
  minProgressForShaking2: 20, // Минимальный прогресс для показа shaking2.png
  minShakeInterval: 250,      // Минимальный интервал между встряхиваниями
  maxShakeSamples: 10,        // Максимальное количество образцов для усреднения
  stabilityThreshold: 2.0,    // Порог стабильности
  targetShakeDuration: 2600,  // Целевое время тряски в миллисекундах (2.6 секунды)
  targetShakesPerSecond: 3.5  // Целевая частота встряхиваний в секунду
};

// Добавьте новую функцию для расчета прогресса
function calculateRequiredProgress() {
  // Рассчитываем сколько встряхиваний нужно
  const requiredShakes = Math.ceil(CONFIG.targetShakeDuration / 1000 * CONFIG.targetShakesPerSecond);
  
  // Рассчитываем прогресс на одно встряхивание
  return Math.ceil(100 / requiredShakes);
}

// Обновите CONFIG.progressPerShake на основе расчета
CONFIG.progressPerShake = calculateRequiredProgress();

// Добавьте счетчик времени
let startTime = null;
let totalShakeTime = 0;
let shakeDurations = [];

// Обновите функцию handleShake
function handleShake() {
  const currentTime = Date.now();

  // Проверяем, не слишком ли часто трясём
  if (currentTime - lastShakeTime < CONFIG.minShakeInterval) {
    return;
  }

  // Запускаем таймер при первом встряхивании
  if (!startTime) {
    startTime = currentTime;
    showTimeEstimate();
  }

  // Рассчитываем время между встряхиваниями
  if (lastShakeTime > 0) {
    const shakeInterval = currentTime - lastShakeTime;
    shakeDurations.push(shakeInterval);
    
    // Держим только последние 5 значений
    if (shakeDurations.length > 5) {
      shakeDurations.shift();
    }
  }

  lastShakeTime = currentTime;
  shakeCount++;

  console.log(`Встряхивание #${shakeCount} обнаружено! Прогресс: ${progress + CONFIG.progressPerShake}%`);

  // Визуальная обратная связь
  flashScreen();

  // Увеличиваем прогресс
  updateProgress(CONFIG.progressPerShake);

  // Обновляем оценку времени
  updateTimeEstimate();
}

// Добавьте функцию для показа оценки времени
function showTimeEstimate() {
  // Создаем элемент для отображения времени
  let timeDisplay = document.getElementById('time-estimate');
  
  if (!timeDisplay) {
    timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-estimate';
    timeDisplay.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    `;
    document.querySelector('main').appendChild(timeDisplay);
  }
  
  timeDisplay.textContent = `Трясите быстрее! Осталось примерно: 2.6с`;
}

// Обновляем оценку времени
function updateTimeEstimate() {
  const timeDisplay = document.getElementById('time-estimate');
  if (!timeDisplay) return;

  // Рассчитываем средний интервал между встряхиваниями
  let avgInterval = 500; // начальное значение
  if (shakeDurations.length > 0) {
    avgInterval = shakeDurations.reduce((a, b) => a + b, 0) / shakeDurations.length;
  }

  // Рассчитываем сколько встряхиваний осталось
  const remainingProgress = 100 - progress;
  const remainingShakes = Math.ceil(remainingProgress / CONFIG.progressPerShake);
  
  // Рассчитываем оставшееся время
  const remainingTime = remainingShakes * avgInterval;
  
  // Форматируем время
  const seconds = (remainingTime / 1000).toFixed(1);
  
  if (progress > 0 && progress < 100) {
    timeDisplay.textContent = `Трясите! Осталось примерно: ${seconds}с`;
    timeDisplay.style.background = remainingTime > 2000 ? 'rgba(255, 100, 0, 0.7)' : 'rgba(0, 200, 0, 0.7)';
  }
}

// Обновите функцию openChest, чтобы скрыть таймер
function openChest() {
  isOpened = true;
  
  // Удаляем таймер
  const timeDisplay = document.getElementById('time-estimate');
  if (timeDisplay) {
    timeDisplay.remove();
  }
  
  chest.src = frames[2]; // shaking3.png

  console.log(`Сундук открыт! Потребовалось ${shakeCount} встряхиваний`);

  // Дополнительная анимация прогресс-бара перед исчезновением
  gsap.to("#progress-bar", {
    background: "linear-gradient(90deg, #FFD700, #FF8C00, #FF4500)",
    duration: 0.3,
    ease: "power2.out"
  });

  // Вибрация на мобильных устройствах
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

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

// Обновите функцию resetProgress для сброса таймера
window.resetProgress = function () {
  progress = 0;
  isOpened = false;
  chest.src = frames[0];
  progressBar.style.width = '0%';
  shakeCount = 0;
  shakeSamples = [];
  shakeDurations = [];
  lastAcceleration = null;
  startTime = null;
  
  // Удаляем таймер
  const timeDisplay = document.getElementById('time-estimate');
  if (timeDisplay) {
    timeDisplay.remove();
  }
  
  console.log("Прогресс сброшен");

  // Перезапускаем детектор
  if (window.DeviceMotionEvent) {
    startShakeDetection();
  }
};

// Также обновите функцию setupClickFallback для поддержки таймера
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
      backdrop-filter: blur(5px);
    ">
      <p>Кликайте по экрану для эмуляции встряхивания</p>
      <p style="font-size: 14px; margin-top: 5px; color: #ffc700">
        Цель: 2.6 секунды активного тряски
      </p>
    </div>
  `;
  document.querySelector('main').appendChild(instruction);

  // Показываем таймер
  showTimeEstimate();

  // Обработчик кликов для тестирования
  document.addEventListener('click', handleClickForShake);
}

// Обновите handleClickForShake для обновления таймера
let clickCount = 0;

function handleClickForShake(e) {
  if (isOpened) return;

  // Проверяем, чтобы клик был не на самом инструктивном сообщении
  if (e.target.closest('div[style*="bottom: 20px"]')) {
    return;
  }

  // Эмулируем handleShake для кликов
  handleShake();
  
  // Дополнительная визуальная обратная связь
  gsap.fromTo(document.body,
    { backgroundColor: 'rgba(255, 100, 0, 0.1)' },
    {
      backgroundColor: 'rgba(255, 100, 0, 0)',
      duration: 0.2,
      ease: "power2.out"
    }
  );
}
import "./style.css";
import gsap from "gsap";
import Shake from "shake.js";

const chest = document.getElementById("chest");
const progressBar = document.getElementById("progress-bar");
const frames = ["./shaking1.png", "./shaking2.png", "./shaking3.png"];

let progress = 0;
let isOpened = false;
let isShaking = false;
let lastShakeTime = 0;
const SHAKE_INTERVAL = 200; // Минимальный интервал между встряхиваниями (мс)

// Инициализация - показываем первую картинку
chest.src = frames[0];

// Функция обновления прогресса и картинки сундука
function updateProgress(increment) {
  if (isOpened) return; // Если уже открыт, не обновляем
  
  progress = Math.min(progress + increment, 100);
  progressBar.style.width = progress + "%";
  
  // Обновляем картинку сундука в зависимости от прогресса
  if (progress < 50) {
    chest.src = frames[0]; // shaking1.png
    isShaking = false;
  } else if (progress < 100) {
    chest.src = frames[1]; // shaking2.png
    isShaking = true;
    
    // Анимация встряхивания при среднем прогрессе
    gsap.fromTo(
      chest,
      { x: -3 },
      { 
        x: 3, 
        duration: 0.1, 
        repeat: 4, 
        yoyo: true, 
        ease: "power1.inOut" 
      }
    );
  } else {
    // 100% - открываем сундук
    chest.src = frames[2]; // shaking3.png
    isOpened = true;
    isShaking = false;
    
    // Запускаем анимацию открытия
    animateChest();
    
    // Останавливаем отслеживание встряхивания
    myShakeEvent.stop();
  }
}

// Функция анимации открытия сундука
function animateChest() {
  gsap.fromTo(
    chest,
    { filter: "brightness(2)" },
    { filter: "brightness(1)", duration: 0.25, ease: "power2.out" }
  );
  
  gsap.fromTo(
    chest,
    { filter: "drop-shadow(0 0 20px gold)" },
    { filter: "drop-shadow(0 0 0px gold)", duration: 0.4, ease: "power2.out" }
  );
  
  gsap.to(chest, {
    scale: 1.1,
    duration: 0.5,
    yoyo: true,
    repeat: 1,
    ease: "power2.inOut"
  });
  
  // Добавляем частицы (если нужно)
  // gsap.from(".particle", {
  //   y: 20,
  //   opacity: 0,
  //   duration: 0.6,
  //   stagger: 0.05,
  //   ease: "power2.out"
  // });
}

// Инициализация Shake.js
const myShakeEvent = new Shake({
  threshold: 15,
  timeout: 300
});

myShakeEvent.start();

// Обработчик встряхивания
function shakeEventDidOccur() {
  if (isOpened) return; // Если сундук уже открыт, игнорируем
  
  const currentTime = Date.now();
  if (currentTime - lastShakeTime < SHAKE_INTERVAL) return; // Защита от слишком частых срабатываний
  
  lastShakeTime = currentTime;
  
  // Увеличиваем прогресс на 5% за каждое встряхивание
  updateProgress(5);
  
  // Если начали встряхивать и прогресс между 50-99%, показываем shaking2.png
  if (progress >= 50 && progress < 100 && !isShaking) {
    chest.src = frames[1];
    isShaking = true;
  }
}

// Добавляем обработчик события
window.addEventListener("shake", shakeEventDidOccur, false);

// Автоматическое уменьшение прогресса со временем (опционально)
let decayInterval = setInterval(() => {
  if (progress > 0 && !isOpened) {
    progress = Math.max(progress - 0.5, 0);
    progressBar.style.width = progress + "%";
    
    // Если прогресс упал ниже 50%, возвращаем первую картинку
    if (progress < 50 && isShaking) {
      chest.src = frames[0];
      isShaking = false;
    }
  }
}, 1000);

// Очистка интервала при открытии сундука
if (isOpened) {
  clearInterval(decayInterval);
}

// Для тестирования на ПК - добавляем клик как альтернативу встряхиванию
document.addEventListener("click", () => {
  if (!isOpened) {
    updateProgress(10);
  }
});
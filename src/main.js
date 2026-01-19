import "./style.css";

import gsap from "gsap";
import Shake from "shake.js";

const chest = document.getElementById("chest");
const frames = ["./shaking1.png", "./shaking2.png", "./shaking3.png"];

function animateChest() {
  gsap.to(
    { frame: 0 },
    {
      frame: 2,
      duration: 2,
      ease: "power2.out",
      roundProps: "frame",
      onUpdate: function () {
        chest.src = frames[this.targets()[0].frame];
      },
    },
  );
  gsap.fromTo(
    chest,
    { x: -3 },
    { x: 3, duration: 0.1, repeat: 4, yoyo: true, ease: "power1.inOut" },
  );

  gsap.fromTo(
    chest,
    { filter: "brightness(2)" },
    { filter: "brightness(1)", duration: 0.25, ease: "power2.out" },
  );
  gsap.fromTo(
    chest,
    { filter: "drop-shadow(0 0 20px gold)" },
    { filter: "drop-shadow(0 0 0px gold)", duration: 0.4, ease: "power2.out" },
  );
  gsap.from(".particle", {
    y: 20,
    opacity: 0,
    duration: 0.6,
    stagger: 0.05,
    ease: "power2.out",
  });

  gsap.to(chest, {
    scale: 1.02,
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

document.addEventListener("click", animateChest);

var myShakeEvent = new Shake({
  threshold: 15, // optional shake strength threshold
  timeout: 300, // optional, determines the frequency of event generation
});
console.log(myShakeEvent);

myShakeEvent.start();
window.addEventListener("shake", shakeEventDidOccur, false);

//function to call when shake occurs
function shakeEventDidOccur() {
  //put your own code here etc.
  alert("shake!");
}

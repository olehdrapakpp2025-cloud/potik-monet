/* «Потік монет» — ЛР №10. Ініціалізація JS-плагінів, підключених через CDN:
   1) Swiper.js 11 — слайдер відгуків;
   2) Fancybox v5 — галерея інтерфейсу (лайтбокс);
   3) Typed.js 2 — ефект друкування в hero.
   Усі бібліотеки на чистому JS (без jQuery). Скрипт стоїть у кінці <body>,
   а ініціалізація обгорнута в DOMContentLoaded. */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // Користувач просить менше анімації в налаштуваннях ОС → вимикаємо автоплей і друк.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Swiper.js: відгуки ---------- */
  if (typeof Swiper !== "undefined" && document.querySelector(".reviews-swiper")) {
    new Swiper(".reviews-swiper", {
      loop: true, // після останнього слайда — знову перший
      speed: 600, // тривалість анімації переходу, мс
      spaceBetween: 24,
      slidesPerView: 1, // mobile-first: 1 відгук
      grabCursor: true,
      autoplay: reduceMotion
        ? false
        : {
            delay: 4500, // пауза між автопрогортаннями, мс
            disableOnInteraction: false,
            pauseOnMouseEnter: true, // зупинка, поки курсор над відгуком
          },
      pagination: {
        el: ".reviews-pagination",
        clickable: true,
      },
      navigation: {
        prevEl: ".reviews-prev",
        nextEl: ".reviews-next",
      },
      keyboard: { enabled: true, onlyInViewport: true }, // стрілки ← → на клавіатурі
      // Брейкпоінти Swiper працюють за принципом min-width (як sm/md у Tailwind-конфігу проєкту)
      breakpoints: {
        561: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
      a11y: {
        enabled: true,
        prevSlideMessage: "Попередній відгук",
        nextSlideMessage: "Наступний відгук",
        paginationBulletMessage: "Перейти до відгуку {{index}}",
        slideLabelMessage: "Відгук {{index}} з {{slidesLength}}",
        containerRoleDescriptionMessage: "карусель відгуків",
      },
    });
  }

  /* ---------- 2. Fancybox v5: галерея ---------- */
  if (typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox="potik-gallery"]', {
      Carousel: {
        transition: "fade", // плавне згасання між знімками
      },
      Images: {
        zoom: true, // збільшення кліком, колесом миші або жестом «щипок»
      },
      Thumbs: {
        type: "classic", // стрічка мініатюр унизу
      },
      Toolbar: {
        display: {
          left: ["infobar"], // «2 / 6»
          middle: ["zoomIn", "zoomOut", "toggle1to1"],
          right: ["slideshow", "thumbs", "close"],
        },
      },
      l10n: {
        CLOSE: "Закрити",
        NEXT: "Наступне фото",
        PREV: "Попереднє фото",
        MODAL: "Закрити вікно можна клавішею Esc",
        ERROR: "Не вдалося завантажити. Спробуйте пізніше",
        IMAGE_ERROR: "Зображення не знайдено",
        TOGGLE_ZOOM: "Змінити масштаб",
        TOGGLE1TO1: "Масштаб 1:1",
        TOGGLE_THUMBS: "Показати мініатюри",
        TOGGLE_SLIDESHOW: "Слайд-шоу",
        TOGGLE_FULLSCREEN: "На весь екран",
        ZOOMIN: "Збільшити",
        ZOOMOUT: "Зменшити",
        ITERATEZOOM: "Змінити масштаб",
        GOTO: "Перейти до фото %d",
      },
    });
  }

  /* ---------- 3. Typed.js: «Відкладай на …» ---------- */
  const typedTarget = document.getElementById("typed-goal");
  if (typeof Typed !== "undefined" && typedTarget && !reduceMotion) {
    typedTarget.textContent = ""; // статичний текст лишається для відключеного JS і reduced motion
    new Typed("#typed-goal", {
      strings: ["відпустку мрії", "новий ноутбук", "подушку безпеки", "навчання"],
      typeSpeed: 55, // швидкість друку, мс на символ
      backSpeed: 30, // швидкість стирання
      backDelay: 1800, // пауза перед стиранням
      startDelay: 400,
      smartBackspace: true, // стирає лише різну частину рядка
      loop: true,
    });
  }
});

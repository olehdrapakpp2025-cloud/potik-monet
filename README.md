# Потік монет

Односторінковий лендинг сервісу розумного планування бюджету із симулятором заощаджень на повзунках.
Навчальний проєкт з курсу «Веб-розробка та дизайн» (НУ «Львівська політехніка», ст. гр. ПП-21, Драпак О.Р.).

## Демо

- GitHub Pages: https://olehdrapakpp2025-cloud.github.io/potik-monet/
- Netlify: https://potikmonet.netlify.app/
- Vercel: https://potik-monet.vercel.app/

## Можливості

- симулятор заощаджень: сума 0–10 000 ₴ і термін 6 / 12 / 24 місяці;
- інформер з офіційними курсами НБУ (USD, EUR, PLN);
- вбудовані відео YouTube і карта Google Maps;
- галерея інтерфейсу (Fancybox v5) і слайдер відгуків (Swiper.js 11), друкований текст у hero (Typed.js);
- форма зворотного зв'язку з клієнтською валідацією (RegEx, +380XXXXXXXXX) і модальним вікном;
- адаптивна верстка від 320 до 1440 px (mobile first), темна тема.

## Технології

- HTML5 (семантична розмітка)
- Tailwind CSS 3 (CDN) + власні стилі в `css/custom.css`
- JavaScript (`js/main.js`, `js/validation.js`, `js/plugins.js`)
- Swiper.js 11, Fancybox v5, Typed.js 2 — Vanilla JS-бібліотеки через CDN jsDelivr
- хостинг: GitHub Pages, Netlify і Vercel (автодеплой з гілки main)

## Структура

```
index.html        — сторінка лендингу, підключення Tailwind CDN і tailwind.config
css/custom.css    — стилі, яких немає в Tailwind (повзунок, діаграма, маски)
js/main.js        — симулятор, мобільне меню, інформер курсів НБУ
js/validation.js  — валідація форми зворотного зв'язку, UI-стани, модальне вікно
js/plugins.js     — конфігурація Swiper.js, Fancybox і Typed.js
assets/gallery/   — знімки інтерфейсу для галереї (WebP)
prototype/        — прототип секцій ЛР №10 для StackBlitz
assets/           — логотип, іконки, зображення
netlify.toml      — налаштування Netlify (публікація з кореня, без збірки)
```

## Локальний запуск

Збирати нічого не потрібно: відкрийте `index.html` у браузері або запустіть Live Server у VS Code.

## Історія

- ЛР №5 — семантичний HTML і CSS-каркас
- ЛР №6 — Tailwind CSS, компоненти, адаптивність
- ЛР №7 — повноцінний лендинг: відео, карта, інформер
- ЛР №8 — Git, GitHub, деплой на GitHub Pages і Netlify
- ЛР №9 — форма зворотного зв'язку, валідація RegEx + JavaScript, деплой на Vercel
- ЛР №10 — Swiper.js, Fancybox, Typed.js через CDN; прототип у StackBlitz
- Автор: Драпак О.Р., ст. гр. ПП-21

/* «Потік монет» — ЛР №11. Інтерактивний віджет «Калькулятор фінансової цілі».
   Захисне програмування (Defensive Programming):
   1) HTML: type="number", min / max / step / required, inputmode;
   2) JS: кожне значення перевіряється перед розрахунком (порожнє, NaN, Infinity, межі, дроби),
      select-и — лише зі «білого списку», кількість місяців обмежена (не більше 50 років);
   3) безпечне виведення: лише textContent, без innerHTML;
   4) ізоляція: увесь код у функції, жодних глобальних змінних; віджет ініціалізується
      для кожного [data-goal-widget] окремо; відсутній DOM-елемент не «валить» сторінку. */

(() => {
  "use strict";

  const LIMITS = {
    "goal-amount": { min: 1000, max: 1000000, label: "Вартість цілі" },
    "goal-saved": { min: 0, max: 1000000, label: "Відкладена сума" },
    "goal-monthly": { min: 100, max: 200000, label: "Щомісячний внесок" },
  };
  const RATES = new Set(["8", "10", "12", "14"]); // % річних — лише значення зі списку
  const GOALS = { vacation: 30000, laptop: 45000, cushion: 60000, education: 25000, custom: null };
  const TAX = 0.23; // 18% ПДФО + 5% військовий збір
  const MAX_MONTHS = 600; // 50 років — далі прогноз втрачає сенс

  const REQUIRED_IDS = [
    "goal-form", "goal-type", "goal-amount", "goal-saved", "goal-monthly", "goal-deposit", "goal-rate",
    "goal-months", "goal-date", "goal-contrib", "goal-interest", "goal-total", "goal-tip",
    "goal-progress", "goal-progress-bar", "goal-progress-text",
  ];

  const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
  const uah = (n) => `${money.format(Math.round(n))} ₴`;
  // «у лютому 2028»: місяць у місцевому відмінку (Intl дає лише називний — «лютий»)
  const MONTHS_LOCATIVE = ["січні", "лютому", "березні", "квітні", "травні", "червні", "липні", "серпні", "вересні", "жовтні", "листопаді", "грудні"];

  const plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a >= 11 && a <= 14) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  };
  const formatDuration = (months) => {
    const y = Math.floor(months / 12), m = months % 12;
    const parts = [];
    if (y) parts.push(`${y} ${plural(y, "рік", "роки", "років")}`);
    if (m || !y) parts.push(`${m} ${plural(m, "місяць", "місяці", "місяців")}`);
    return parts.join(" ");
  };

  /* ---------- Чисті функції розрахунку (без DOM) ---------- */

  // Скільки місяців до цілі: внесок у кінці місяця, щомісячна капіталізація зі ставкою r.
  function monthsToGoal(goal, saved, monthly, r) {
    const remaining = goal - saved;
    if (remaining <= 0) return 0;
    if (r === 0) return Math.ceil(remaining / monthly);
    // saved·(1+r)^n + monthly·((1+r)^n − 1)/r ≥ goal  ⇒  n = log((goal·r + m)/(saved·r + m)) / log(1+r)
    return Math.ceil(Math.log((goal * r + monthly) / (saved * r + monthly)) / Math.log(1 + r));
  }
  function balanceAfter(months, saved, monthly, r) {
    if (r === 0) return saved + monthly * months;
    const k = Math.pow(1 + r, months);
    return saved * k + (monthly * (k - 1)) / r;
  }
  // Внесок, щоб встигнути за 12 місяців
  function monthlyFor12(goal, saved, r) {
    if (r === 0) return Math.ceil((goal - saved) / 12);
    const k = Math.pow(1 + r, 12);
    return Math.ceil(((goal - saved * k) * r) / (k - 1));
  }

  /* ---------- Віджет ---------- */

  function initGoalWidget(root) {
    const el = {};
    for (const id of REQUIRED_IDS) {
      el[id] = root.querySelector(`#${id}`);
      if (!el[id]) {
        // Fail-Safe: віджет вимикається, решта сторінки працює
        console.warn(`Калькулятор цілі: не знайдено елемент #${id}, віджет не ініціалізовано.`);
        return;
      }
    }
    const touched = new Set();

    /* --- UI-стани полів --- */
    const ERROR_CLASSES = ["border-red-500", "ring-2", "ring-red-500/30"];
    function showError(input, message) {
      input.classList.add(...ERROR_CLASSES);
      input.classList.remove("border-white/15");
      input.setAttribute("aria-invalid", "true");
      const box = root.querySelector(`#error-${input.id}`);
      if (!box) return;
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-circle-exclamation mt-1 flex-none";
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = message; // лише textContent — введені дані не стають HTML
      box.replaceChildren(icon, text);
      box.classList.replace("hidden", "flex");
    }
    function clearError(input) {
      input.classList.remove(...ERROR_CLASSES);
      input.classList.add("border-white/15");
      input.setAttribute("aria-invalid", "false");
      const box = root.querySelector(`#error-${input.id}`);
      if (box) {
        box.replaceChildren();
        box.classList.replace("flex", "hidden");
      }
    }

    /* --- Рівень 2: перевірка вхідних даних --- */
    function readNumber(input) {
      const { min, max, label } = LIMITS[input.id];
      const raw = input.value.trim();
      const range = `від ${money.format(min)} до ${money.format(max)} ₴`;
      // badInput: браузер не зміг розібрати введення (наприклад, «12-»), value тоді порожній
      if (input.validity.badInput) return { error: `${label}: введіть число ${range}.` };
      if (raw === "") return { error: `${label}: поле не може бути порожнім. Введіть суму ${range}.` };
      const num = Number(raw);
      if (!Number.isFinite(num)) return { error: `${label}: введіть число ${range}.` };
      if (num < 0) return { error: `${label}: від’ємні значення неможливі. Введіть суму ${range}.` };
      if (num < min) return { error: `${label}: мінімум ${money.format(min)} ₴.` };
      if (num > max) return { error: `${label}: максимум ${money.format(max)} ₴.` };
      return { value: Math.round(num) }; // нормалізація: копійки округлюються до гривні
    }

    function readRate() {
      if (!el["goal-deposit"].checked) return { value: 0 };
      const v = el["goal-rate"].value;
      if (!RATES.has(v)) return { error: "Оберіть ставку зі списку." };
      return { value: (Number(v) / 100) * (1 - TAX) / 12 }; // місячна ставка після податку
    }

    /* --- Виведення результату --- */
    function renderInvalid(message) {
      el["goal-months"].textContent = "—";
      el["goal-date"].textContent = message;
      for (const id of ["goal-contrib", "goal-interest", "goal-total"]) el[id].textContent = "—";
      el["goal-tip"].textContent = "Виправ виділені поля — і розрахунок оновиться автоматично.";
    }
    function renderProgress(goal, saved) {
      const pct = goal > 0 ? Math.min(100, Math.max(0, (saved / goal) * 100)) : 0;
      el["goal-progress-bar"].style.width = `${pct}%`;
      el["goal-progress"].setAttribute("aria-valuenow", String(Math.round(pct)));
      el["goal-progress-text"].textContent = `Відкладено ${Math.round(pct)}% від цілі`;
    }

    function update() {
      const inputs = ["goal-amount", "goal-saved", "goal-monthly"].map((id) => el[id]);
      const values = {};
      let firstError = "";
      for (const input of inputs) {
        const res = readNumber(input);
        if (res.error) {
          firstError ||= res.error;
          if (touched.has(input.id) || input.getAttribute("aria-invalid") === "true") showError(input, res.error);
        } else {
          values[input.id] = res.value;
          clearError(input);
        }
      }
      const rate = readRate();
      if (rate.error) {
        firstError ||= rate.error;
        showError(el["goal-rate"], rate.error);
      } else clearError(el["goal-rate"]);

      if (firstError) {
        renderInvalid("Перевір параметри: є поле з помилкою.");
        if (values["goal-amount"] !== undefined && values["goal-saved"] !== undefined) renderProgress(values["goal-amount"], values["goal-saved"]);
        return;
      }

      const goal = values["goal-amount"], saved = values["goal-saved"], monthly = values["goal-monthly"], r = rate.value;
      renderProgress(goal, saved);

      if (saved >= goal) {
        el["goal-months"].textContent = "Ціль досягнута!";
        el["goal-date"].textContent = `Уже відкладено ${uah(saved)} — це не менше вартості цілі.`;
        el["goal-contrib"].textContent = uah(0);
        el["goal-interest"].textContent = uah(0);
        el["goal-total"].textContent = uah(saved);
        el["goal-tip"].textContent = "Час обрати наступну ціль 🎯";
        return;
      }

      const months = monthsToGoal(goal, saved, monthly, r);
      if (!Number.isFinite(months) || months > MAX_MONTHS) {
        el["goal-months"].textContent = "Понад 50 років";
        el["goal-date"].textContent = "З таким внеском ціль надто далеко. Спробуй збільшити щомісячну суму.";
        for (const id of ["goal-contrib", "goal-interest", "goal-total"]) el[id].textContent = "—";
      } else {
        const total = balanceAfter(months, saved, monthly, r);
        const contrib = monthly * months;
        const interest = Math.max(0, total - saved - contrib);
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() + months);
        el["goal-months"].textContent = formatDuration(months);
        el["goal-date"].textContent = months === 0 ? "Ціль — уже цього місяця" : `Ціль — у ${MONTHS_LOCATIVE[date.getMonth()]} ${date.getFullYear()}`;
        el["goal-contrib"].textContent = uah(contrib);
        el["goal-interest"].textContent = uah(interest);
        el["goal-total"].textContent = uah(total);
      }

      const need = monthlyFor12(goal, saved, r);
      el["goal-tip"].textContent = need <= 0
        ? "Навіть без нових внесків депозит доведе тебе до цілі за рік."
        : `Щоб встигнути за 12 місяців, відкладай ${uah(need)} на місяць.`;
    }

    /* --- Події --- */
    const form = el["goal-form"];
    form.addEventListener("submit", (e) => e.preventDefault()); // Enter у полі не перезавантажує сторінку
    form.addEventListener("input", update); // миттєвий перерахунок під час введення
    form.addEventListener("focusout", (e) => {
      if (e.target.id in LIMITS) {
        touched.add(e.target.id); // помилку під полем показуємо після першої взаємодії
        update();
      }
    });
    el["goal-deposit"].addEventListener("change", () => {
      el["goal-rate"].disabled = !el["goal-deposit"].checked;
      update();
    });
    el["goal-rate"].addEventListener("change", update);
    el["goal-type"].addEventListener("change", () => {
      const type = el["goal-type"].value;
      if (!Object.hasOwn(GOALS, type)) {
        showError(el["goal-type"], "Оберіть ціль зі списку.");
        return;
      }
      clearError(el["goal-type"]);
      if (GOALS[type] === null) {
        el["goal-amount"].focus(); // «Своя ціль»: сума лишається, користувач вводить свою
      } else {
        el["goal-amount"].value = String(GOALS[type]);
        touched.add("goal-amount");
      }
      update();
    });
    root.querySelectorAll("[data-monthly]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const v = Number(btn.dataset.monthly);
        if (!Number.isFinite(v)) return;
        el["goal-monthly"].value = String(v);
        touched.add("goal-monthly");
        update();
      })
    );

    el["goal-rate"].disabled = !el["goal-deposit"].checked;
    update();
  }

  const start = () => document.querySelectorAll("[data-goal-widget]").forEach(initGoalWidget);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/* «Потік монет» — мінімальний JavaScript.
   1) розрахунок симулятора заощаджень;
   2) мобільне меню з керуванням клавіатурою (стан — атрибут data-open);
   3) інформер «Офіційний курс НБУ» (ЛР №7).
   Сторінка залишається читабельною й без JS (прогресивне покращення). */

(() => {
  "use strict";

  const NBSP = "\u00A0";
  const numberFormat = new Intl.NumberFormat("uk-UA");
  const formatMoney = (value) => `${numberFormat.format(value)}${NBSP}₴`;

  /* Відмінювання слова «місяць»: 6 місяців, 12 місяців, 24 місяці */
  const formatMonths = (count) => {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return `${count} місяців`;
    if (last === 1) return `${count} місяць`;
    if (last >= 2 && last <= 4) return `${count} місяці`;
    return `${count} місяців`;
  };

  /* ---------- Спільний стан: курси НБУ + результат симулятора ---------- */
  const rates = {}; // { USD: 41.23, EUR: 44.9, PLN: 10.4 }
  let simulatorTotal = null;
  const equivalentEl = document.getElementById("rates-equivalent");

  /* «Твої 24 000 ₴ ≈ 580 $ · 500 € · 2 400 zł» — оновлюється разом із повзунком */
  const renderEquivalent = () => {
    if (!equivalentEl || simulatorTotal === null || !rates.USD || !rates.EUR || !rates.PLN) return;
    const part = (code, symbol) => `${numberFormat.format(Math.round(simulatorTotal / rates[code]))}${NBSP}${symbol}`;
    equivalentEl.textContent = `Твій план на ${formatMoney(simulatorTotal)} ≈ ${part("USD", "$")} · ${part("EUR", "€")} · ${part("PLN", "zł")}`;
    equivalentEl.hidden = false;
  };

  /* ---------- 1. Симулятор ---------- */
  const form = document.getElementById("simulator-form");

  if (form) {
    const slider = form.querySelector("#amount");
    const outputs = {
      amount: document.getElementById("amount-output"),
      total: document.getElementById("total-output"),
      formula: document.getElementById("formula"),
      perDay: document.getElementById("per-day"),
      badgeTerm: document.getElementById("badge-term"),
      resultTerm: document.getElementById("result-term"),
    };

    const update = () => {
      const amount = Number(slider.value);
      const months = Number(form.elements.term.value);
      const total = amount * months;
      const perDay = Math.round(amount / 30);
      const fill = ((amount - slider.min) / (slider.max - slider.min)) * 100;

      slider.style.setProperty("--fill", `${fill}%`);
      outputs.amount.textContent = formatMoney(amount);
      outputs.total.textContent = formatMoney(total);
      outputs.formula.textContent = `${formatMoney(amount)} × ${months} міс. · без відсотків`;
      outputs.perDay.textContent = `${formatMoney(perDay)} на день`;
      outputs.badgeTerm.textContent = formatMonths(months);
      outputs.resultTerm.textContent = formatMonths(months);

      simulatorTotal = total;
      renderEquivalent();
    };

    form.addEventListener("input", update);
    form.addEventListener("submit", (event) => event.preventDefault());
    update();
  }

  /* ---------- 2. Мобільне меню ---------- */
  const toggle = document.querySelector('[aria-controls="primary-nav"]');
  const nav = document.getElementById("primary-nav");

  if (toggle && nav) {
    const mobileQuery = window.matchMedia("(max-width: 860px)");

    const setOpen = (isOpen) => {
      nav.dataset.open = String(isOpen); /* Tailwind: [.js_&]:max-md:data-[open=false]:hidden */
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Закрити меню" : "Відкрити меню");
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    /* Esc закриває меню й повертає фокус на кнопку */
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.dataset.open === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Після переходу за посиланням меню згортається */
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    /* При переході на широкий екран скидаємо стан */
    mobileQuery.addEventListener("change", (event) => {
      if (!event.matches) setOpen(false);
    });
  }

  /* ---------- 3. Інформер: офіційний курс НБУ ---------- */
  const ratesList = document.getElementById("rates-list");

  if (ratesList) {
    const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew?json";
    const rateFormat = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const statusEl = document.getElementById("rates-status");
    const dateEl = document.getElementById("rates-date");

    const showError = () => {
      ratesList.setAttribute("aria-busy", "false");
      dateEl.textContent = "Курси недоступні";
      statusEl.textContent = "Не вдалося завантажити курси. Актуальні значення дивіться на сайті НБУ за посиланням нижче.";
    };

    const loadRates = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(NBU_URL, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        let rateDate = "";
        ratesList.querySelectorAll("[data-currency]").forEach((item) => {
          const code = item.dataset.currency;
          const row = data.find((entry) => entry.cc === code);
          if (!row || !Number.isFinite(row.rate)) return;
          rates[code] = row.rate;
          item.querySelector("[data-rate]").textContent = `${rateFormat.format(row.rate)}${NBSP}₴`;
          rateDate = row.exchangedate || rateDate;
        });

        if (!rateDate) throw new Error("Немає потрібних валют");
        ratesList.setAttribute("aria-busy", "false");
        dateEl.textContent = `станом на ${rateDate}`;
        statusEl.textContent = "Курси гривні до іноземних валют за 1 одиницю.";
        renderEquivalent();
      } catch (error) {
        showError();
      } finally {
        clearTimeout(timer);
      }
    };

    loadRates();
  }
})();

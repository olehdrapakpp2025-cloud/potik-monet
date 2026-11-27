/* «Потік монет» — ЛР №9. Клієнтська валідація форми зворотного зв'язку.
   Без сторонніх бібліотек. Структура:
   1) регулярні вирази й тексти помилок;
   2) функції перевірки полів (повертають текст помилки або порожній рядок);
   3) функції UI-станів: showError / showSuccess / clearError;
   4) динамічна валідація (input / blur / change);
   5) submit і модальне вікно «Імітація успішного надсилання».
   Важливо: це лише клієнтська перевірка. Реальний сервер мав би перевірити дані повторно. */

(() => {
  "use strict";

  const form = document.getElementById("feedbackForm");
  if (!form) return;

  /* ---------- 1. Регулярні вирази та обмеження ---------- */

  // Літери української або латинської абетки; між частинами — один пробіл, апостроф або дефіс.
  // Приклади: «Олена», «Ірина-Марія», «Мар’яна», «Anna Maria». Російські Ё, Ъ, Ы, Э не входять у діапазон.
  const REGEX_NAME = /^[A-Za-zА-ЩЬЮЯҐЄІЇа-щьюяґєії]+(?:[ '’ʼ-][A-Za-zА-ЩЬЮЯҐЄІЇа-щьюяґєії]+)*$/u;

  // Локальна частина: блоки з літер, цифр і _ % + -, розділені однією крапкою (крапка не на краях і не двічі поспіль).
  // Домен: мітки з літер, цифр і дефісів (дефіс не на краях), розділені крапками; зона — 2–24 літери.
  const REGEX_EMAIL =
    /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

  // Строго: +380 і рівно 9 цифр. Без пробілів, дужок, дефісів і літер.
  const REGEX_PHONE = /^\+380\d{9}$/;

  const LIMITS = { nameMin: 2, nameMax: 50, emailMax: 254, messageMin: 10, messageMax: 1000 };

  /* ---------- 2. Функції перевірки (чисті: без роботи з DOM) ---------- */

  const plural = (n, one, few, many) => {
    const lastTwo = n % 100;
    const last = n % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  };

  function validateName(value) {
    const name = value.trim();
    if (name === "") return "Введіть ім’я.";
    if (name.length < LIMITS.nameMin) return `Ім’я має містити щонайменше ${LIMITS.nameMin} символи.`;
    if (name.length > LIMITS.nameMax) return `Ім’я задовге: максимум ${LIMITS.nameMax} символів.`;
    if (!REGEX_NAME.test(name)) return "Ім’я може містити лише літери, а між частинами — пробіл, апостроф або дефіс.";
    return "";
  }

  function validateEmail(value) {
    const email = value.trim();
    if (email === "") return "Введіть електронну пошту.";
    if (email.length > LIMITS.emailMax || !REGEX_EMAIL.test(email)) {
      return "Введіть коректну адресу, наприклад user@gmail.com.";
    }
    return "";
  }

  function validatePhone(value) {
    const phone = value.trim();
    if (phone === "") return "Введіть номер телефону.";
    if (/[A-Za-zА-Яа-яҐЄІЇґєії]/u.test(phone)) return "Номер не може містити літери: лише +380 і 9 цифр.";
    if (!REGEX_PHONE.test(phone)) return "Номер має бути у форматі +380XXXXXXXXX, наприклад +380501234567.";
    return "";
  }

  function validateMessage(value) {
    const length = value.trim().length;
    if (length === 0) return "Напишіть повідомлення.";
    if (length < LIMITS.messageMin) {
      const left = LIMITS.messageMin - length;
      return `Додайте ще ${left} ${plural(left, "символ", "символи", "символів")}: мінімум ${LIMITS.messageMin}.`;
    }
    if (length > LIMITS.messageMax) return `Повідомлення задовге: максимум ${LIMITS.messageMax} символів.`;
    return "";
  }

  function validateAgreement(checked) {
    return checked ? "" : "Потрібна ваша згода з політикою конфіденційності.";
  }

  /* ---------- UX: приведення номера до формату +380XXXXXXXXX ----------
     Не частина RegEx, а окрема допомога користувачу. Спрацьовує лише на blur і лише тоді,
     коли результат однозначний. Про зміну повідомляємо в підказці під полем. */
  function normalizePhone(raw) {
    const compact = raw.trim().replace(/[\s()\-.]/g, ""); // прибираємо пробіли, дужки, дефіси, крапки
    if (/^0\d{9}$/.test(compact)) return `+38${compact}`; // 0501234567 → +380501234567
    if (/^380\d{9}$/.test(compact)) return `+${compact}`; // 380501234567 → +380501234567
    return compact;
  }

  /* ---------- 3. UI-стани поля ---------- */

  const NORMAL = ["border-white/15"];
  const ERROR = ["border-red-500", "ring-2", "ring-red-500/30"];
  const SUCCESS = ["border-green-500"];

  const fields = {
    username: { input: form.elements.username, validate: () => validateName(form.elements.username.value) },
    email: { input: form.elements.email, validate: () => validateEmail(form.elements.email.value) },
    phone: { input: form.elements.phone, validate: () => validatePhone(form.elements.phone.value) },
    message: { input: form.elements.message, validate: () => validateMessage(form.elements.message.value) },
    agreement: { input: form.elements.agreement, validate: () => validateAgreement(form.elements.agreement.checked) },
  };

  Object.entries(fields).forEach(([name, field]) => {
    field.error = document.getElementById(`${name}Error`);
    field.ok = field.input.closest("[data-field]").querySelector(".field-ok");
  });

  const setClasses = (el, add, remove) => {
    el.classList.remove(...remove);
    el.classList.add(...add);
  };

  // Текст помилки вставляємо через textContent (не innerHTML), тож введений HTML не виконається.
  function showError(field, message) {
    setClasses(field.input, ERROR, [...NORMAL, ...SUCCESS]);
    field.input.setAttribute("aria-invalid", "true");
    field.error.replaceChildren();
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-circle-exclamation mt-1 flex-none";
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = message;
    field.error.append(icon, text);
    setClasses(field.error, ["flex"], ["hidden"]);
    if (field.ok) field.ok.classList.add("hidden");
  }

  function showSuccess(field) {
    setClasses(field.input, SUCCESS, [...NORMAL, ...ERROR]);
    field.input.setAttribute("aria-invalid", "false");
    field.error.replaceChildren();
    setClasses(field.error, ["hidden"], ["flex"]);
    if (field.ok) field.ok.classList.remove("hidden");
  }

  function clearError(field) {
    setClasses(field.input, NORMAL, [...ERROR, ...SUCCESS]);
    field.input.setAttribute("aria-invalid", "false");
    field.error.replaceChildren();
    setClasses(field.error, ["hidden"], ["flex"]);
    if (field.ok) field.ok.classList.add("hidden");
  }

  // Перевіряє одне поле й показує відповідний стан. Повертає true, якщо поле валідне.
  function validateField(name) {
    const field = fields[name];
    const message = field.validate();
    if (message) showError(field, message);
    else showSuccess(field);
    return message === "";
  }

  /* ---------- 4. Динамічна валідація ----------
     Відкрили форму → помилок немає. Почали вводити → поле «брудне».
     Вийшли з поля (blur) → показуємо результат. Далі input оновлює стан на льоту. */

  const touched = new Set(); // поля, для яких уже показано результат
  const dirty = new Set(); // поля, у які користувач щось вводив

  const counter = document.getElementById("messageCounter");
  const phoneHint = document.getElementById("phoneHint");
  const PHONE_HINT_DEFAULT = phoneHint.textContent;

  const updateCounter = () => {
    const length = fields.message.input.value.length;
    counter.textContent = `${length} / ${LIMITS.messageMax}`;
    counter.classList.toggle("text-red-400", length > LIMITS.messageMax - 50);
  };

  form.addEventListener("input", (event) => {
    const name = event.target.name;
    if (!(name in fields) || name === "agreement") return;
    dirty.add(name);
    if (name === "message") updateCounter();
    if (name === "phone") phoneHint.textContent = PHONE_HINT_DEFAULT;
    if (touched.has(name)) validateField(name);
  });

  form.addEventListener("focusout", (event) => {
    const name = event.target.name;
    if (!(name in fields) || name === "agreement" || !dirty.has(name)) return;

    if (name === "phone") {
      const before = fields.phone.input.value;
      const after = normalizePhone(before);
      if (after !== before.trim() && REGEX_PHONE.test(after)) {
        fields.phone.input.value = after;
        phoneHint.textContent = `Номер приведено до формату +380XXXXXXXXX: ${after}`;
      }
    }
    if (name === "username") {
      // Зайві пробіли всередині й по краях прибираємо: «  Олена   Іванівна » → «Олена Іванівна»
      fields.username.input.value = fields.username.input.value.trim().replace(/\s+/g, " ");
    }

    touched.add(name);
    validateField(name);
  });

  // Чекбокс: стан оновлюється одразу при кожній зміні (і при повторному знятті галочки).
  fields.agreement.input.addEventListener("change", () => {
    touched.add("agreement");
    validateField("agreement");
  });

  /* ---------- 5. Submit + модальне вікно ---------- */

  const submitBtn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("formStatus");
  const modal = document.getElementById("successModal");
  const modalName = document.getElementById("successName");
  const closeBtn = document.getElementById("closeModal");
  let isSubmitting = false; // захист від швидкого повторного натискання

  const resetForm = () => {
    form.reset();
    touched.clear();
    dirty.clear();
    Object.values(fields).forEach(clearError);
    phoneHint.textContent = PHONE_HINT_DEFAULT;
    updateCounter();
  };

  const openModal = () => {
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", ""); // запасний варіант для старих браузерів
  };

  const closeModal = () => {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // не перезавантажуємо сторінку й нікуди не надсилаємо дані
    if (isSubmitting) return;

    const names = Object.keys(fields);
    names.forEach((name) => touched.add(name));
    const invalid = names.filter((name) => !validateField(name));

    if (invalid.length > 0) {
      const count = invalid.length;
      statusEl.textContent = `Перевірте ${count} ${plural(count, "поле", "поля", "полів")} з помилками.`;
      statusEl.classList.add("text-red-400");
      fields[invalid[0]].input.focus(); // фокус на перше поле з помилкою
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    statusEl.classList.remove("text-red-400");
    statusEl.textContent = "Перевіряємо дані…";

    // Імітація відповіді сервера. Справжнього надсилання немає: бекенд не підключено.
    window.setTimeout(() => {
      const firstName = fields.username.input.value.trim().split(" ")[0];
      modalName.textContent = firstName; // textContent — безпечно для будь-якого введення
      resetForm();
      statusEl.textContent = "";
      submitBtn.disabled = false;
      isSubmitting = false;
      openModal();
    }, 400);
  });

  closeBtn.addEventListener("click", closeModal);

  // Клік по затемненому фону закриває вікно. Картка займає весь <dialog>,
  // тому клік усередині неї має target = картка або її вміст, а не сам <dialog>.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  // Esc закриває <dialog> нативно; після закриття повертаємо фокус на кнопку форми.
  modal.addEventListener("close", () => submitBtn.focus());

  updateCounter();
})();

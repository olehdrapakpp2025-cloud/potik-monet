// Калькулятор фінансової цілі — перша версія (Happy Path)

const typeEl = document.getElementById("goal-type");
const amountEl = document.getElementById("goal-amount");
const savedEl = document.getElementById("goal-saved");
const monthlyEl = document.getElementById("goal-monthly");
const depositEl = document.getElementById("goal-deposit");
const rateEl = document.getElementById("goal-rate");

const monthsEl = document.getElementById("goal-months");
const dateEl = document.getElementById("goal-date");
const contribEl = document.getElementById("goal-contrib");
const interestEl = document.getElementById("goal-interest");
const totalEl = document.getElementById("goal-total");
const tipEl = document.getElementById("goal-tip");
const barEl = document.getElementById("goal-progress-bar");
const progressText = document.getElementById("goal-progress-text");

const money = new Intl.NumberFormat("uk-UA");
const monthYear = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" });

function calculate() {
  const goal = parseFloat(amountEl.value);
  const saved = parseFloat(savedEl.value);
  const monthly = parseFloat(monthlyEl.value);
  const r = depositEl.checked ? (parseFloat(rateEl.value) / 100) * 0.77 / 12 : 0;

  let months;
  if (r > 0) {
    months = Math.ceil(Math.log((goal * r + monthly) / (saved * r + monthly)) / Math.log(1 + r));
  } else {
    months = Math.ceil((goal - saved) / monthly);
  }

  const total = r > 0
    ? saved * Math.pow(1 + r, months) + (monthly * (Math.pow(1 + r, months) - 1)) / r
    : saved + monthly * months;
  const contrib = monthly * months;

  const date = new Date();
  date.setMonth(date.getMonth() + months);

  monthsEl.textContent = months + " місяців";
  dateEl.textContent = "Ціль — у " + monthYear.format(date);
  contribEl.textContent = money.format(contrib) + " ₴";
  interestEl.textContent = money.format(Math.round(total - saved - contrib)) + " ₴";
  totalEl.textContent = money.format(Math.round(total)) + " ₴";
  tipEl.textContent = "Щоб встигнути за 12 місяців, відкладай " + money.format(Math.ceil((goal - saved) / 12)) + " ₴ на місяць.";
  barEl.style.width = (saved / goal) * 100 + "%";
  progressText.textContent = "Відкладено " + Math.round((saved / goal) * 100) + "% від цілі";
}

[amountEl, savedEl, monthlyEl].forEach((el) => el.addEventListener("input", calculate));
rateEl.addEventListener("change", calculate);
depositEl.addEventListener("change", () => {
  rateEl.disabled = !depositEl.checked;
  calculate();
});
typeEl.addEventListener("change", () => {
  amountEl.value = typeEl.selectedOptions[0].dataset.preset;
  calculate();
});
document.querySelectorAll("[data-monthly]").forEach((btn) =>
  btn.addEventListener("click", () => {
    monthlyEl.value = btn.dataset.monthly;
    calculate();
  })
);

calculate();

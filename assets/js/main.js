(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: transparent over the hero, solid once the hero has scrolled away */
  var header = document.querySelector("[data-header]");
  var hero = document.querySelector(".hero");
  /* Mobile call/book bar: shown between the hero and the booking section */
  var actionBar = document.querySelector("[data-action-bar]");
  var bookSection = document.getElementById("book");

  function updateHeader() {
    var limit = hero ? hero.offsetHeight - 90 : 40;
    header.classList.toggle("is-solid", window.scrollY > limit);
    if (actionBar && bookSection) {
      var pastHero = window.scrollY > limit;
      var beforeBook = bookSection.getBoundingClientRect().top > window.innerHeight * 0.85;
      actionBar.classList.toggle("is-visible", pastHero && beforeBook);
    }
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);

  /* Mobile menu */
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* Reveal on scroll: content is visible without JS; only lifted in when observed */
  var revealTargets = document.querySelectorAll(
    ".section-head, .problem__text, .step, .services__top, .services__list li, .services__photo, .facts li, .person, .about__photo, .faq__intro, .faq__list, .book__intro, .form"
  );
  var estimate = document.querySelector("[data-estimate]");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    if (estimate) estimate.classList.add("is-in");
  } else {
    revealTargets.forEach(function (el) {
      el.setAttribute("data-reveal", "");
    });
    // Stagger siblings inside the same list
    document.querySelectorAll(".steps__list, .services__list, .facts, .people").forEach(function (list) {
      Array.prototype.forEach.call(list.children, function (child, i) {
        child.style.transitionDelay = Math.min(i * 90, 360) + "ms";
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    revealTargets.forEach(function (el) { io.observe(el); });
    if (estimate) io.observe(estimate);
  }

  /* Year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  /* Booking form → Formspree */
  var form = document.querySelector("[data-form]");
  if (!form) return;
  var status = form.querySelector("[data-status]");
  var submit = form.querySelector("[data-submit]");
  var submitLabel = submit.textContent;
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, show) {
    var msg = document.getElementById(input.id + "-fejl");
    input.setAttribute("aria-invalid", show ? "true" : "false");
    if (msg) {
      msg.hidden = !show;
      if (show) input.setAttribute("aria-describedby", msg.id);
      else input.removeAttribute("aria-describedby");
    }
  }

  function validate(input) {
    var value = input.value.trim();
    var ok = value.length > 0;
    if (ok && input.type === "email") ok = emailPattern.test(value);
    if (ok && input.type === "tel") ok = value.replace(/[^\d]/g, "").length >= 8;
    setError(input, !ok);
    return ok;
  }

  var required = Array.prototype.slice.call(form.querySelectorAll("[required]"));
  required.forEach(function (input) {
    input.addEventListener("blur", function () { if (input.value) validate(input); });
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") validate(input);
    });
  });

  function showStatus(text, kind) {
    status.textContent = text;
    status.className = "form__status " + (kind === "ok" ? "is-ok" : "is-error");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var firstInvalid = null;
    required.forEach(function (input) {
      if (!validate(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      showStatus("Udfyld de markerede felter, så vi kan kontakte jer.", "error");
      return;
    }

    if (form.action.indexOf("FORMSPREE_ID") !== -1) {
      showStatus("Formularen er ikke koblet til endnu. Ring på 53 59 34 24 eller skriv til info@orstedbech.dk.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Sender …";
    status.textContent = "";
    status.className = "form__status";

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        form.reset();
        required.forEach(function (input) { setError(input, false); });
        showStatus("Tak! Vi har modtaget jeres forespørgsel og kontakter jer inden for 1 arbejdsdag.", "ok");
      })
      .catch(function () {
        showStatus("Forespørgslen blev ikke sendt. Prøv igen, eller ring på 53 59 34 24.", "error");
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = submitLabel;
      });
  });
})();

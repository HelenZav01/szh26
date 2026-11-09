const hotbar = document.querySelector(".hotbar");
const links = [...hotbar.querySelectorAll("a")];
const activePill = hotbar.querySelector(".pill-active");
const hoverPill = hotbar.querySelector(".pill-hover");
const pages = [...document.querySelectorAll(".page")];
{
  const first = parseRoute().page;
  pages.forEach((p) => (p.hidden = p.dataset.page !== first));
}

let current = null;

const linkBoxes = new Map();

function measureLink(link, compact) {
  const key = `${link.dataset.page}|${compact}`;
  if (!linkBoxes.has(key)) linkBoxes.set(key, measureLinkNow(link, compact));
  return linkBoxes.get(key);
}

function measureLinkNow(link, compact) {
  const clone = hotbar.cloneNode(true);
  clone.classList.toggle("compact", compact);
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;transition:none";
  clone.querySelectorAll("a").forEach((a) => (a.style.transition = "none"));
  hotbar.parentNode.append(clone);
  const a = clone.querySelector(`a[data-page="${link.dataset.page}"]`);
  const box = { left: a.offsetLeft, width: a.offsetWidth };
  clone.remove();
  return box;
}

let hoveredLink = null;

function movePill(pill, link, compact = hotbar.classList.contains("compact")) {
  if (!link) {
    pill.classList.remove("visible");
    return;
  }
  const wasHidden = !pill.classList.contains("visible");
  if (wasHidden) pill.style.transition = "opacity 0.25s";
  const box = measureLink(link, compact);
  pill.style.width = `${box.width}px`;
  pill.style.transform = `translateX(${box.left}px)`;
  pill.classList.add("visible");
  if (wasHidden) requestAnimationFrame(() => (pill.style.transition = ""));
}

links.forEach((link) => {
  const hover = () => {
    hoveredLink = link;
    movePill(hoverPill, link);
  };
  link.addEventListener("mouseenter", hover);
  link.addEventListener("focus", hover);
});
hotbar.addEventListener("mouseleave", () => {
  hoveredLink = null;
  movePill(hoverPill, null);
});

const SITE_TITLE = document.title;
const memoryLink = document.querySelector(".memory-link");
let currentKey = null;
let currentRoute = null;
let targetKey = null;

function parseRoute() {
  const [name = "", param = ""] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (name === "teachers" && param) return { page: "teacher", param, nav: "teachers" };
  if (name === "mk" && param) return { page: "mk", param, nav: "teachers" };
  const page = ["teacher", "mk"].includes(name) || !pages.some((p) => p.dataset.page === name) ? "events" : name;
  return { page, param: "", nav: page };
}

function route() {
  const r = parseRoute();
  if ((r.page === "teacher" && !findTeacher(r.param)) || (r.page === "mk" && !findMk(r.param))) {
    location.replace("#/teachers");
    return;
  }
  const key = `${r.page}/${r.param}`;
  if (key === (targetKey || currentKey)) return;
  targetKey = key;
  const next = pages.find((p) => p.dataset.page === r.page);

  const compact = r.page === "teachers";
  movePill(activePill, links.find((l) => l.dataset.page === r.nav), compact);
  links.forEach((l) => l.classList.toggle("active", l.dataset.page === r.nav));

  const show = () => {
    if (targetKey !== key) return;
    targetKey = null;
    renderRoutePage(r);
    document.body.dataset.page = r.page;
    hotbar.classList.toggle("compact", compact);
    if (hoveredLink) movePill(hoverPill, hoveredLink);
    pages.forEach((p) => (p.hidden = p !== next));
    next.classList.remove("leave", "enter");
    void next.offsetWidth;
    next.classList.add("enter");
    window.scrollTo({ top: 0, behavior: "smooth" });
    current = next;
    currentKey = key;
    currentRoute = r;
    memoryLink.classList.toggle("active", r.page === "memory");
    if (r.page !== "memory" && r.page !== "teachers") document.documentElement.classList.remove("no-backdrop");
    if (r.page === "events") {
      document.documentElement.classList.remove("start-elsewhere");
      loadHero();
    }
    window.dispatchEvent(new Event("pagechange"));
  };

  if (current) {
    const prev = current;
    prev.classList.remove("enter");
    prev.classList.add("leave");
    prev.addEventListener("animationend", () => {
      prev.classList.remove("leave");
      show();
    }, { once: true });
  } else {
    show();
  }
}

function renderRoutePage(r) {
  if (r.page === "teacher") {
    const t = findTeacher(r.param);
    renderTeacherPage(t);
    document.title = `${t.name || t.short} — СЗШ № 26`;
  } else if (r.page === "mk") {
    const mk = findMk(r.param);
    renderMkPage(mk);
    document.title = `${mk.title} — СЗШ № 26`;
  } else if (r.page === "first") {
    renderFirstPage();
    document.title = `Першокласнику — СЗШ № 26`;
  } else if (r.page === "memory") {
    renderMemoryPage();
    document.title = `${content.museum.title} — СЗШ № 26`;
  } else {
    document.title = SITE_TITLE;
  }
}

window.addEventListener("hashchange", route);
function remeasurePill() {
  linkBoxes.clear();
  movePill(activePill, links.find((l) => l.classList.contains("active")));
}
let resizeQueued = false;
window.addEventListener("resize", () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    remeasurePill();
  });
});
document.fonts?.ready.then(remeasurePill);

let news = published.news || defaultNews;
let content = baseContent;

const newsList = document.getElementById("news");
const article = document.querySelector(".article");
const articleTitle = article.querySelector("#article-title");
const articleDate = article.querySelector(".article-date");
const articleText = article.querySelector(".article-text");
const carousel = article.querySelector(".carousel");
const track = carousel.querySelector(".carousel-track");
const thumbs = carousel.querySelector(".carousel-thumbs");
const prevBtn = carousel.querySelector(".prev");
const nextBtn = carousel.querySelector(".next");

function makeImg(image, size) {
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = image.alt;
  setPhoto(img, image.src, size);
  return img;
}

function renderNews() {
  newsList.replaceChildren();
  news.forEach((item) => {
  const photos = item.images.slice(0, 3);
  const el = document.createElement("article");
  el.className = "news-item";
  el.tabIndex = 0;
  el.innerHTML = `
    ${item.date ? `<time datetime="${item.date}">${formatDate(item.date)}</time>` : ""}
    <h3></h3>
    <div class="news-photos" style="--count: ${photos.length}"></div>
    <p></p>
    <span class="news-more">Переглянути</span>`;
  el.querySelector("h3").textContent = item.title;
  el.querySelector("p").textContent = item.text.join(" ");
  el.querySelector(".news-photos").append(...photos.map((image) => {
    const cell = document.createElement("div");
    const img = makeImg(image, photos.length > 2 ? "xs" : "sm");
    if (image.focus) img.style.objectPosition = image.focus;
    cell.append(img);
    return cell;
  }));
  onActivate(el, () => openArticle(item));
  newsList.append(el);
  });
}
renderNews();

function openArticle(item) {
  articleTitle.textContent = item.title;
  articleDate.hidden = !item.date;
  if (item.date) {
    articleDate.dateTime = item.date;
    articleDate.textContent = formatDate(item.date);
  }
  articleText.replaceChildren(...item.text.map((t) => {
    const p = document.createElement("p");
    p.textContent = t;
    return p;
  }));

  track.replaceChildren(...item.images.map((image) => {
    const img = makeImg(image, "md");
    img.addEventListener("click", () => openLightbox(image.src, img.alt));
    return img;
  }));
  thumbs.replaceChildren(...item.images.map((image, i) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.setAttribute("aria-label", `Фото ${i + 1}`);
    thumb.append(makeImg(image, "xs"));
    thumb.addEventListener("click", () => goTo(i));
    return thumb;
  }));
  carousel.dataset.count = item.images.length;

  article.hidden = false;
  article.scrollTop = 0;
  track.style.scrollBehavior = "auto";
  track.scrollLeft = 0;
  track.style.scrollBehavior = "";
  updateCarousel();
  document.body.style.overflow = "hidden";
  article.querySelector(".article-close").focus({ preventScroll: true });
}

function currentSlide() {
  return Math.round(track.scrollLeft / track.clientWidth) || 0;
}

function goTo(i) {
  const last = track.children.length - 1;
  track.scrollTo({ left: Math.max(0, Math.min(i, last)) * track.clientWidth });
}

function updateCarousel() {
  const i = currentSlide();
  [...thumbs.children].forEach((t, n) => t.classList.toggle("active", n === i));
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i >= track.children.length - 1;
}

track.addEventListener("scroll", () => requestAnimationFrame(updateCarousel), { passive: true });
prevBtn.addEventListener("click", () => goTo(currentSlide() - 1));
nextBtn.addEventListener("click", () => goTo(currentSlide() + 1));

function closeArticle() {
  article.hidden = true;
  document.body.style.overflow = "";
}

article.querySelector(".article-close").addEventListener("click", closeArticle);

const newsBlock = document.getElementById("news-block");
const collapseBtn = newsBlock.querySelector(".collapse-btn");
const revealBtn = newsBlock.querySelector(".news-reveal");

function renderNewsSummary() {
  document.getElementById("news-count").textContent = news.length;
  document.getElementById("reveal-title").textContent =
    `${news.length} ${plural(news.length, "новина", "новини", "новин")} · показати всі`;
  document.getElementById("reveal-latest").textContent = news[0]?.title || "";
  newsBlock.querySelector(".reveal-thumbs").replaceChildren(
    ...news.filter((item) => item.images[0]).slice(0, 3).map((item) => {
      const img = makeImg(item.images[0], "xs");
      img.alt = "";
      return img;
    })
  );
}
renderNewsSummary();

function refreshNews() {
  renderNews();
  renderNewsSummary();
}

const sheet = document.querySelector(".sheet");
let movingTimer = 0;
function setNewsCollapsed(collapsed) {
  sheet.classList.add("moving");
  clearTimeout(movingTimer);
  movingTimer = setTimeout(() => sheet.classList.remove("moving"), 1200);
  newsBlock.classList.toggle("collapsed", collapsed);
  collapseBtn.setAttribute("aria-expanded", String(!collapsed));
}

collapseBtn.addEventListener("click", () => setNewsCollapsed(!newsBlock.classList.contains("collapsed")));
revealBtn.addEventListener("click", () => setNewsCollapsed(false));
setNewsCollapsed(true);

function warmNews() {
  newsList.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = "eager"));
}
new IntersectionObserver((entries, observer) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  observer.disconnect();
  (window.requestIdleCallback || setTimeout)(warmNews);
}, { rootMargin: "600px 0px" }).observe(newsBlock);
revealBtn.addEventListener("pointerenter", warmNews);
revealBtn.addEventListener("focus", warmNews);

document.getElementById("year").textContent = new Date().getFullYear();

const teacherFields = [
  ["role", "Посада"],
  ["subject", "Предмет"],
  ["category", "Категорія, звання"],
  ["theme", "Методична тема"],
  ["credo", "Кредо"],
];

const teachersGrid = document.getElementById("teachers");
let flippedCard = null;

function flipCard(card, open) {
  if (open && flippedCard && flippedCard !== card) flippedCard.classList.remove("flipped");
  card.classList.toggle("flipped", open);
  flippedCard = open ? card : null;
}

function renderTeachers() {
  flippedCard = null;
  teachersGrid.replaceChildren(...content.teachers.map(teacherCard));
}

const NARROW_CARD = 205;

function teacherCard(t) {
  const photo = t.photo || initialsPhoto(t.name || t.short);
  const el = document.createElement("article");
  el.className = "teacher";
  el.innerHTML = `
    <div class="teacher-inner">
      <div class="teacher-face teacher-front">
        <div class="teacher-top">
          <h3 class="teacher-name" data-f="short"></h3>
          <p class="teacher-role" data-f="role"></p>
        </div>
        <div class="teacher-photo">
          <img loading="lazy">
          <div class="teacher-actions">
            <a class="teacher-btn teacher-open">Сторінка вчителя</a>
            <button class="teacher-flip" type="button" aria-label="Перевернути картку" title="Перевернути">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="teacher-face teacher-back">
        <button class="teacher-unflip" type="button" aria-label="Перевернути назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
        </button>
        <div class="teacher-head">
          <img class="teacher-oval" alt="" loading="lazy">
          <h3 class="teacher-name" data-f="name"></h3>
        </div>
        <dl class="teacher-info"></dl>
        <a class="teacher-btn teacher-more">Сторінка вчителя</a>
      </div>
    </div>`;
  el.querySelectorAll("[data-f]").forEach((n) => (n.textContent = t[n.dataset.f] || ""));
  if (!t.role) el.querySelector(".teacher-role").remove();
  const info = el.querySelector(".teacher-info");
  teacherFields.forEach(([key, label]) => {
    if (!t[key]) return;
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = t[key];
    if (key === "credo") dd.className = "credo";
    info.append(dt, dd);
  });
  const mk = findMk(teacherMk(t));
  if (mk) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = "Методична комісія";
    dd.textContent = mk.short || mk.title;
    info.append(dt, dd);
  }
  el.querySelectorAll(".teacher-open, .teacher-more").forEach((a) => (a.href = `#/teachers/${encodeURIComponent(teacherSlug(t))}`));
  el.querySelectorAll("img").forEach((img) => setPhoto(img, photo, "sm"));
  el.querySelector(".teacher-photo img").alt = t.name || t.short || "";

  el.querySelector(".teacher-front").addEventListener("click", (e) => {
    if (e.target.closest(".teacher-open")) return;
    if (el.clientWidth <= NARROW_CARD) location.hash = el.querySelector(".teacher-open").getAttribute("href");
    else flipCard(el, true);
  });
  el.querySelector(".teacher-back").addEventListener("click", (e) => {
    if (e.target.closest(".teacher-more")) return;
    if (String(getSelection()).trim() && !e.target.closest(".teacher-unflip")) return;
    flipCard(el, false);
  });
  return el;
}

document.addEventListener("click", (e) => {
  if (flippedCard && !e.target.closest(".teacher")) flipCard(flippedCard, false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && flippedCard && article.hidden && lightbox.hidden) flipCard(flippedCard, false);
});

const tpPanel = document.getElementById("tp-panel");
const tpHome = tpPanel.querySelector(".tp-home");
const tpDetail = tpPanel.querySelector(".tp-detail");
const tpBody = tpDetail.querySelector(".tp-body");
const tpFeed = document.getElementById("tp-feed");
let tpActive = null;

function renderInfo() {
  renderSchoolInfo();
  showSchoolInfo();
  tpFeed.replaceChildren();
  content.info.groups.forEach((group) => {
  const sections = content.info.sections.filter((sec) => sec.group === group.id);
  if (!sections.length) return;
  const label = document.createElement("h3");
  label.className = "tp-group";
  label.textContent = group.title;
  tpFeed.append(label);

  sections.forEach((section) => {
    const state = { doc: "ready", link: "link", soon: "soon" }[sectionKind(section)];
    const badge = { ready: "Документи", link: "Розділ сайту", soon: "Незабаром" }[state];
    const item = document.createElement("button");
    item.type = "button";
    item.className = `tp-item ${state}`;
    item.innerHTML = `
      <span class="info-icon">${svgIcon(icons[section.icon] ? section.icon : "doc")}</span>
      <span class="tp-item-text"><b></b><small></small></span>
      <span class="info-badge">${badge}</span>`;
    item.querySelector("b").textContent = section.title;
    item.querySelector("small").textContent = section.about;
    item.addEventListener("click", () => showSection(item, section, group));
    tpFeed.append(item);
  });
  });
}

function renderSchoolInfo() {
  const school = content.school;
  tpHome.querySelector("h2").textContent = school.title;
  tpHome.querySelector(".tp-home-head p").textContent = school.subtitle;
  tpHome.querySelectorAll(".tp-section").forEach((sec) => sec.remove());
  const hint = tpHome.querySelector(".tp-hint");
  school.sections.forEach((section) => {
    const sec = document.createElement("section");
    sec.className = "tp-section";
    const h = document.createElement("h3");
    h.textContent = section.title;
    const dl = document.createElement("dl");
    dl.className = "tp-rows";
    section.rows.forEach((row) => dl.append(pairRow(row)));
    sec.append(h, dl);
    hint.before(sec);
  });
}

function pairRow(row, links = true) {
  const [label, value] = Array.isArray(row) ? row : [row.label, row.value];
  const div = document.createElement("div");
  div.innerHTML = "<dt></dt><dd></dd>";
  div.querySelector("dt").textContent = label || "";
  const dd = div.querySelector("dd");
  const text = String(value || "");
  const href = !links ? "" : /^\S+@\S+\.\S+$/.test(text) ? `mailto:${text}`
    : /^[+\d(][\d\s()+-]{5,}$/.test(text) && /[\s()+-]/.test(text) ? telHref(text) : "";
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = href.startsWith("tel:") ? formatPhone(text) : text;
    dd.append(a);
  } else {
    dd.textContent = text;
  }
  return div;
}

function showSection(item, section, group) {
  tpActive?.classList.remove("active");
  tpActive = item;
  item.classList.add("active");

  tpDetail.querySelector("#tp-group").textContent = group.title;
  tpDetail.querySelector("#tp-title").textContent = section.title;
  tpDetail.querySelector("#tp-about").textContent = section.about;
  tpBody.replaceChildren();
  const kind = sectionKind(section);
  if (kind === "doc") {
    renderDoc(section.doc || {}, tpBody);
  } else {
    const note = document.createElement("div");
    note.className = "info-note";
    const p = document.createElement("p");
    note.append(p);
    if (kind === "link") {
      p.textContent = section.linkNote || "";
      const a = document.createElement("a");
      a.className = "doc-btn primary";
      a.href = safeUrl(section.link, "#/events");
      a.textContent = section.linkLabel || "Перейти →";
      note.append(a);
    } else {
      p.textContent = "Розділ наповнюється — інформація з’явиться найближчим часом.";
    }
    tpBody.append(note);
  }

  tpHome.hidden = true;
  tpDetail.hidden = false;
  replayPanel();
  tpPanel.scrollTop = 0;
  if (matchMedia("(max-width: 900px)").matches) tpPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSchoolInfo() {
  tpActive?.classList.remove("active");
  tpActive = null;
  tpBody.replaceChildren();
  tpDetail.hidden = true;
  tpHome.hidden = false;
  replayPanel();
  tpPanel.scrollTop = 0;
}

function replayPanel() {
  tpPanel.classList.remove("swap");
  void tpPanel.offsetWidth;
  tpPanel.classList.add("swap");
}

tpDetail.querySelector(".tp-back").addEventListener("click", showSchoolInfo);
tpDetail.querySelector(".tp-close").addEventListener("click", showSchoolInfo);

function renderDoc(d, box) {
  if (d.intro) {
    const intro = document.createElement("p");
    intro.className = "doc-intro";
    intro.textContent = d.intro;
    box.append(intro);
  }

  if (d.stats?.length) {
    const wrap = document.createElement("div");
    wrap.className = "doc-stats";
    d.stats.forEach((st) => {
      const tile = document.createElement("div");
      tile.innerHTML = "<b></b><span></span>";
      tile.querySelector("b").textContent = st.value;
      tile.querySelector("span").textContent = st.label;
      wrap.append(tile);
    });
    box.append(wrap);
  }

  if (d.rows?.length) {
    const dl = document.createElement("dl");
    dl.className = "tp-rows doc-rows";
    d.rows.forEach((row) => dl.append(pairRow(row, false)));
    docBlock(box, d.rowsTitle).append(dl);
  }

  if (d.facts?.length) {
    const dl = document.createElement("dl");
    dl.className = "doc-facts";
    d.facts.forEach((row) => dl.append(pairRow(row, false)));
    box.append(dl);
  }

  if (d.chips?.length) {
    const list = document.createElement("ul");
    list.className = "doc-chips";
    d.chips.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c;
      list.append(li);
    });
    docBlock(box, d.chipsTitle).append(list);
  }

  if (d.people?.length) {
    const list = document.createElement("ul");
    list.className = "people doc-people";
    list.append(...d.people.map(personItem));
    docBlock(box, d.peopleTitle).append(list);
  }

  if (d.images?.length) {
    const gallery = document.createElement("div");
    gallery.className = "doc-gallery";
    d.images.forEach((image) => {
      const img = makeImg(image);
      img.addEventListener("click", () => openLightbox(img.src, img.alt));
      gallery.append(img);
    });
    docBlock(box, d.imagesTitle).append(gallery);
  }

  (d.files || []).filter((file) => file.src && fileUrl(file.src)).forEach((file) => {
    const url = fileUrl(file.src);
    const card = document.createElement("div");
    card.className = "doc-file";
    card.innerHTML = `
      <span class="doc-file-icon">PDF</span>
      <div class="doc-file-text"><b></b><span></span></div>
      <a class="doc-btn" target="_blank" rel="noopener">Відкрити</a>
      <a class="doc-btn primary" download>Завантажити</a>`;
    card.querySelector("b").textContent = file.name;
    card.querySelector(".doc-file-text span").textContent = file.size || "";
    card.querySelectorAll("a").forEach((a) => (a.href = url));
    if (url.startsWith("blob:")) card.querySelector("[download]").download = `${file.name || "документ"}.pdf`;
    if (fileType(file.src) !== "pdf") {
      docBlock(box, "Документ").append(card);
      return;
    }
    const preview = document.createElement("iframe");
    preview.className = "doc-pdf";
    preview.title = file.name;
    preview.loading = "lazy";
    preview.src = `${url}#view=FitH`;
    const wrap = document.createElement("div");
    wrap.className = "doc-pdf-wrap";
    wrap.innerHTML = '<button class="doc-pdf-cover" type="button"><span>Натисніть, щоб гортати документ</span></button>';
    wrap.prepend(preview);
    wrap.querySelector(".doc-pdf-cover").addEventListener("click", () => wrap.classList.add("active"));
    wrap.addEventListener("mouseleave", () => wrap.classList.remove("active"));
    docBlock(box, "Документ").append(card, wrap);
  });
}

function personItem(p) {
  const li = document.createElement("li");
  li.className = "person";
  li.innerHTML = `
    <img alt="" loading="lazy">
    <div class="person-text"><b></b><span></span></div>
    <a class="person-phone">${svgIcon("phone")}<span></span></a>`;
  setPhoto(li.querySelector("img"), p.photo || initialsPhoto(p.name), "xs");
  li.querySelector("b").textContent = p.name || "";
  li.querySelector(".person-text span").textContent = p.role || "";
  const phone = li.querySelector(".person-phone");
  if (p.phone) {
    phone.href = telHref(p.phone);
    phone.querySelector("span").textContent = formatPhone(p.phone);
  } else {
    phone.remove();
  }
  return li;
}

function docBlock(box, title) {
  const block = document.createElement("section");
  block.className = "doc-block";
  const h = document.createElement("h3");
  h.textContent = title;
  block.append(h);
  box.append(block);
  return block;
}

const contactsPage = document.querySelector('.page[data-page="contacts"]');
const mapFrame = contactsPage.querySelector(".map");

function renderContacts() {
  const c = content.contacts;
  const field = (name) => contactsPage.querySelector(`[data-c="${name}"]`);
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapSearch || c.address)}`;
  field("address").textContent = c.address;
  field("addressNote").textContent = c.addressNote;
  field("email").textContent = c.email;
  field("email").href = `mailto:${c.email}`;
  field("emailNote").textContent = c.emailNote;
  contactsPage.querySelector(".copy-btn").dataset.copy = c.email;
  field("phoneTitle").textContent = c.phoneTitle;
  field("phone").textContent = formatPhone(c.phone);
  field("phoneNote").textContent = c.phoneNote;
  contactsPage.querySelectorAll('[data-c="phoneLink"], [data-c="phone"]').forEach((a) => (a.href = telHref(c.phone)));
  contactsPage.querySelectorAll('[data-c="mapLink"]').forEach((a) => (a.href = searchUrl));
  field("peopleTitle").textContent = c.peopleTitle;
  contactsPage.querySelector(".contacts-card.staff .people").replaceChildren(...c.people.map(personItem));
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(c.map || c.address)}&z=16&output=embed`;
  if (mapFrame.getAttribute("src") !== mapSrc) mapFrame.src = mapSrc;
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  const label = btn.querySelector("span");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      label.textContent = "Скопійовано!";
      btn.classList.add("done");
    } catch {
      location.href = `mailto:${btn.dataset.copy}`;
      return;
    }
    setTimeout(() => {
      label.textContent = "Скопіювати адресу";
      btn.classList.remove("done");
    }, 2000);
  });
});

const lightbox = document.querySelector(".lightbox");
const lightboxImg = lightbox.querySelector("img");

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.hidden = false;
}

const hero = document.querySelector(".hero");
const heroImg = document.querySelector(".hero-media img");
onActivate(hero, () => openLightbox(hero.dataset.src, hero.dataset.alt));
hero.addEventListener("mouseenter", () => document.body.classList.add("hero-hover"));
hero.addEventListener("mouseleave", () => document.body.classList.remove("hero-hover"));
new IntersectionObserver(([e]) => document.body.classList.toggle("hero-out", !e.isIntersecting), { rootMargin: "300px 0px 0px 0px" }).observe(hero);

function loadHero() {
  const photo = content.home.hero.photo;
  if (heroImg.dataset.photo === photo && heroImg.getAttribute("src")) return;
  heroImg.dataset.photo = photo;
  setPhoto(heroImg, photo, "md");
}

function sharpen(img) {
  if (!img || img.dataset.sharp) return;
  img.dataset.sharp = "1";
  setPhoto(img, img.dataset.full, "md");
}

function setupDeck(wrap) {
  const deck = wrap.querySelector(".deck");
  const count = wrap.querySelector(".deck-count");
  let cards = [];
  let index = 0;
  let busy = false;

  function layout() {
    cards.forEach((img, i) => {
      const pos = (i - index + cards.length) % cards.length;
      img.dataset.pos = pos <= 2 ? pos : "hidden";
    });
    sharpen(cards[index]);
    count.textContent = cards.length ? `${index + 1} / ${cards.length}` : "";
  }

  function next() {
    if (busy || cards.length < 2) return;
    busy = true;
    const top = cards[index];
    top.classList.add("fly-out");
    index = (index + 1) % cards.length;
    layout();
    setTimeout(() => {
      top.classList.remove("fly-out");
      busy = false;
    }, 380);
  }

  function prev() {
    if (busy || cards.length < 2) return;
    index = (index - 1 + cards.length) % cards.length;
    const top = cards[index];
    top.style.transition = "none";
    top.classList.add("fly-out");
    top.getBoundingClientRect();
    top.style.transition = "";
    top.classList.remove("fly-out");
    layout();
  }

  wrap.querySelector(".next").addEventListener("click", next);
  wrap.querySelector(".prev").addEventListener("click", prev);
  deck.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (img && img.dataset.pos === "0" && !moved) openLightbox(img.dataset.full || img.src, img.alt);
  });

  let startX = null;
  let moved = false;
  const sharpenAll = () => cards.forEach(sharpen);
  wrap.addEventListener("pointerenter", sharpenAll);
  wrap.addEventListener("focusin", sharpenAll);
  wrap.addEventListener("touchstart", sharpenAll, { passive: true });

  deck.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    moved = false;
  });
  deck.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) {
      moved = true;
      dx < 0 ? next() : prev();
    }
  });
  deck.addEventListener("pointercancel", () => (startX = null));

  return {
    setPhotos(photos) {
      cards = photos.map((photo, i) => {
        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = photo.alt || "";
        img.dataset.full = photo.src;
        if (i > 0) setPhoto(img, photo.src, "sm");
        return img;
      });
      deck.replaceChildren(...cards);
      index = 0;
      wrap.querySelector(".deck-controls").hidden = cards.length < 2;
      layout();
    },
  };
}

const homeBlocks = [...document.querySelectorAll(".home-feature")].map((block) => ({
  quote: block.querySelector(".home-quote"),
  deck: setupDeck(block.querySelector(".deck-wrap")),
}));

function renderHome() {
  const { hero: h, blocks, cta = defaultHome.cta } = content.home;
  hero.querySelector("h1").textContent = h.title;
  hero.querySelector(".hero-caption p").textContent = h.subtitle;
  hero.dataset.src = h.photo;
  hero.dataset.alt = h.alt || h.title;
  if (parseRoute().page === "events") loadHero();

  homeBlocks.forEach((block, i) => {
    const data = blocks[i] || { quote: "", photos: [] };
    block.quote.textContent = data.quote;
    block.deck.setPhotos(data.photos);
  });

  const ctaBlock = document.querySelector(".contact-cta");
  ctaBlock.querySelector("h2").textContent = cta.title;
  ctaBlock.querySelector("p").textContent = cta.text;
}

function videoEmbed(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  if (/facebook\.com|fb\.watch/.test(url) && !url.includes("/plugins/")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&width=560`;
  }
  return url;
}

const sportBlock = document.querySelector(".sport");
const videoFrame = sportBlock.querySelector(".video-frame");

function renderSport() {
  const sp = content.sport;
  sportBlock.querySelector(".sport-title").textContent = sp.title;
  sportBlock.querySelector(".sport-text").textContent = sp.text;
  sportBlock.querySelector(".sport-label").textContent = sp.cardsTitle;
  sportBlock.querySelector(".sport-cards").replaceChildren(...sp.cards.map((card) => {
    const li = document.createElement("li");
    const icon = document.createElement("span");
    icon.className = "sport-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = card.icon;
    li.append(icon, card.name);
    return li;
  }));
  sportBlock.querySelector(".coaches").hidden = !sp.coaches.length;
  sportBlock.querySelector(".coaches h3").textContent = sp.coachesTitle;
  sportBlock.querySelector(".coaches ul").replaceChildren(...sp.coaches.map((coach) => {
    const li = document.createElement("li");
    let avatar;
    if (coach.photo) {
      avatar = document.createElement("img");
      avatar.className = "coach-avatar";
      avatar.alt = "";
      avatar.loading = "lazy";
      setPhoto(avatar, coach.photo, "xs");
    } else {
      avatar = document.createElement("span");
      avatar.className = "coach-avatar";
      avatar.textContent = (coach.name || "?").trim()[0];
    }
    li.append(avatar, coach.name);
    return li;
  }));

  const src = sp.video ? safeUrl(videoEmbed(sp.video)) : "";
  sportBlock.querySelector(".sport-video").hidden = !src;
  if (videoFrame.dataset.src !== src || !videoFrame.querySelector(".video-play")) {
    videoFrame.dataset.src = src;
    videoFrame.replaceChildren(videoPlayButton());
  }
  videoFrame.querySelector(".video-play").setAttribute("aria-label", `Дивитися відео: ${sp.videoTitle || sp.title}`);
}

function videoPlayButton() {
  const btn = document.createElement("button");
  btn.className = "video-play";
  btn.type = "button";
  btn.innerHTML = `
    <span class="video-play-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
    </span>
    <span class="video-play-text">Дивитися відео</span>`;
  return btn;
}

videoFrame.addEventListener("click", (e) => {
  if (!e.target.closest(".video-play")) return;
  const iframe = document.createElement("iframe");
  iframe.src = videoFrame.dataset.src;
  iframe.title = `Відео: ${content.sport.videoTitle || content.sport.title}`;
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  videoFrame.replaceChildren(iframe);
});

lightbox.addEventListener("click", () => (lightbox.hidden = true));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!lightbox.hidden) lightbox.hidden = true;
  else if (!article.hidden) closeArticle();
});

document.addEventListener("keydown", (e) => {
  if (article.hidden || !lightbox.hidden) return;
  if (e.key === "ArrowLeft") goTo(currentSlide() - 1);
  if (e.key === "ArrowRight") goTo(currentSlide() + 1);
});

function onActivate(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  });
}

document.querySelector(".theme-btn").addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

const firstPage = document.getElementById("first-page");
const CONTACT_RE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(\(0\d{2}\)\s?\d{3}-\d{2}-\d{2}|\b\d{3}-\d{2}-\d{2}\b)/g;

function linkify(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(CONTACT_RE)) {
    frag.append(text.slice(last, m.index));
    frag.append(m[1] ? link(`mailto:${m[1]}`, "", m[1]) : link(telHref(m[2]), "", m[2]));
    last = m.index + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}

function richText(text) {
  const nodes = [];
  let list = null;
  String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const number = line.match(/^\d+[.)]\s+(.*)$/);
    const kind = bullet ? "ul" : number ? "ol" : "";
    if (!kind) {
      list = null;
      const p = make("p");
      p.append(linkify(line));
      nodes.push(p);
      return;
    }
    if (!list || list.tagName.toLowerCase() !== kind) {
      list = make(kind);
      nodes.push(list);
    }
    const li = make("li");
    li.append(linkify((bullet || number)[1]));
    list.append(li);
  });
  return nodes;
}

function renderFirstPage() {
  const f = content.first;
  const blocks = [];

  const hero = make("section", "fg-hero profile-card");
  const text = make("div", "fg-hero-text");
  text.append(make("span", "mk-kicker", "Першокласнику"), make("h1", "fg-title", f.title));
  if (f.intro) text.append(make("p", "fg-intro", f.intro));
  const actions = make("div", "fg-actions");
  if (f.forms?.length) {
    const go = make("button", "fg-btn primary", "Зразки заяв");
    go.type = "button";
    go.addEventListener("click", () => firstPage.querySelector(".fg-forms")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    actions.append(go);
  }
  if (f.phones?.[0]) actions.append(link(telHref(f.phones[0]), "fg-btn", formatPhone(f.phones[0])));
  if (actions.children.length) text.append(actions);
  hero.append(text);
  if (f.photo) {
    const photo = zoomPhoto("fg-hero-photo", f.photo, f.title, "md");
    hero.append(photo);
  }
  blocks.push(hero);

  const steps = (f.steps || []).filter((s) => s.date || s.text);
  if (steps.length) {
    const list = make("ol", "fg-steps");
    steps.forEach((s, i) => {
      const li = make("li", "profile-card");
      li.append(make("span", "fg-step-num", String(i + 1)), make("b", "fg-step-date", s.date || ""), make("p", "", s.text || ""));
      list.append(li);
    });
    blocks.push(list);
  }

  const faq = (f.faq || []).filter((x) => x.q);
  if (faq.length) {
    const sec = make("section", "fg-faq profile-card");
    sec.append(make("h2", "", "Питання та відповіді"));
    faq.forEach((x, i) => {
      const item = make("details", "fg-q");
      if (i === 0) item.open = true;
      const summary = make("summary");
      summary.append(make("span", "", x.q));
      const body = make("div", "fg-a");
      body.append(...richText(x.a));
      item.append(summary, body);
      sec.append(item);
    });
    blocks.push(sec);
  }

  const forms = (f.forms || []).filter((x) => x.label && (x.file || x.url));
  if (forms.length) {
    const sec = make("section", "fg-forms profile-card");
    sec.append(make("h2", "", "Зразки заяв і документи"));
    const buttons = materialButtons(forms);
    if (buttons) sec.append(buttons);
    blocks.push(sec);
  }

  const teachers = (f.teachers || []).map((x) => findTeacher(x.id)).filter(Boolean);
  if (teachers.length || f.teachersText?.length) {
    const sec = make("section", "fg-teachers profile-card");
    if (f.teachersTitle) sec.append(make("h2", "", f.teachersTitle));
    const grid = make("div", "fg-teacher-grid");
    teachers.forEach((t) => {
      const card = link(teacherUrl(t), "fg-teacher");
      const img = make("img");
      img.alt = "";
      img.loading = "lazy";
      setPhoto(img, t.photo || initialsPhoto(t.name || t.short), "sm");
      const info = make("span", "fg-teacher-info");
      info.append(make("b", "", t.name || t.short), make("small", "", t.subject || t.role || ""), make("span", "fg-teacher-go", "Сторінка вчителя →"));
      card.append(img, info);
      grid.append(card);
    });
    if (teachers.length) sec.append(grid);
    (f.teachersText || []).filter(Boolean).forEach((p) => sec.append(make("p", "", p)));
    if (f.cta) sec.append(make("p", "fg-cta", f.cta));
    blocks.push(sec);
  }

  const phones = (f.phones || []).filter(Boolean);
  if (phones.length || f.email) {
    const sec = make("section", "fg-contact profile-card");
    const head = make("div");
    head.append(make("h2", "", "Залишилися запитання?"), make("p", "", "Зателефонуйте або напишіть нам — допоможемо з документами."));
    const links = make("div", "fg-contact-links");
    phones.forEach((ph) => links.append(link(telHref(ph), "fg-btn", formatPhone(ph))));
    if (f.email) links.append(link(`mailto:${f.email}`, "fg-btn", f.email));
    sec.append(head, links);
    blocks.push(sec);
  }

  firstPage.replaceChildren(...blocks);
}

const memoryPage = document.getElementById("memory-page");
const ARROW_UP = '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>';
const ANGEL = '<path d="M9.9 2.3c1.4-.9 2.8-.9 4.2 0"/><circle cx="12" cy="5.3" r="1.35"/><path d="M12 7.7 10.2 21h3.6z"/><path d="M10.8 8.5C8.4 7.7 6.6 5.7 6 2.7c-.6 3.2.2 6.4 2.4 8.6.8.8 1.6 1.2 2.3 1.4"/><path d="M13.2 8.5c2.4-.8 4.2-2.8 4.8-5.8.6 3.2-.2 6.4-2.4 8.6-.8.8-1.6 1.2-2.3 1.4"/>';
const MEMORY_FONTS = "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=Oswald:wght@400;500;600&display=swap";
const memReduced = matchMedia("(prefers-reduced-motion: reduce)");

function loadMemoryFonts() {
  if (document.getElementById("memory-fonts")) return;
  const fonts = make("link");
  fonts.id = "memory-fonts";
  fonts.rel = "stylesheet";
  fonts.href = MEMORY_FONTS;
  document.head.append(fonts);
}

function reveal(node, d = 0) {
  node.classList.add("mem-reveal");
  if (d) node.style.setProperty("--d", `${d}ms`);
  return node;
}

function memSection(className, label) {
  const sec = make("section", `mem-section ${className}`);
  if (label) sec.append(reveal(make("span", "mem-label", label)));
  return sec;
}

function memWords(text, className = "mem-words") {
  const p = make("p", className);
  text.split(/\s+/).filter(Boolean).forEach((word, i) => {
    const span = make("span", "", word);
    span.style.setProperty("--w", Math.min(i, 60));
    p.append(span, " ");
  });
  return p;
}

const pad2 = (n) => String(n).padStart(2, "0");
const yearOf = (date) => String(date || "").match(/\d{4}/)?.[0] || "";
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function glassButton(className, label, paths) {
  const btn = make("button", `theme-toggle ${className}`);
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.dataset.tip = label;
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  return btn;
}

function memImg(src, size, eager = false) {
  const img = make("img");
  img.alt = "";
  if (!eager) img.loading = "lazy";
  img.decoding = "async";
  setPhoto(img, src, size);
  return img;
}

function memPhoto(photo, className = "") {
  const frame = reveal(zoomPhoto(`mem-photo ${className}`.trim(), photo.src, photo.alt, "md"));
  if (photo.alt) frame.append(make("span", "mem-caption", photo.alt));
  frame.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = frame.getBoundingClientRect();
    frame.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    frame.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  frame.addEventListener("pointerleave", () => {
    frame.style.removeProperty("--tx");
    frame.style.removeProperty("--ty");
  });
  return frame;
}

function flapNumber(text) {
  const box = make("span", "mem-year");
  box.setAttribute("aria-label", text);
  [...text].forEach((ch) => {
    const digit = make("span", "mem-digit", ch);
    digit.setAttribute("aria-hidden", "true");
    box.append(digit);
  });
  return box;
}

function runFlaps(root) {
  if (memReduced.matches) return;
  root.querySelectorAll(".mem-digit").forEach((digit, i) => {
    const final = digit.textContent;
    if (!/\d/.test(final)) return;
    const turns = 8 + (i % 4) * 4;
    let n = 0;
    const tick = () => {
      digit.textContent = n < turns ? String((Number(final) + n + 1) % 10) : final;
      digit.classList.remove("flip");
      void digit.offsetWidth;
      digit.classList.add("flip");
      if (n++ < turns) setTimeout(tick, 80);
    };
    setTimeout(tick, 400 + (i % 4) * 140);
  });
}

function chronicleSection(title, frames, className = "") {
  const sec = make("section", `mem-chronicle ${className}`.trim());
  sec.style.setProperty("--n", frames.length);
  const view = make("div", "mem-chron-view");
  const year = make("span", "mem-chron-year");
  year.setAttribute("aria-hidden", "true");
  const intro = make("div", "mem-chron-intro");
  intro.append(make("span", "mem-label", "Хроніка"));
  if (title) intro.append(make("h2", "mem-heading", title));
  const scene = make("div", "mem-chron-scene");
  frames.forEach((c, n) => {
    const fig = make("figure", `mem-chron-item ${n % 2 ? "right" : "left"}`);
    fig.dataset.year = yearOf(c.alt);
    fig.append(memImg(c.src, "md"));
    if (c.alt || c.credit) {
      const cap = make("figcaption", "", c.alt || "");
      if (c.credit) cap.append(make("small", "", c.credit));
      fig.append(cap);
    }
    scene.append(fig);
  });
  view.append(year, scene, intro, make("div", "mem-grain"));
  sec.append(view);
  return sec;
}

function renderMemoryPage() {
  loadMemoryFonts();
  const m = content.museum;
  const head = content.teachers.find((t) => teacherSlug(t) === m.head);
  const chronicle = (m.chronicle || []).filter((c) => c.src);

  const hero = make("header", "mem-hero");
  const stage = make("div", "mem-stage");
  const media = make("div", "mem-hero-media");
  if (m.photo) {
    const img = memImg(m.photo, "md", true);
    img.fetchPriority = "high";
    media.append(img);
  }
  const beams = make("div", "mem-beams");
  beams.setAttribute("aria-hidden", "true");
  beams.append(make("span"), make("span"), make("span"));

  const ringPhotos = (chronicle.length ? chronicle : (m.photos || []).filter((p) => p.src)).slice(0, 12);
  const ring = make("div", "mem-ring");
  ring.setAttribute("aria-hidden", "true");
  if (ringPhotos.length) {
    const tilt = make("div", "mem-ring-tilt");
    const spin = make("div", "mem-ring-spin");
    const total = Math.max(10, ringPhotos.length);
    for (let i = 0; i < total; i++) {
      const frame = make("span", "mem-ring-item");
      frame.style.setProperty("--a", `${(360 / total) * i}deg`);
      const src = ringPhotos[i % ringPhotos.length].src;
      const back = memImg(ringPhotos[(i + 3) % ringPhotos.length].src, "sm");
      back.className = "back";
      frame.append(memImg(src, "sm"), back);
      spin.append(frame);
    }
    tilt.append(spin);
    ring.append(tilt);
  }

  const inner = make("div", "mem-hero-inner");
  const emblem = make("span", "mem-emblem");
  emblem.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ANGEL}</svg>`;
  const title = make("h1", "mem-title");
  title.setAttribute("aria-label", m.title);
  let i = 0;
  m.title.split(" ").filter(Boolean).forEach((word, w) => {
    const group = make("span", "mem-word");
    group.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const span = make("span", "", ch);
      span.style.setProperty("--i", i++);
      group.append(span);
    });
    if (w) title.append(" ");
    title.append(group);
    i++;
  });
  inner.append(emblem, make("p", "mem-kicker", m.kicker), title);
  const since = yearOf(m.timeline?.[0]?.date);
  if (since) inner.append(make("p", "mem-since", `з ${since} року`));
  stage.append(media, beams, ring, make("div", "mem-grain"), inner);
  hero.append(stage);

  const blocks = [hero];

  if (m.motto) {
    const sec = memSection("mem-motto", "Девіз музею");
    if (m.mottoPhoto) {
      const bg = make("div", "mem-bg");
      bg.append(memImg(m.mottoPhoto, "md"));
      sec.prepend(bg);
    }
    const quote = make("blockquote", "mem-quote");
    m.motto.split("\n").filter(Boolean).forEach((line, n) => quote.append(reveal(make("span", "", line), 260 * (n + 1))));
    sec.append(quote);
    if (m.mottoNote) sec.append(reveal(make("p", "mem-note", m.mottoNote), 1300));
    blocks.push(sec);
  }

  if (chronicle.length) blocks.push(chronicleSection(m.chronicleTitle, chronicle));
  const war = (m.war || []).filter((c) => c.src);
  if (war.length) blocks.push(chronicleSection(m.warTitle, war, "mem-modern"));

  if (m.intro?.length || m.timeline?.length || head) {
    const sec = memSection("mem-history", "Історія");
    (m.intro || []).forEach((p) => sec.append(memWords(p)));
    if (m.timeline?.length) {
      const years = reveal(make("ol", "mem-years"));
      m.timeline.forEach((step, n) => {
        const li = reveal(make("li"), 300 * n);
        const year = yearOf(step.date);
        li.append(year ? flapNumber(year) : make("span", "mem-year", step.date));
        const day = year ? step.date.replace(year, "").trim() : "";
        if (day) li.append(make("time", "", day));
        if (step.text) li.append(make("span", "mem-year-text", step.text));
        years.append(li);
      });
      sec.append(years);
    }
    if (head) {
      const card = reveal(link(teacherUrl(head), "mem-keeper"), 200);
      card.append(memImg(head.photo || initialsPhoto(head.name || head.short), "sm"), make("small", "", "Керівник музею"), make("b", "", head.name || head.short));
      const note = head.category?.includes("заслужений") ? "заслужений вчитель України" : head.role;
      if (note) card.append(make("span", "", note));
      sec.append(card);
    }
    blocks.push(sec);
  }

  if (m.halls || m.photos?.length) {
    const sec = memSection("mem-halls", "Експозиція");
    if (m.halls) sec.append(reveal(make("p", "mem-lead", m.halls)));
    const grid = make("div", "mem-photos");
    (m.photos || []).forEach((photo, n) => grid.append(memPhoto(photo, n % 2 ? "tilt-right" : "tilt-left")));
    sec.append(grid);
    blocks.push(sec);
  }

  if (m.exposition?.length) {
    const n = m.exposition.length;
    const sec = make("section", "mem-exposition");
    sec.style.setProperty("--n", n);
    const view = make("div", "mem-exp-view");
    const aside = make("div", "mem-exp-aside");
    const count = make("p", "mem-count");
    count.setAttribute("aria-hidden", "true");
    count.append(make("b", "", "01"), make("span", "", `з ${pad2(n)}`));
    aside.append(
      make("h2", "mem-heading", "Розділи експозиції"),
      make("p", "mem-exp-lead", `Експозиція поділена на ${n} ${plural(n, "розділ", "розділи", "розділів")}. Кожен розповідає окрему історію.`),
      count,
    );
    const drum = make("div", "mem-drum");
    const wheel = make("ol", "mem-wheel");
    m.exposition.forEach((item, k) => {
      const li = make("li");
      li.append(make("span", "mem-credit-num", `Розділ ${k + 1}`), make("span", "mem-credit", item));
      wheel.append(li);
    });
    drum.append(wheel);
    view.append(aside, drum);
    sec.append(view);
    blocks.push(sec);
  }

  const closing = memSection("mem-closing");
  if (m.closingPhoto) closing.append(memPhoto({ src: m.closingPhoto, alt: "" }, "mem-poster"));
  const words = make("div", "mem-closing-text");
  if (m.closingQuote) words.append(reveal(make("p", "mem-closing-quote", m.closingQuote), 200));
  if (m.closing) {
    const flame = make("span", "mem-candle");
    flame.setAttribute("aria-hidden", "true");
    words.append(reveal(flame, 500), reveal(make("p", "mem-closing-word", m.closing), 700));
  }
  closing.append(words);
  blocks.push(closing);

  const end = make("div", "mem-end");
  const up = glassButton("mem-up", "Нагору", ARROW_UP);
  up.addEventListener("click", () => window.scrollTo({ top: 0, behavior: memReduced.matches ? "auto" : "smooth" }));
  end.append(up);
  blocks.push(end);

  memoryPage.replaceChildren(...blocks);
  watchReveals();
  updateMemoryScene();
}

let revealObserver = null;
function watchReveals() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("mem-years")) runFlaps(e.target);
      revealObserver.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  memoryPage.querySelectorAll(".mem-reveal, .mem-words").forEach((node) => revealObserver.observe(node));
}

const CHRON_GAP = 1400;
const CHRON_INTRO = 700;
const DRUM_STEP = 24;

function sceneProgress(sec, vh) {
  const r = sec.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - vh));
}
const onScreen = (r, vh) => r.bottom > 0 && r.top < vh;

function updateChronicle(sec, vh) {
  const items = sec.querySelectorAll(".mem-chron-item");
  const cam = sceneProgress(sec, vh) * ((items.length + 0.6) * CHRON_GAP + CHRON_INTRO);
  sec.querySelector(".mem-chron-intro").style.opacity = clamp01(1 - cam / CHRON_INTRO).toFixed(3);
  let year = "";
  items.forEach((fig, n) => {
    const z = cam - CHRON_INTRO - (n + 1) * CHRON_GAP;
    const shown = clamp01((z + 1.4 * CHRON_GAP) / (0.4 * CHRON_GAP)) * clamp01(1 - z / 500);
    fig.style.opacity = shown.toFixed(3);
    fig.style.transform = `translate3d(var(--x), var(--y), ${Math.round(z)}px) rotateY(var(--ry))`;
    const near = z > -1000 && z < 350;
    fig.classList.toggle("near", near);
    if (near && fig.dataset.year) year = fig.dataset.year;
  });
  const big = sec.querySelector(".mem-chron-year");
  if (year && big.textContent !== year) big.textContent = year;
  big.classList.toggle("on", Boolean(year));
}

function updateDrum(sec, vh) {
  const items = sec.querySelectorAll(".mem-wheel li");
  const cur = sceneProgress(sec, vh) * (items.length - 1);
  items.forEach((li, n) => {
    const off = n - cur;
    const a = Math.abs(off);
    li.style.transform = `rotateX(${(-off * DRUM_STEP).toFixed(2)}deg) translateZ(var(--r))`;
    li.style.opacity = clamp01(1 - a * 0.34).toFixed(3);
    li.style.filter = a < 0.15 ? "none" : `blur(${Math.min(6, a * 2.4).toFixed(1)}px)`;
    li.classList.toggle("lit", a < 0.5);
  });
  sec.querySelector(".mem-count b").textContent = pad2(Math.round(cur) + 1);
}

let memQueued = false;
function updateMemoryScene() {
  memQueued = false;
  if (document.body.dataset.page !== "memory" || memReduced.matches) return;
  const vh = innerHeight;
  const hero = memoryPage.querySelector(".mem-hero");
  if (hero && onScreen(hero.getBoundingClientRect(), vh)) hero.style.setProperty("--p", sceneProgress(hero, vh).toFixed(4));
  memoryPage.querySelectorAll(".mem-bg").forEach((bg) => {
    const r = bg.parentElement.getBoundingClientRect();
    if (onScreen(r, vh)) bg.style.setProperty("--shift", `${((r.top + r.height / 2 - vh / 2) * -0.3).toFixed(1)}px`);
  });
  memoryPage.querySelectorAll(".mem-chronicle").forEach((chron) => {
    if (onScreen(chron.getBoundingClientRect(), vh)) updateChronicle(chron, vh);
  });
  const exp = memoryPage.querySelector(".mem-exposition");
  if (exp && onScreen(exp.getBoundingClientRect(), vh)) updateDrum(exp, vh);
}

function queueMemoryScene() {
  if (memQueued || document.body.dataset.page !== "memory") return;
  memQueued = true;
  requestAnimationFrame(updateMemoryScene);
}
window.addEventListener("scroll", queueMemoryScene, { passive: true });
window.addEventListener("resize", queueMemoryScene);
window.addEventListener("pagechange", queueMemoryScene);

const teacherPage = document.getElementById("teacher-page");
const mkPage = document.getElementById("mk-page");

function findTeacher(id) {
  return content.teachers.find((t) => teacherSlug(t) === id);
}

function findMk(id) {
  return id ? (content.mk || []).find((m) => m.id === id) : null;
}

function mkMembers(mk) {
  return content.teachers.filter((t) => teacherMk(t) === mk.id);
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href, className, text) {
  const a = make("a", className, text);
  a.href = href;
  return a;
}

const teacherUrl = (t) => `#/teachers/${encodeURIComponent(teacherSlug(t))}`;
const mkUrl = (mk) => `#/mk/${encodeURIComponent(mk.id)}`;
const shorten = (text, n) => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

function zoomPhoto(className, src, alt, size) {
  const button = make("button", className);
  button.type = "button";
  button.setAttribute("aria-label", `Відкрити фото${alt ? `: ${alt}` : ""}`);
  const img = make("img");
  img.alt = alt || "";
  img.loading = "lazy";
  setPhoto(img, src, size);
  button.append(img);
  button.addEventListener("click", () => openLightbox(src, img.alt));
  return button;
}

function panorama(photos) {
  const wrap = make("div", "panorama");
  const track = make("div", "panorama-track");
  track.append(...photos.map((p) => zoomPhoto("panorama-item", p.src, p.alt, "md")));
  const prev = make("button", "panorama-btn prev", "‹");
  const next = make("button", "panorama-btn next", "›");
  prev.type = next.type = "button";
  prev.setAttribute("aria-label", "Попередні фото");
  next.setAttribute("aria-label", "Наступні фото");
  const update = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  const step = (d) => track.scrollBy({ left: d * track.clientWidth * 0.8, behavior: "smooth" });
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  track.querySelectorAll("img").forEach((img) => img.addEventListener("load", update));
  requestAnimationFrame(update);
  wrap.append(track, prev, next);
  return wrap;
}

function profileCard(title, className = "") {
  const card = make("section", `profile-card ${className}`.trim());
  if (title) card.append(make("h2", "", title));
  return card;
}

function memberChips(mk, currentId) {
  const box = make("div", "mk-members");
  mkMembers(mk).forEach((t) => {
    const chip = link(teacherUrl(t), `mk-member${teacherSlug(t) === currentId ? " current" : ""}`);
    const img = make("img");
    img.alt = "";
    img.loading = "lazy";
    setPhoto(img, t.photo || initialsPhoto(t.name || t.short), "sm");
    chip.append(img, make("span", "", t.short || t.name));
    box.append(chip);
  });
  return box;
}

function renderTeacherPage(t) {
  const mk = findMk(teacherMk(t));
  const name = t.name || t.short || "";

  const main = make("article", "profile-card profile-main");
  const photo = t.photo
    ? zoomPhoto("profile-photo", t.photo, name, "sm")
    : make("div", "profile-photo");
  if (!t.photo) {
    const img = make("img");
    img.alt = name;
    img.src = initialsPhoto(name);
    photo.append(img);
  }
  const text = make("div", "profile-text");
  if (t.role) text.append(make("span", "teacher-role", t.role));
  text.append(make("h1", "profile-name", name));
  if (t.subject) text.append(make("p", "profile-subject", t.subject));
  const facts = make("dl", "profile-facts");
  [["category", "Категорія, звання"], ["theme", "Методична тема"]].forEach(([key, label]) => {
    if (!t[key]) return;
    const row = make("div");
    row.append(make("dt", "", label), make("dd", "", t[key]));
    facts.append(row);
  });
  if (mk) {
    const row = make("div");
    const dd = make("dd");
    dd.append(link(mkUrl(mk), "", mk.title));
    row.append(make("dt", "", "Методична комісія"), dd);
    facts.append(row);
  }
  if (facts.children.length) text.append(facts);
  if (t.credo) text.append(make("blockquote", "profile-credo", t.credo));
  main.append(photo, text);

  const blocks = [link("#/teachers", "back-pill", "Усі вчителі"), main];
  const materials = materialButtons(t.materials || []);
  if (materials) {
    const card = profileCard("Матеріали");
    card.append(materials);
    blocks.push(card);
  }
  (t.portfolio || []).forEach((section) => {
    const card = portfolioSection(section);
    if (card) blocks.push(card);
  });
  if (t.about?.length) {
    const about = profileCard("Про себе");
    about.append(...t.about.map((p) => make("p", "", p)));
    blocks.push(about);
  }
  if (t.photos?.length) {
    const gallery = profileCard("Фото");
    gallery.append(panorama(t.photos));
    blocks.push(gallery);
  }
  if (mk) {
    const teaser = profileCard("", "mk-teaser");
    teaser.append(make("span", "mk-kicker", "Методична комісія"), make("h2", "", mk.title));
    const intro = (mk.sections || []).find((sec) => sec.text?.length)?.text[0];
    if (intro) teaser.append(make("p", "", shorten(intro, 280)));
    teaser.append(memberChips(mk, teacherSlug(t)), link(mkUrl(mk), "doc-btn primary", "Сторінка комісії →"));
    blocks.push(teaser);
  }

  const list = content.teachers;
  const i = list.indexOf(t);
  const pager = make("nav", "profile-pager");
  pager.setAttribute("aria-label", "Інші вчителі");
  if (list[i - 1]) pager.append(link(teacherUrl(list[i - 1]), "pager-link prev", list[i - 1].short || list[i - 1].name));
  if (list[i + 1]) pager.append(link(teacherUrl(list[i + 1]), "pager-link next", list[i + 1].short || list[i + 1].name));
  blocks.push(pager);

  teacherPage.replaceChildren(...blocks);
}

const LINK_ICON = '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>';

function materialButtons(items) {
  const grid = make("div", "materials");
  items.forEach((m) => {
    if (!m.file && !(m.url || "").trim()) {
      const soon = make("span", "material soon");
      soon.setAttribute("aria-disabled", "true");
      const icon = make("span", "material-icon");
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINK_ICON}</svg>`;
      const text = make("span", "material-text");
      text.append(make("b", "", m.label || "Матеріал"), make("small", "", "Незабаром"));
      soon.append(icon, text);
      grid.append(soon);
      return;
    }
    const href = m.file ? fileUrl(m.file) : safeUrl(m.url);
    if (!href) return;
    const a = link(href, "material");
    const internal = href.startsWith("#");
    if (!internal) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    const type = m.file ? fileType(m.file) : "";
    if (href.startsWith("blob:") && type !== "pdf") a.download = `${m.label || "файл"}.${type}`;
    const icon = make("span", "material-icon");
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.file ? icons.doc : LINK_ICON}</svg>`;
    const text = make("span", "material-text");
    let note = type ? `${type.toUpperCase()}-файл` : "";
    if (internal) note = "Сторінка сайту";
    else if (!m.file) {
      try { note = new URL(href, location.href).hostname.replace(/^www\./, ""); } catch {}
    }
    text.append(make("b", "", m.label || "Матеріал"), make("small", "", note));
    a.append(icon, text, make("span", "material-go", internal ? "→" : "↗"));
    grid.append(a);
  });
  return grid.children.length ? grid : null;
}

function portfolioSection(section) {
  const items = section.items || [];
  const cards = items.filter((it) => it.photo || it.text);
  const buttons = materialButtons(items.filter((it) => !it.photo && !it.text).map((it) => ({ ...it, label: it.title })));
  if (!cards.length && !buttons) return null;
  const card = profileCard(section.title);
  if (cards.length) {
    const grid = make("div", "portfolio");
    cards.forEach((it) => {
      const item = make("article", "portfolio-item");
      if (it.photo) item.append(zoomPhoto("portfolio-photo", it.photo, it.title, "sm"));
      const body = make("div", "portfolio-body");
      body.append(make("h3", "", it.title || ""));
      if (it.text) body.append(make("p", "", it.text));
      const href = it.file ? fileUrl(it.file) : safeUrl(it.url);
      if (href) {
        const a = link(href, "doc-btn primary", "Переглянути ↗");
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        body.append(a);
      }
      item.append(body);
      grid.append(item);
    });
    card.append(grid);
  }
  if (buttons) card.append(buttons);
  return card;
}

const mkPhotos = (mk) => mk.photos || (mk.photo ? [{ src: mk.photo, alt: mk.title }] : []);
const twoDigits = (n) => String(n).padStart(2, "0");
let mkSpy = null;

function photoRow(photos, className = "") {
  const row = make("div", `photo-row ${className}`.trim());
  photos.forEach((p) => {
    const item = zoomPhoto("photo-row-item", p.src, p.alt, "md");
    const img = item.querySelector("img");
    const fit = () => {
      if (!img.naturalWidth) return;
      const r = img.naturalWidth / img.naturalHeight;
      item.style.setProperty("--r", r.toFixed(3));
      item.classList.toggle("wide", r > 1.2);
    };
    img.addEventListener("load", fit);
    fit();
    row.append(item);
  });
  return row;
}

function sectionPhotos(photos) {
  if (photos.length === 1) return zoomPhoto("mk-figure", photos[0].src, photos[0].alt, "md");
  return photos.length <= 4 ? photoRow(photos) : panorama(photos);
}

function mkQuote(sec, className) {
  const quote = make("blockquote", className);
  quote.append(make("p", "", sec.quote.replace(/^[«"]\s*|\s*[»"]$/g, "")));
  if (sec.quoteAuthor) quote.append(make("cite", "", sec.quoteAuthor));
  return quote;
}

function renderMkPage(mk) {
  mkSpy?.disconnect();
  const sections = (mk.sections || []).filter((sec) => sec.title || sec.quote || sec.text?.length || sec.list?.length || sec.photos?.length);
  const first = sections[0];
  const intro = first && !first.title && !first.quote && first.text?.length ? first : null;
  const introText = intro ? intro.text.join(" ") : "";
  const lead = intro && introText.length <= 360 ? intro.text : [];
  const members = mkMembers(mk).sort((a, b) => (teacherSlug(b) === mk.head) - (teacherSlug(a) === mk.head));
  const head = members.find((t) => teacherSlug(t) === mk.head);
  const photos = mkPhotos(mk).filter((p) => p.src);
  const blocks = [link("#/teachers", "back-pill", "Усі вчителі")];

  const hero = make("section", `mk-hero profile-card${photos.length === 2 ? "" : photos.length ? " single" : " bare"}`);
  const text = make("div", "mk-hero-text");
  text.append(make("span", "mk-kicker", "Методична комісія"), make("h1", "mk-title", mk.title));
  lead.forEach((p) => text.append(make("p", "mk-lead", p)));
  const facts = make("div", "mk-facts");
  if (members.length) {
    const count = make("button", "mk-fact");
    count.type = "button";
    count.append(make("b", "", String(members.length)), make("span", "", plural(members.length, "вчитель", "вчителі", "вчителів")));
    count.addEventListener("click", () => mkPage.querySelector(".mk-team-card")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    facts.append(count);
  }
  if (head) {
    const chip = link(teacherUrl(head), "mk-fact mk-fact-head");
    const img = make("img");
    img.alt = "";
    setPhoto(img, head.photo || initialsPhoto(head.name || head.short), "xs");
    const who = make("span", "mk-fact-who");
    who.append(make("small", "", "Голова комісії"), make("b", "", head.short || head.name));
    chip.append(img, who);
    facts.append(chip);
  }
  if (facts.children.length) text.append(facts);
  hero.append(text);
  if (photos.length) {
    const box = make("div", `mk-hero-photos n${Math.min(photos.length, 3)}`);
    if (photos.length <= 2) box.append(...photos.map((p) => zoomPhoto("mk-hero-photo", p.src, p.alt || mk.title, "md")));
    else box.append(photoRow(photos));
    hero.append(box);
  }
  blocks.push(hero);

  const rest = sections.filter((sec) => sec !== intro);
  const mottos = rest.filter((sec) => sec.quote && !sec.title && !sec.text?.length && !sec.list?.length && !sec.photos?.length);
  mottos.forEach((sec) => {
    const motto = make("section", "mk-motto");
    motto.append(mkQuote(sec, "mk-motto-quote"));
    blocks.push(motto);
  });

  if (members.length) {
    const team = make("section", "mk-team-card profile-card");
    team.append(make("h2", "", "Склад комісії"));
    const grid = make("div", "mk-team");
    members.forEach((t) => {
      const isHead = teacherSlug(t) === mk.head;
      const card = link(teacherUrl(t), `mk-person${isHead ? " head" : ""}`);
      const pic = make("span", "mk-person-photo");
      const img = make("img");
      img.alt = "";
      img.loading = "lazy";
      setPhoto(img, t.photo || initialsPhoto(t.name || t.short), "sm");
      pic.append(img);
      if (isHead) pic.append(make("small", "mk-head-badge", "Голова комісії"));
      const info = make("span", "mk-person-text");
      info.append(make("b", "", t.name || t.short), make("span", "", t.subject || t.role || ""));
      card.append(pic, info);
      grid.append(card);
    });
    team.append(grid);
    blocks.push(team);
  }

  const features = rest.filter((sec) => sec.quote && !sec.title && !mottos.includes(sec));
  features.forEach((sec) => {
    const card = make("section", "mk-feature profile-card");
    card.append(mkQuote(sec, "mk-feature-quote"));
    (sec.text || []).forEach((p) => card.append(make("p", "", p)));
    if (sec.photos?.length) card.append(sec.photos.length <= 4 ? photoRow(sec.photos, "mk-feature-photos") : panorama(sec.photos));
    blocks.push(card);
  });

  const chapters = rest.filter((sec) => !mottos.includes(sec) && !features.includes(sec));
  if (intro && !lead.length) chapters.unshift({ ...intro, title: "Про комісію" });
  if (chapters.length) {
    const wrap = make("div", `mk-chapters${chapters.length >= 3 ? " with-toc" : ""}`);
    const toc = make("nav", "mk-toc");
    toc.setAttribute("aria-label", "Розділи сторінки");
    toc.append(make("span", "mk-toc-title", "Розділи"));
    const list = make("div", "mk-chapter-list");
    const tocLinks = new Map();
    chapters.forEach((sec, i) => {
      const card = make("section", "mk-chapter profile-card");
      const title = sec.title || "Без назви";
      const top = make("div", "mk-chapter-head");
      top.append(make("span", "mk-chapter-num", twoDigits(i + 1)), make("h2", "", title));
      card.append(top);
      if (sec.quote) card.append(mkQuote(sec, "mk-quote"));
      (sec.text || []).forEach((p) => card.append(make("p", "", p)));
      if (sec.list?.length) {
        const ol = make("ol", "mk-list");
        ol.append(...sec.list.map((item) => make("li", "", item)));
        card.append(ol);
      }
      if (sec.photos?.length) card.append(sectionPhotos(sec.photos));
      list.append(card);
      const go = make("button", "mk-toc-link");
      go.type = "button";
      go.append(make("span", "", twoDigits(i + 1)), make("b", "", title));
      go.addEventListener("click", () => card.scrollIntoView({ behavior: "smooth", block: "start" }));
      toc.append(go);
      tocLinks.set(card, go);
    });
    if (chapters.length >= 3) {
      wrap.append(toc);
      mkSpy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          tocLinks.forEach((btn, card) => btn.classList.toggle("active", card === e.target));
        });
      }, { rootMargin: "-35% 0px -60% 0px" });
      tocLinks.forEach((_, card) => mkSpy.observe(card));
    }
    wrap.append(list);
    blocks.push(wrap);
  }

  mkPage.replaceChildren(...blocks);
}

function renderContent() {
  renderHome();
  renderSport();
  renderTeachers();
  renderInfo();
  renderContacts();
  if (currentRoute?.page === "memory" || currentRoute?.page === "first") renderRoutePage(currentRoute);
  if (currentRoute?.param) {
    const gone = currentRoute.page === "teacher" ? !findTeacher(currentRoute.param) : !findMk(currentRoute.param);
    if (gone) location.replace("#/teachers");
    else renderRoutePage(currentRoute);
  }
}
renderContent();
route();

const particles = (() => {
  const toggle = document.querySelector(".leaves-toggle");
  const canvas = document.querySelector(".leaves");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const labels = {
    leaves: { off: "Вимкнути листя", on: "Увімкнути листя", aria: "падаюче листя" },
    snow: { off: "Вимкнути сніг", on: "Увімкнути сніг", aria: "сніг" },
  };
  let mode = "none";
  let enabled = true;
  let sizeKey = "";
  const state = {};
  let post = null;
  let starting = false;

  function send(msg) {
    Object.assign(state, msg);
    if (post) post(msg);
    else start();
  }

  function onMainThread() {
    const boot = () => {
      const engine = particleEngine(canvas, (s) => {
        const c = document.createElement("canvas");
        c.width = c.height = s;
        return c;
      });
      post = (msg) => applyParticles(engine, msg);
      post(state);
    };
    if (window.particleEngine) return boot();
    const script = document.createElement("script");
    script.src = "particles.js";
    script.onload = boot;
    document.head.append(script);
  }

  function start() {
    if (starting) return;
    starting = true;
    if (!window.Worker || !canvas.transferControlToOffscreen || !window.OffscreenCanvas) return onMainThread();
    let worker;
    try {
      worker = new Worker("particles.js");
    } catch {
      return onMainThread();
    }
    const fallback = () => {
      clearTimeout(timer);
      worker.terminate();
      if (!post) onMainThread();
    };
    const timer = setTimeout(fallback, 3000);
    worker.addEventListener("error", fallback);
    worker.addEventListener("message", (e) => {
      if (e.data !== "ready" || post) return;
      clearTimeout(timer);
      worker.removeEventListener("error", fallback);
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ ...state, canvas: offscreen }, [offscreen]);
      post = (msg) => worker.postMessage(msg);
    });
  }

  function measure() {
    if (canvas.hidden) return;
    const size = [canvas.clientWidth, canvas.clientHeight, Math.min(window.devicePixelRatio || 1, 2)];
    const key = size.join("x");
    if (key === sizeKey || !size[0]) return;
    sizeKey = key;
    send({ size });
  }

  function run() {
    const active = enabled && mode !== "none" && !reduced && !document.hidden && document.body.dataset.page !== "memory";
    canvas.hidden = !active;
    if (active) measure();
    if (active || post) send({ run: active });
  }

  function updateToggle() {
    toggle.hidden = mode === "none" || reduced;
    toggle.dataset.mode = mode;
    if (mode === "none") return;
    const l = labels[mode];
    toggle.classList.toggle("off", !enabled);
    toggle.setAttribute("aria-pressed", String(!enabled));
    toggle.dataset.tip = enabled ? l.off : l.on;
    toggle.setAttribute("aria-label", `${enabled ? "Вимкнути" : "Увімкнути"} ${l.aria}`);
  }

  function setMode(next, on = true) {
    mode = next;
    enabled = on;
    updateToggle();
    if (mode !== "none" || post) send({ mode });
    run();
  }

  window.addEventListener("pagechange", run);
  document.addEventListener("visibilitychange", run);
  toggle.addEventListener("click", () => {
    enabled = !enabled;
    updateToggle();
    run();
  });
  let resizeQueued = false;
  window.addEventListener("resize", () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      measure();
    });
  });

  const seasonModes = { halloween: "leaves", winter: "snow", normal: "none" };
  return { setMode, seasonModes };
})();

function applySiteSettings() {
  const site = siteSettings();
  const root = document.documentElement;
  const season = !site.season || site.season === "auto" ? autoSeason() : site.season;
  root.dataset.season = season;
  if (site.accent) {
    root.style.setProperty("--accent", site.accent);
    root.style.setProperty("--accent-strong", `color-mix(in srgb, ${site.accent} 78%, var(--text))`);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-strong");
  }
  particles.setMode(particles.seasonModes[season], site.particlesOn !== false);
}
applySiteSettings();

let draftShown = false;

function loadDraft() {
  let mark = null;
  try { mark = localStorage.getItem(DRAFT_KEY); } catch {}
  if (!mark || !window.indexedDB) return showDraft({});
  const req = indexedDB.open(DRAFT_DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore("kv");
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("kv");
    const kv = tx.objectStore("kv");
    const saved = {};
    kv.get("news").onsuccess = (e) => (saved.news = e.target.result);
    kv.get("content").onsuccess = (e) => (saved.content = e.target.result);
    tx.oncomplete = () => {
      db.close();
      showDraft(saved);
    };
  };
}

function showDraft(saved) {
  const has = Array.isArray(saved.news) || (saved.content && typeof saved.content === "object");
  if (!has && !draftShown) return;
  draftShown = has;
  news = Array.isArray(saved.news) ? saved.news : published.news || defaultNews;
  content = { ...baseContent, ...(has ? saved.content : {}) };
  refreshNews();
  renderContent();
}

loadDraft();
window.addEventListener("storage", (e) => {
  if (e.key === SETTINGS_KEY) applySiteSettings();
  if (e.key === DRAFT_KEY) loadDraft();
});

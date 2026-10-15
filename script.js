"use strict";

const STORAGE_KEYS = { tasks: "daymark.tasks.v1", theme: "daymark.theme.v1" };
const STATUSES = ["todo", "in-progress", "completed"];
const STATUS_LABELS = { todo: "To do", "in-progress": "In progress", completed: "Completed" };
const CATEGORIES = ["Development", "Design", "Marketing", "Operations", "Personal"];
const PRIORITIES = ["Low", "Medium", "High"];

const taskForm = document.querySelector("#task-form");
const taskDialog = document.querySelector("#task-dialog");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const categoryInput = document.querySelector("#task-category");
const priorityInput = document.querySelector("#task-priority");
const statusInput = document.querySelector("#task-status");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const liveRegion = document.querySelector("#live-region");
const themeToggle = document.querySelector("#theme-toggle");
let tasks = loadTasks();
let draggedTaskId = null;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((task) => task && typeof task.id === "string" && typeof task.title === "string")
      .map((task) => ({
        id: task.id,
        title: task.title.slice(0, 100),
        description: typeof task.description === "string" ? task.description.slice(0, 500) : "",
        category: CATEGORIES.includes(task.category) ? task.category : "Personal",
        priority: PRIORITIES.includes(task.priority) ? task.priority : "Medium",
        status: STATUSES.includes(task.status) ? task.status : "todo",
        createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
      }));
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  } catch {
    announce("Your browser could not save changes. Check available storage space.");
  }
}

function announce(message) {
  liveRegion.textContent = "";
  window.setTimeout(() => { liveRegion.textContent = message; }, 20);
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDialog(status = "todo") {
  statusInput.value = STATUSES.includes(status) ? status : "todo";
  taskForm.reset();
  statusInput.value = STATUSES.includes(status) ? status : "todo";
  taskDialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

document.querySelector("#open-task-form").addEventListener("click", () => openDialog());
document.querySelectorAll("[data-add-status]").forEach((button) => {
  button.addEventListener("click", () => openDialog(button.dataset.addStatus));
});
document.querySelector("#close-dialog").addEventListener("click", () => taskDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => taskDialog.close());
taskDialog.addEventListener("click", (event) => {
  if (event.target === taskDialog) taskDialog.close();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  const task = {
    id: makeId(),
    title,
    description: descriptionInput.value.trim(),
    category: CATEGORIES.includes(categoryInput.value) ? categoryInput.value : "Personal",
    priority: PRIORITIES.includes(priorityInput.value) ? priorityInput.value : "Medium",
    status: STATUSES.includes(statusInput.value) ? statusInput.value : "todo",
    createdAt: Date.now()
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
  taskDialog.close();
  taskForm.reset();
  announce(`Added ${task.title} to ${STATUS_LABELS[task.status]}.`);
});

searchInput.addEventListener("input", renderTasks);
categoryFilter.addEventListener("change", renderTasks);

function makeTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.dataset.priority = task.priority;
  card.dataset.taskId = task.id;
  card.draggable = true;
  card.setAttribute("aria-label", `${task.title}, ${task.priority} priority, ${task.category}`);

  const titleRow = document.createElement("div");
  titleRow.className = "task-title-row";
  const title = document.createElement("h4");
  title.className = "task-card-title";
  title.textContent = task.title;
  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = task.priority;
  titleRow.append(title, priority);
  card.append(titleRow);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    card.append(description);
  }

  const metadata = document.createElement("div");
  metadata.className = "task-meta";
  const category = document.createElement("span");
  category.className = "category-chip";
  category.textContent = task.category;
  const date = document.createElement("time");
  date.className = "task-date";
  date.dateTime = new Date(task.createdAt).toISOString();
  date.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(task.createdAt);
  metadata.append(category, date);
  card.append(metadata);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const status = document.createElement("label");
  status.className = "visually-hidden";
  status.htmlFor = `status-${task.id}`;
  status.textContent = `Move ${task.title} to`;
  const select = document.createElement("select");
  select.className = "status-select";
  select.id = `status-${task.id}`;
  select.setAttribute("aria-label", `Move ${task.title} to`);
  STATUSES.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = STATUS_LABELS[value];
    option.selected = value === task.status;
    select.append(option);
  });
  select.addEventListener("change", () => moveTask(task.id, select.value));
  const remove = document.createElement("button");
  remove.className = "delete-task";
  remove.type = "button";
  remove.textContent = "Delete";
  remove.setAttribute("aria-label", `Delete ${task.title}`);
  remove.addEventListener("click", () => deleteTask(task.id));
  actions.append(status, select, remove);
  card.append(actions);

  card.addEventListener("dragstart", (event) => {
    draggedTaskId = task.id;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".column.drag-over").forEach((column) => column.classList.remove("drag-over"));
    draggedTaskId = null;
  });
  return card;
}

function moveTask(id, status) {
  if (!STATUSES.includes(status)) return;
  const task = tasks.find((item) => item.id === id);
  if (!task || task.status === status) return;
  task.status = status;
  saveTasks();
  renderTasks();
  announce(`Moved ${task.title} to ${STATUS_LABELS[status]}.`);
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  renderTasks();
  announce(`Deleted ${task.title}.`);
}

document.querySelectorAll(".column").forEach((column) => {
  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    column.classList.add("drag-over");
  });
  column.addEventListener("dragleave", (event) => {
    if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
  });
  column.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drag-over");
    const id = event.dataTransfer.getData("text/plain") || draggedTaskId;
    moveTask(id, column.dataset.status);
  });
});

function renderTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const selectedCategory = categoryFilter.value;
  const lists = Object.fromEntries(STATUSES.map((status) => [status, document.querySelector(`#list-${status}`)]));
  Object.values(lists).forEach((list) => { list.replaceChildren(); });
  const counts = { todo: 0, "in-progress": 0, completed: 0 };
  const visibleTasks = tasks.filter((task) =>
    task.title.toLocaleLowerCase().includes(query) &&
    (selectedCategory === "All" || task.category === selectedCategory)
  );

  visibleTasks.forEach((task) => {
    counts[task.status] += 1;
    lists[task.status].append(makeTaskCard(task));
  });

  STATUSES.forEach((status) => {
    document.querySelector(`#count-${status}`).textContent = counts[status];
    if (counts[status] === 0 && !query && selectedCategory === "All") {
      const hint = document.createElement("p");
      hint.className = "empty-column";
      hint.textContent = status === "todo" ? "A fresh start. Add your first task." : "Your tasks will find their way here.";
      lists[status].append(hint);
    }
  });

  const active = counts.todo + counts["in-progress"];
  document.querySelector("#active-total").textContent = active;
  document.querySelector("#completed-total").textContent = counts.completed;
  document.querySelector("#active-caption").textContent = active === 1 ? "one thing in motion" : active ? "things in motion" : "Ready when you are";
  document.querySelector("#completed-caption").textContent = counts.completed === 1 ? "one lovely little win" : counts.completed ? "lovely little wins" : "Every win counts";
  document.querySelector("#board-total").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  document.querySelector("#nav-total").textContent = tasks.length;
  document.querySelector("#board-empty").hidden = visibleTasks.length > 0 || tasks.length === 0;
}

function setTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  themeToggle.setAttribute("aria-pressed", String(dark));
  document.querySelector("#theme-label").textContent = dark ? "Light appearance" : "Dark appearance";
  document.querySelector("#theme-icon").textContent = dark ? "☼" : "☾";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#171821" : "#f7f8fc";
}

try {
  setTheme(localStorage.getItem(STORAGE_KEYS.theme) || "light");
} catch {
  setTheme("light");
}
themeToggle.addEventListener("click", () => {
  const theme = document.body.classList.contains("dark") ? "light" : "dark";
  setTheme(theme);
  try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch { /* Theme still applies for this visit. */ }
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric"
}).format(new Date());

renderTasks();

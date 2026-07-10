// Generic right-click context menu, reused across the app (currently the
// Explorer table has its own similar implementation; this shared version is
// meant for every new usage going forward). Reuses the existing
// .context-menu / .context-menu button styling already in styles.css.
let activeMenu = null;

export function showContextMenu(items, event) {
  hideContextMenu();
  if (!items || items.length === 0) return;

  event.preventDefault();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    button.addEventListener("click", (clickEvent) => {
      clickEvent.stopPropagation();
      hideContextMenu();
      item.action();
    });
    menu.append(button);
  });

  document.body.append(menu);
  activeMenu = menu;

  const { innerWidth, innerHeight } = window;
  const menuRect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, innerWidth - menuRect.width - 8);
  const top = Math.min(event.clientY, innerHeight - menuRect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

export function hideContextMenu() {
  activeMenu?.remove();
  activeMenu = null;
}

document.addEventListener("click", hideContextMenu);
document.addEventListener("scroll", hideContextMenu, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideContextMenu();
});

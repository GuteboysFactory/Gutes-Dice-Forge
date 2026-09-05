const MODULE_ID = "genesys-dice-forge";
const LAUNCHER_ID = "genesys-dice-forge-chat-launcher";
const LEGACY_SELECTOR = ".genesys-dice-forge-simulator-button";
const PANEL_SELECTOR = ".genesys-dice-forge-simulator";

let launcher = null;
let observer = null;
let resizeHandlerInstalled = false;

function simulatorEnabled() {
  try {
    return Boolean(game.settings.get(MODULE_ID, "showSimulator"));
  } catch (_) {
    return true;
  }
}

function isRollModeButton(button) {
  if (!(button instanceof HTMLElement)) return false;
  const text = `${button.title ?? ""} ${button.getAttribute("aria-label") ?? ""} ${button.dataset?.action ?? ""}`.toLowerCase();
  if (/public|gm roll|blind|self roll|roll mode/.test(text)) return true;
  return Boolean(button.querySelector(
    ".fa-globe, .fa-user-secret, .fa-eye-slash, .fa-user, .fa-mask, .fa-eye"
  ));
}

function findChatScope() {
  const messageInput = document.querySelector(
    "#chat-message, textarea[name='message'], textarea[placeholder*='Enter'], [contenteditable='true'][data-placeholder*='message']"
  );
  if (!messageInput) return document.querySelector("#chat, [data-tab='chat'], .chat-log") ?? null;

  return messageInput.closest(
    "#chat-form, form, #chat, [data-tab='chat'], .chat-log, [class*='chat-form'], [class*='chat-input']"
  ) ?? messageInput.parentElement?.parentElement ?? null;
}

function findRollModeGroup() {
  const scope = findChatScope();
  if (!scope) return null;

  const buttons = Array.from(scope.querySelectorAll("button"));
  const rollButtons = buttons.filter(isRollModeButton);
  if (rollButtons.length) {
    const parents = new Map();
    for (const button of rollButtons) {
      let node = button.parentElement;
      for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
        if (!scope.contains(node)) break;
        const count = Array.from(node.querySelectorAll(":scope > button, :scope > * > button")).filter(isRollModeButton).length;
        const previous = parents.get(node) ?? 0;
        parents.set(node, Math.max(previous, count));
      }
    }
    const best = Array.from(parents.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) return best;
    return rollButtons[rollButtons.length - 1].parentElement;
  }

  return scope.querySelector(
    "#chat-controls, .chat-controls, [class*='roll-mode'], [class*='rollmode'], [data-role='roll-mode']"
  );
}

function createLauncher() {
  const button = document.createElement("button");
  button.id = LAUNCHER_ID;
  button.type = "button";
  button.className = "genesys-dice-forge-chat-launcher";
  button.title = "Genesys Dice Forge";
  button.setAttribute("aria-label", "Open Genesys Dice Forge");
  button.innerHTML = '<i class="fa-solid fa-dice-d20" aria-hidden="true"></i>';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const legacy = document.querySelector(LEGACY_SELECTOR);
    if (legacy instanceof HTMLElement) {
      legacy.click();
      requestAnimationFrame(positionPanel);
      setTimeout(positionPanel, 0);
    } else {
      ui?.notifications?.warn?.("Genesys Dice Forge roller is not available right now.");
    }
  });
  return button;
}

function mountLauncher() {
  const legacy = document.querySelector(LEGACY_SELECTOR);
  if (legacy instanceof HTMLElement) legacy.classList.add("gdf-integrated-launcher-source");

  if (!simulatorEnabled()) {
    launcher?.remove();
    launcher = null;
    return false;
  }

  const group = findRollModeGroup();
  if (!group) return false;

  if (!launcher || !launcher.isConnected) launcher = createLauncher();
  if (launcher.parentElement !== group) group.appendChild(launcher);
  return true;
}

function positionPanel() {
  const panel = document.querySelector(PANEL_SELECTOR);
  if (!(panel instanceof HTMLElement) || panel.hidden || !launcher?.isConnected) return;

  const anchor = launcher.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = Math.min(420, viewportWidth - 24);

  panel.style.width = `${panelWidth}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";

  const measuredHeight = panel.getBoundingClientRect().height || 390;
  const left = Math.max(12, Math.min(anchor.left, viewportWidth - panelWidth - 12));
  let top = anchor.top - measuredHeight - 8;
  if (top < 12) top = Math.min(viewportHeight - measuredHeight - 12, anchor.bottom + 8);

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.max(12, Math.round(top))}px`;
}

function installObserver() {
  if (observer) return;
  let scheduled = false;
  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mountLauncher();
      positionPanel();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

Hooks.once("ready", () => {
  mountLauncher();
  installObserver();

  if (!resizeHandlerInstalled) {
    window.addEventListener("resize", positionPanel, { passive: true });
    resizeHandlerInstalled = true;
  }

  console.info("[Genesys Dice Forge] v0.7.7 chat-toolbar launcher active (Foundry v13/v14).");
});

Hooks.once("shutdown", () => {
  observer?.disconnect();
  observer = null;
  launcher?.remove();
  launcher = null;
  if (resizeHandlerInstalled) {
    window.removeEventListener("resize", positionPanel);
    resizeHandlerInstalled = false;
  }
});

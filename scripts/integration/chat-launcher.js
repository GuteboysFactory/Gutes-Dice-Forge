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

function findMessageInput() {
  return document.querySelector(
    "#chat-message, textarea[name='message'], textarea[placeholder*='Enter'], [contenteditable='true'][data-placeholder*='message']"
  );
}

function isVisibleNearInput(button, inputRect) {
  if (!(button instanceof HTMLElement)) return false;
  const rect = button.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  const centerY = rect.top + rect.height / 2;
  return centerY >= inputRect.top - 125 && centerY <= inputRect.top + 24;
}

function isRollModeButton(button) {
  if (!(button instanceof HTMLElement)) return false;
  const text = `${button.title ?? ""} ${button.getAttribute("aria-label") ?? ""} ${button.dataset?.action ?? ""}`.toLowerCase();
  if (/public|gm roll|blind|self roll|roll mode/.test(text)) return true;
  return Boolean(button.querySelector(
    ".fa-globe, .fa-user-secret, .fa-eye-slash, .fa-user, .fa-mask, .fa-eye"
  ));
}

function isChatUtilityButton(button) {
  if (!(button instanceof HTMLElement)) return false;
  const text = `${button.title ?? ""} ${button.getAttribute("aria-label") ?? ""} ${button.dataset?.action ?? ""}`.toLowerCase();
  if (/save|export|download|clear|delete|trash|flush/.test(text)) return true;
  return Boolean(button.querySelector(
    ".fa-floppy-disk, .fa-save, .fa-download, .fa-trash, .fa-trash-can, .fa-eraser"
  ));
}

function findChatScope() {
  const input = findMessageInput();
  if (!input) return document.querySelector("#chat, [data-tab='chat'], .chat-log") ?? null;

  // v0.7.7 stopped at the nearest <form>, which is often only the message box.
  // The toolbar in Foundry v13/v14 is a sibling above that form, so search for
  // a real chat container first and only use a wider ancestor as fallback.
  const explicit = input.closest(
    "#chat, [data-tab='chat'], .sidebar-tab[data-tab='chat'], .chat-sidebar, [class*='chat-log'], [class*='chat-content']"
  );
  if (explicit) return explicit;

  let node = input.parentElement;
  for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
    if (node.querySelectorAll?.("button").length >= 4) return node;
  }
  return input.parentElement?.parentElement ?? null;
}

function nearbyToolbarButtons(scope) {
  if (!scope) return [];
  const input = findMessageInput();
  const buttons = Array.from(scope.querySelectorAll("button"));
  if (!input) return buttons;
  const inputRect = input.getBoundingClientRect();
  return buttons.filter((button) => isVisibleNearInput(button, inputRect));
}

function findPlacement() {
  const scope = findChatScope();
  if (!scope) return null;

  const buttons = nearbyToolbarButtons(scope);

  // Preferred placement from the approved screenshot: immediately BEFORE the
  // Save/Delete controls on the right side of the chat toolbar.
  const utilityButtons = buttons
    .filter(isChatUtilityButton)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  if (utilityButtons.length) {
    const firstUtility = utilityButtons[0];
    const parent = firstUtility.parentElement;
    if (parent) return { parent, before: firstUtility, mode: "before-utilities" };
  }

  // Fallback: attach immediately after the roll-visibility controls. This keeps
  // the launcher inside the same bottom toolbar even on alternate Foundry skins.
  const rollButtons = buttons.filter(isRollModeButton);
  if (rollButtons.length) {
    const parents = new Map();
    for (const button of rollButtons) {
      const parent = button.parentElement;
      if (!parent) continue;
      parents.set(parent, (parents.get(parent) ?? 0) + 1);
    }
    const best = Array.from(parents.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) return { parent: best, before: null, mode: "after-rolls" };
  }

  return null;
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

  if (!simulatorEnabled()) {
    launcher?.remove();
    launcher = null;
    legacy?.classList?.remove("gdf-integrated-launcher-source");
    return false;
  }

  const placement = findPlacement();
  if (!placement) {
    // Never hide the working legacy launcher unless the integrated replacement
    // has actually mounted. This was the v0.7.11 missing-icon failure mode.
    legacy?.classList?.remove("gdf-integrated-launcher-source");
    return false;
  }

  if (!launcher || !launcher.isConnected) launcher = createLauncher();
  launcher.classList.toggle("gdf-before-utilities", placement.mode === "before-utilities");
  launcher.classList.toggle("gdf-after-rolls", placement.mode === "after-rolls");

  if (placement.before) {
    if (launcher.parentElement !== placement.parent || launcher.nextElementSibling !== placement.before) {
      placement.parent.insertBefore(launcher, placement.before);
    }
  } else if (launcher.parentElement !== placement.parent) {
    placement.parent.appendChild(launcher);
  }

  // Hide the old floating trigger ONLY after the new toolbar icon is in DOM.
  if (launcher.isConnected) legacy?.classList?.add("gdf-integrated-launcher-source");

  if (game.settings.get(MODULE_ID, "debug")) {
    console.debug(`[Genesys Dice Forge] Chat launcher mounted: ${placement.mode}.`, {
      parent: placement.parent,
      before: placement.before
    });
  }
  return launcher.isConnected;
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

  console.info("[Genesys Dice Forge] v0.7.12 chat-toolbar launcher active: preferred mount before Save/Delete controls (Foundry v13/v14).");
});

Hooks.once("shutdown", () => {
  observer?.disconnect();
  observer = null;
  launcher?.remove();
  launcher = null;
  document.querySelector(LEGACY_SELECTOR)?.classList?.remove("gdf-integrated-launcher-source");
  if (resizeHandlerInstalled) {
    window.removeEventListener("resize", positionPanel);
    resizeHandlerInstalled = false;
  }
});

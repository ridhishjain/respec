// Constructs "dfn panels" which show all the local references to a dfn and a
// self link to the selected dfn. Based on Bikeshed's dfn panels at
// https://github.com/tabatkins/bikeshed/blob/ef44162c2e/bikeshed/dfnpanels.py
import { fetchAsset } from "./text-loader.js";
import { hyperHTML } from "./import-maps.js";
import { norm } from "./utils.js";

export const name = "core/dfn-panel";

export async function run() {
  const css = await loadStyle();
  document.head.insertBefore(
    hyperHTML`<style>${css}</style>`,
    document.querySelector("link")
  );

  document.body.addEventListener("click", event => {
    /** @type {HTMLElement} */
    const el = event.target;
    const panel = document.getElementById("dfn-panel");

    const action = deriveAction(el);
    switch (action) {
      case "show": {
        if (panel) panel.remove();
        const dfn = el.closest("dfn");
        displayPanel(dfn, createPanel(dfn));
        break;
      }
      case "activate": {
        panel.classList.add("activated");
        panel.style.left = null;
        panel.style.top = null;
        break;
      }
      case "hide": {
        panel.remove();
        break;
      }
    }
  });
}

/** @param {HTMLElement} clickTarget */
function deriveAction(clickTarget) {
  const hitALink = !!clickTarget.closest("a");
  if (clickTarget.closest("dfn")) {
    return hitALink ? "noop" : "show";
  }
  if (clickTarget.closest("#dfn-panel")) {
    if (hitALink) {
      const clickedSelfLink = clickTarget.classList.contains("self-link");
      return clickedSelfLink ? "hide" : "activate";
    }
    const panel = clickTarget.closest("#dfn-panel");
    return panel.classList.contains("activated") ? "hide" : "noop";
  }
  if (document.getElementById("dfn-panel")) {
    return "hide";
  }
  return "noop";
}

/** @param {HTMLElement} dfn */
function createPanel(dfn) {
  const { id } = dfn;
  const href = `#${id}`;
  const links = document.querySelectorAll(`a[href="${href}"]`);

  /** @type {HTMLElement} */
  const panel = hyperHTML`
    <aside class="dfn-panel" id="dfn-panel">
      <b><a class="self-link" href="${href}">${href}</a></b>
      ${
        links.length
          ? hyperHTML`<b>Referenced in:</b>${referencesToHTML(id, links)}`
          : null
      }
    </aside>
  `;
  return document.body.appendChild(panel);
}

/**
 * @param {string} id dfn id
 * @param {NodeListOf<HTMLLinkElement>} links
 * @returns {HTMLUListElement}
 */
function referencesToHTML(id, links) {
  /** @type {Map<string, string[]>} */
  const titleToIDs = new Map();
  links.forEach((link, i) => {
    const linkID = link.id || `ref-for-${id}-${i + 1}`;
    if (!link.id) link.id = linkID;
    const title = getReferenceTitle(link);
    const ids = titleToIDs.get(title) || titleToIDs.set(title, []).get(title);
    ids.push(linkID);
  });

  /** @param {[string, string[]]} entry */
  const toLinkProps = ([title, ids]) => {
    return [{ title, id: ids[0] }].concat(
      ids.slice(1).map((id, i) => ({ title: `(${i + 2})`, id }))
    );
  };

  /**
   * @param {[string, string[]]} entry
   * @returns {HTMLLIElement}
   */
  const listItemToHTML = entry =>
    hyperHTML`<li>${toLinkProps(entry).map(
      link => hyperHTML`<a href="#${link.id}">${link.title}</a>${" "}`
    )}</li>`;

  return hyperHTML`<ul>${[...titleToIDs.entries()].map(listItemToHTML)}</ul>`;
}

/** @param {HTMLAnchorElement} link */
function getReferenceTitle(link) {
  const section = link.closest("section");
  if (!section) return null;
  const heading = section.querySelector("h1, h2, h3, h4, h5");
  if (!heading) return null;
  return norm(heading.textContent);
}

/**
 * @param {HTMLElement} dfn
 * @param {HTMLElement} panel
 */
function displayPanel(dfn, panel) {
  panel.classList.add("on");

  const dfnRect = dfn.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const panelWidth = panelRect.right - panelRect.left;

  let top = window.scrollY + dfnRect.top;
  let left = dfnRect.left + dfnRect.width + 5;
  if (left + panelWidth > document.body.scrollWidth) {
    // Reposition, because the panel is overflowing
    left = dfnRect.left - (panelWidth + 5);
    if (left < 0) {
      left = dfnRect.left;
      top = top + dfnRect.height;
    }
  }

  Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
}

async function loadStyle() {
  try {
    return (await import("text!../../assets/dfn-panel.css")).default;
  } catch {
    return fetchAsset("dfn-panel.css");
  }
}

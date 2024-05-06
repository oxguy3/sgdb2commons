// ==UserScript==
// @name         sgdb2commons
// @namespace    https://schiff.io/
// @version      20240505_03
// @description  Upload images from SteamGridDB directly to Wikimedia Commons
// @author       Hayden Schiff
// @website      https://commons.wikimedia.org/wiki/User:IagoQnsi/sgdb2commons
// @license      MIT
// @match        https://www.steamgriddb.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABsUlEQVR4Xp2Tv2tUURCFv7n7/AGRiCEoa6HlWiiI0cLCQrBbS0UEI/JeNkrCSv4AwdVCSCUuuO8tpgpqoVWiYmchKCiGpFNRsAkhkUULcRFNdrwDt0h47Io5MHCY7zB3YLj0VNycoFaL6CHXlYzd3YHoDRaLY5sb8KtwDuhHO9cYnu77vwHV+jZEh4AOuBZRez+bUpw9JsmUkew2o83Bf29w9lHBiiC26jjwFmWCNf1CnN4MvIuS9B5Jc3pDqFZzfoMzvuZsG59pdDvZSQv4ekGcviJulAgy79lrY5ZhpHEifwW0AiiyNo6T+un5J4cyeGplHuGOMUDBXc4PEIaAz3TcEZy8LM8/v65QtjJvPWOWQTlGUARs9CKnWJVvwABB5n3vsDGgALj8BsonhCK65SoavVvp3zMJtBV+mreeMcuAvienOL0Ubl4nSb8SZ8f3nr91YPDCZMm89YxZxrOL+Q0i9yDcvIrILD/aC0t9A3Fr+87EPDBjDHjDvuWHBAnrdSXdzR95BhwFvgMfAykBu0DmEFdmqrKSHxBk35fFYgXVYeAg8Bv4gHLfvzzl+Srr9BfW9KTD/6s82QAAAABJRU5ErkJggg==
// @grant        GM_addStyle
// @updateURL    https://github.com/oxguy3/sgdb2commons/raw/main/sgdb2commons.user.js
// @downloadURL  https://github.com/oxguy3/sgdb2commons/raw/main/sgdb2commons.user.js
// ==/UserScript==

"use strict";

GM_addStyle(`
.asset-container.compact > .asset .preview .hover-info .lr .btn-2commons {
  position: relative;
  padding: 0;
  margin-top: 0;
  font-size: 1.2em;
}
.asset-container.compact > .asset .preview .hover-info .lr .btn-2commons button {
  display: inline-block;
  padding: .3em .5em;
  vertical-align: middle;
}
.asset-container.compact > .asset.selected-2commons .preview {
  background-color: #5fb4f0;
  border: 4px solid #5fb4f0;
}
.asset-container.compact > .asset.selected-2commons .info .details .game-name {
  color: #5fb4f0;
}
.asset-container[data-type="logo"] > .asset.selected-2commons .preview > .img-container::before,
.asset-container[data-type="icon"] > .asset.selected-2commons .preview > .img-container::before {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEWXvuO21vaMVnCFAAAAEElEQVQI12Ng+M+AFeEQBgB+vw/xWs16mgAAAABJRU5ErkJggg==);
}
`);

var uploaderUrl = "https://url2commons.toolforge.org/";
var commonsLogo =
  '<svg class="icon" viewBox="-305 -516 610 820" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><clipPath id="c"><circle r="298"/></clipPath></defs><circle r="100"/><g><g id="arrow" clip-path="url(#c)"><path d="m-11 180v118h22v-118"/><path d="m-43 185 43-75 43 75"/></g><g id="arrows3"><use transform="rotate(45)" xlink:href="#arrow"/><use transform="rotate(90)" xlink:href="#arrow"/><use transform="rotate(135)" xlink:href="#arrow"/></g><use transform="scale(-1 1)" xlink:href="#arrows3"/><path id="blue_path" transform="rotate(-45)" d="m0-256a256 256 0 1 0 256 256c0-100-101-150-6-275" fill="none" stroke-width="84"/><path id="arrow_top" d="m-23-515s-36 135-80 185 116-62 170-5-90-180-90-180z"/></g></svg>';

var isNavLoaded = false;

// from https://stackoverflow.com/a/47767860
function getFileExtension(url) {
  return url.split(/[#?]/)[0].split(".").pop().trim();
}

// from https://stackoverflow.com/a/9340862
function getTopLevelText(el) {
  let child = el.firstChild;
  let texts = [];
  while (child) {
    if (child.nodeType == 3) {
      texts.push(child.data);
    }
    child = child.nextSibling;
  }

  return texts.join("");
}

function generateUrl(obj, parent, yearField) {
  let fileExt = getFileExtension(obj.downloadUrl);

  // retrieve and sanitize year from DOM
  obj.year = "";
  if (yearField) {
    obj.year = yearField.innerText.replace(/[()\s]/g, "");
  }
  let gameLabel = obj.year == "" ? obj.game : `${obj.game} (${obj.year})`;

  // retrieve style from metadata node
  const metadata = parent.querySelector(".metadata");
  obj.style = metadata.innerText.split("•")[0].trim().toLowerCase();

  // retrieve uploading user's details from user link node
  const userLink = parent.querySelector(".user-link a");
  obj.userName = userLink.innerText.replaceAll(/[\s\n]/g, "");
  obj.userUrl = userLink.href;

  // extract useful bits from the image page URL
  let imageUrlParts = obj.imageUrl.split("/");
  obj.imageId = imageUrlParts.pop();
  obj.imageType = imageUrlParts.pop();

  let descriptor = "";
  for (const [key, value] of Object.entries(obj)) {
    descriptor += key + "=";
    descriptor += value.replaceAll(/_/g, "$US$").replaceAll(/[{}|\n]/g, "");
    descriptor += "|";
  }
  descriptor = descriptor.slice(0, -1);

  return `${obj.downloadUrl} ${gameLabel} ${obj.imageType} ${obj.style} (SGDB ${obj.imageId}).${fileExt}|${descriptor}`;
}

function makeNavItem() {
  // create navbar link
  let navItem = document.createElement("li");
  navItem.classList.add("nav-item", "nav-2commons");
  let navSpan = document.createElement("span");
  navSpan.innerHTML = commonsLogo + "to Commons";

  // add link to navbar, two elements after the divider (aka immediately right of the search button)
  navItem.appendChild(navSpan);
  let navbar = document.querySelector("nav ul");
  navbar.insertBefore(
    navItem,
    navbar.querySelector(".nav-divider").nextSibling.nextSibling
  );

  navSpan.addEventListener("click", function (event) {
    let urls = [];

    if (document.querySelector(".asset-container.compact")) {
      // pages containing a list of images
      let assets = document.querySelectorAll(
        ".asset-container.compact > .asset.selected-2commons"
      );
      if (assets.length == 0) {
        alert(
          "Error: No files selected. Please select all the images you want to upload first. Images can be selected by hovering your mouse over them and clicking on the Commons logo."
        );
        return;
      }
      for (let i = 0; i < assets.length; ++i) {
        let asset = assets[i];
        let obj = {};

        obj.game = asset.querySelector(".game-name").innerText;

        obj.downloadUrl = asset.querySelector(".btn-download a").href;
        obj.imageUrl = asset.querySelector(".overlay-darken").href;

        const yearField = asset.querySelector(".game-name-wrapper .muted");
        urls.push(generateUrl(obj, asset, yearField));
      }
    } else if (document.querySelector(".container-asset-page")) {
      // pages containing a single image
      let container = document.querySelector(".container-asset-page");
      let obj = {};

      let titleLink = container.querySelector(".sidebar-container h2 a");
      obj.game = getTopLevelText(titleLink);

      obj.downloadUrl = container.querySelector(".asset-download a").href;
      obj.imageUrl = window.location.href;

      urls.push(generateUrl(obj, container, titleLink.querySelector(".muted")));
    } else {
      // inscrutable pages
      alert(
        "Error: sgdb2commons was not able to recognize any image assets on this page."
      );
      return;
    }
    let uploaderParams = new URLSearchParams([
      ["urls", urls.join("\n")],
      ["desc", "{{subst:User:IagoQnsi/sgdb2commons-info|$DESCRIPTOR$}}"],
    ]);
    let location = uploaderUrl + "?" + uploaderParams.toString();
    location = location.replace(/\+/g, "%20");
    window.location = location;
  });
  isNavLoaded = true;
}

function addImageButtons() {
  let assets = document.querySelectorAll(".asset-container.compact > .asset");
  for (let i = 0; i < assets.length; ++i) {
    let asset = assets[i];

    let pill = document.createElement("div");
    pill.classList.add("btn-2commons", "pill", "hover-fade");
    let btn = document.createElement("button");
    btn.classList.add("btn-link");
    btn.innerHTML = commonsLogo;
    pill.appendChild(btn);

    let buttonBox = asset.querySelector(".lr");
    buttonBox.appendChild(pill);
    btn.addEventListener("click", function (event) {
      event.target.closest(".asset").classList.toggle("selected-2commons");
    });
  }
}

new MutationObserver(checkPage).observe(
  document.getElementById("render-me-uwu"),
  { childList: true, subtree: true }
);

function checkPage(changes, observer) {
  if (!isNavLoaded && !document.querySelector("nav .nav-2commons")) {
    makeNavItem();
  }
  const newAssetSelector =
    ".asset-container.compact > .asset .preview .hover-info .lr:not(:has(.btn-2commons))";
  if (document.querySelector(newAssetSelector)) {
    addImageButtons();
  }
}

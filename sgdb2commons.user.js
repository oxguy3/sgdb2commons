// ==UserScript==
// @name         sgdb2commons
// @namespace    https://schiff.io/
// @version      2024-05-05
// @description  Upload images from SteamGridDB directly to Wikimedia Commons
// @author       Hayleox
// @match        https://www.steamgriddb.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABsUlEQVR4Xp2Tv2tUURCFv7n7/AGRiCEoa6HlWiiI0cLCQrBbS0UEI/JeNkrCSv4AwdVCSCUuuO8tpgpqoVWiYmchKCiGpFNRsAkhkUULcRFNdrwDt0h47Io5MHCY7zB3YLj0VNycoFaL6CHXlYzd3YHoDRaLY5sb8KtwDuhHO9cYnu77vwHV+jZEh4AOuBZRez+bUpw9JsmUkew2o83Bf29w9lHBiiC26jjwFmWCNf1CnN4MvIuS9B5Jc3pDqFZzfoMzvuZsG59pdDvZSQv4ekGcviJulAgy79lrY5ZhpHEifwW0AiiyNo6T+un5J4cyeGplHuGOMUDBXc4PEIaAz3TcEZy8LM8/v65QtjJvPWOWQTlGUARs9CKnWJVvwABB5n3vsDGgALj8BsonhCK65SoavVvp3zMJtBV+mreeMcuAvienOL0Ubl4nSb8SZ8f3nr91YPDCZMm89YxZxrOL+Q0i9yDcvIrILD/aC0t9A3Fr+87EPDBjDHjDvuWHBAnrdSXdzR95BhwFvgMfAykBu0DmEFdmqrKSHxBk35fFYgXVYeAg8Bv4gHLfvzzl+Srr9BfW9KTD/6s82QAAAABJRU5ErkJggg==
// @grant        GM_addStyle
// ==/UserScript==

function runIt() {
    'use strict';

    var uploaderUrl = 'https://url2commons.toolforge.org/';
    var commonsLogo = '<svg class="icon" viewBox="-305 -516 610 820" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><clipPath id="c"><circle r="298"/></clipPath></defs><circle r="100"/><g><g id="arrow" clip-path="url(#c)"><path d="m-11 180v118h22v-118"/><path d="m-43 185 43-75 43 75"/></g><g id="arrows3"><use transform="rotate(45)" xlink:href="#arrow"/><use transform="rotate(90)" xlink:href="#arrow"/><use transform="rotate(135)" xlink:href="#arrow"/></g><use transform="scale(-1 1)" xlink:href="#arrows3"/><path id="blue_path" transform="rotate(-45)" d="m0-256a256 256 0 1 0 256 256c0-100-101-150-6-275" fill="none" stroke-width="84"/><path id="arrow_top" d="m-23-515s-36 135-80 185 116-62 170-5-90-180-90-180z"/></g></svg>';

    // from https://stackoverflow.com/a/47767860
    function get_url_extension( url ) {
        return url.split(/[#?]/)[0].split('.').pop().trim();
    }

    var assets = document.querySelectorAll('.asset-container.compact > .asset');
    for (var i = 0; i < assets.length; ++i) {
        var asset = assets[i];

        var pill = document.createElement('div');
        pill.classList.add('btn-2commons', 'pill', 'hover-fade');
        var btn = document.createElement('button');
        btn.classList.add('btn-link');
        btn.innerHTML = commonsLogo;
        pill.appendChild(btn);

        var buttonBox = asset.querySelector('.lr');
        buttonBox.appendChild(pill);
        btn.addEventListener('click', function (event) {
            event.target.closest('.asset').classList.toggle('selected-2commons');
        });
    }

    // create navbar link
    var navItem = document.createElement('li');
    navItem.classList.add('nav-item', 'nav-2commons');
    var navSpan = document.createElement('span');
    navSpan.innerHTML = commonsLogo + "to Commons";

    // add link to navbar, two elements after the divider (aka immediately right of the search button)
    navItem.appendChild(navSpan);
    var navbar = document.querySelector('nav ul');
    navbar.insertBefore(navItem, navbar.querySelector('.nav-divider').nextSibling.nextSibling);

    navSpan.addEventListener('click', function(event) {
        var urls = [];
        var assets = document.querySelectorAll('.asset-container.compact > .asset.selected-2commons');
        for (var i = 0; i < assets.length; ++i) {
            var asset = assets[i];

            var gameName = asset.querySelector('.game-name').innerText;
            var year = '';
            var yearField = asset.querySelector('.game-name-wrapper .muted');
            if (yearField) {
                year = yearField.innerText.replace(/[()\s]/g, '');
            }
            var gameLabel = (year == '') ? gameName : `${gameName} (${year})`;
            var style = asset.querySelector('.metadata').innerText.split('•')[0].trim().toLowerCase();

            var userLink = asset.querySelector('.user-link a');
            var userName = userLink.innerText.replaceAll(/[\s\n]/g, '');
            var userHref = userLink.href;

            var downloadUrl = asset.querySelector('.btn-download a').href;
            var fileExt = get_url_extension(downloadUrl);
            var imageUrl = asset.querySelector('.overlay-darken').href;
            var imageUrlParts = imageUrl.split('/');
            var imageId = imageUrlParts.pop();
            var imageType = imageUrlParts.pop();

            var descriptors = [
                ['game', gameName],
                ['year', year],
                ['imageUrl', imageUrl],
                ['imageId', imageId],
                ['imageType', imageType],
                ['style', style],
                ['userName', userName],
                ['userUrl', userHref]
            ];
            var descriptor = '';
            descriptors.forEach(function (d) {
                descriptor += d[0] + '=';
                descriptor += d[1].replaceAll(/_/g, '$US$').replaceAll(/[{}|\n]/g, '');
                descriptor += '|';
            });
            descriptor = descriptor.slice(0, -1);

            urls.push(`${downloadUrl} ${gameLabel} ${imageType} (SGDB ${imageId}).${fileExt}|${descriptor}`);
        }
        var uploaderParams = new URLSearchParams([
            ["urls", urls.join("\n")],
            ["desc", '{{subst:User:IagoQnsi/sgdb2commons-info|$DESCRIPTOR$}}'],
        ]);
        window.location = (uploaderUrl+'?'+uploaderParams.toString()).replace(/\+/g, '%20');
    });
}

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
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEVftPD///87IJ2MAAAAEElEQVQI12Ng+M+AFeEQBgB+vw/xWs16mgAAAABJRU5ErkJgglRvIEhleGR1bXA=);
}
`);

(new MutationObserver(checkIfPageReady)).observe(document.getElementById('render-me-uwu'), {childList: true, subtree: true});

function checkIfPageReady(changes, observer) {
    if(document.querySelector('.asset-container.compact .asset')) {
        observer.disconnect();
        runIt();
    }
}
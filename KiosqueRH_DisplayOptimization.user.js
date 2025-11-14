// ==UserScript==
// @name         KiosqueRH - Optimisation d'affichage
// @version      0.51
// @description  Optimisation de l'affichage (version corrigée DOM dynamique)
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_DisplayOptimization.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_DisplayOptimization.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const $ = window.jQuery;

  // --- Styles généraux immédiats
  $('.general').css({ width: '2200px', height: '1000px' });
  $('.PRODNomPre').css('height', '17px');
  $('.ProdNBHTot').css('height', '16px');
  $('.prodDonneesTotDroite').css('width', '80px');

  const generalDiv = document.querySelector('.general');
  if (generalDiv && generalDiv.children.length >= 4) {
    const quatriemeDiv = generalDiv.children[3];
    quatriemeDiv.style.width = '100%';
    quatriemeDiv.style.height = '100%';
  }

  Array.from(document.getElementsByClassName('etat120Corps')).forEach(el => {
    el.style.width = '80%';
  });

  // --- Génération des mois
  function getSixNextMonths() {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 10; i++) {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 1);
      const formattedDate = ('0' + (nextMonth.getMonth() + 1)).slice(-2) + '.' + nextMonth.getFullYear();
      months.push(formattedDate);
    }
    return months;
  }

  const bandeauEntete = document.querySelector('.BandeauEntete');
  if (bandeauEntete && bandeauEntete.textContent.trim() === 'Saisie productivité prévisionnelle') {
    const menu = document.getElementById('PERIODE');
    if (menu) {
      menu.innerHTML = '';
      getSixNextMonths().forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.text = date;
        menu.appendChild(opt);
      });
    }
  }

    if (bandeauEntete && bandeauEntete.textContent.trim() === 'Saisie productivité réalisée') {
        const menu = document.getElementById('PERIODE');
        if (menu) {
            menu.innerHTML = '';
            const now = new Date();
            for (let z = 0; z < 13; z++) {  // du plus récent au plus ancien
                const d = new Date(now.getFullYear(), now.getMonth() - z, 1);
                const formatted = `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                const opt = document.createElement('option');
                opt.value = formatted;
                opt.text = formatted;
                menu.appendChild(opt);
            }
            // sélectionner le dernier mois du menu (le plus ancien)
            menu.selectedIndex = menu.options.length - 1;
        }
    }

  // --- Partie principale : attendre le DOM ADP
  const checkExist = setInterval(() => {
    const colonneDiv = document.getElementById('colonne');
    if (!colonneDiv) return;

    const lastDiv = colonneDiv.nextElementSibling;
    if (!lastDiv) return;

    clearInterval(checkExist); // Stopper l’attente

    // Masquer des lignes précises
    const rows = colonneDiv.querySelectorAll('tr');
    const lastDivRows = lastDiv.querySelectorAll('tr');
    [1, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25].forEach(i => {
      if (rows[i]) rows[i].style.display = 'none';
    });
    [1, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23].forEach(i => {
      if (lastDivRows[i]) lastDivRows[i].style.display = 'none';
    });
    if (lastDivRows[16]) {
      lastDivRows[16].style.color = '#FF0000';
      lastDivRows[16].style.fontWeight = 'bold';
    }

    // Ajustements divers
    const td14 = lastDiv.querySelector('tr:nth-child(14)');
    if (td14) td14.style.height = '35px';

    const tdElements = colonneDiv.querySelectorAll('td.ProdTitreLigne');
    if (tdElements.length >= 3) {
      for (let k = tdElements.length - 3; k < tdElements.length; k++) {
        tdElements[k].style.height = '16px';
      }
    }

    const firstTr = lastDiv.querySelector('tr:first-child');
    if (firstTr) {
      firstTr.querySelectorAll('td.prodDonneesBleu').forEach(td => {
        td.style.backgroundColor = '#66FF66';
      });
    }

  }, 500);

})();

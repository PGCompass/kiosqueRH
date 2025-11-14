// ==UserScript==
// @name         KiosqueRH – Couverts automatique
// @version      1.2
// @description  Ajout des couverts en automatique
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoCouverts.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoCouverts.user.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const CouvertsUR = [
        ["234001",  60,  60,  50,  15,  15, 10,  0, 50],
        ["304501", 320, 380, 320, 300, 110, 10,  0, 50],
        ["960001", 680, 660, 650, 630, 400, 10, 15, 50],
        ["C48001", 350, 380, 300, 370, 210, 10,  0, 50],
        ["D37501", 210, 210, 190, 170,  90, 10,  0, 50],
        ["D39901", 520, 580, 490, 530, 240, 10, 40, 50],
        ["F17501", 230, 240, 210, 190, 110, 10,  0, 50],
        ["F36501", 350, 400, 310, 340, 120, 10,  0, 50],
        ["F76701", 310, 350, 290, 280, 120, 10,  0, 50],
        ["G46201", 480, 520, 400, 500, 200, 10,  0, 50],
        ["G76301", 420, 440, 380, 420, 240, 10, 50, 50],
        ["G76302", 100, 110, 100,  80,  50, 10,  0, 50]
    ];

    const vacances = [
        ["Vacances de la Toussaint 2025", "2025-10-18", "2025-11-03"],
        ["Vacances de Noël 2025-2026", "2025-12-20", "2026-01-05"],
        ["Vacances d’hiver 2026", "2026-02-21", "2026-03-09"],
        ["Vacances de printemps 2026", "2026-04-18", "2026-05-04"],
        ["Vacances d’été 2026", "2026-07-04", "2026-09-01"]
    ];

    // Ramadan
    const ramadan = [
        ["Ramadan 2026", "2026-02-17", "2026-03-19", 10]
    ];

    // Période d'aout
    const aout = [
        ["aout 2026", "2026-07-27", "2026-08-21"]
    ];


    // Vendredi veille vacances : -15%
    const veillevacances = 15;

    const codeUR = $('#CODE_UR').val();
    let titreSynth = $('.ProdTitreLigneSynth').text().trim();
    let [_, mois, annee] = titreSynth.match(/(\d{1,2})\.(\d{4})/) || [];
    mois = parseInt(mois);
    annee = parseInt(annee);

    function getNomJourById(id) {
        const cells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (!cells[id]) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').split('\n')[0].trim();
    }

    function getJourById(id) {
        const cells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (!cells[id]) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').split('\n')[1].replace(/^0/, '').trim();
    }

    function getTypeJourById(id) {
        const cells = Array.from(document.querySelectorAll('#ligne table.ProdTable tr:nth-of-type(2) td.ProdDonneesCal')).slice(1);
        if (!cells[id]) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').trim();
    }

    function estVacances(jour, mois, annee) {
        const date = new Date(annee, mois - 1, jour);
        for (let vac of vacances) {
            if (date >= new Date(vac[1]) && date <= new Date(vac[2])) return true;
        }
        return false;
    }

    function estRamadan(jour, mois, annee) {
        const date = new Date(annee, mois - 1, jour);
        for (let r of ramadan) {
            const debut = new Date(r[1]);
            const fin = new Date(r[2]);
            if (date >= debut && date <= fin) return r[3];
        }
        return 0;
    }

    function estPeriodeAout(jour, mois, annee) {
        const date = new Date(annee, mois - 1, jour);
        for (let p of aout) {
            const debut = new Date(p[1]);
            const fin = new Date(p[2]);
            if (date >= debut && date <= fin) return true;
        }
        return false;
    }

    function estVeilleVacances(jour, mois, annee) {
        const date = new Date(annee, mois - 1, jour);
        const lendemain = new Date(date);
        lendemain.setDate(date.getDate() + 1);

        for (let vac of vacances) {
            if (lendemain.toDateString() === new Date(vac[1]).toDateString()) return true;
        }
        return false;
    }

    function appliquerCouverts() {
        const urData = CouvertsUR.find(u => u[0] === codeUR);
        if (!urData) return;

        const colonnes = $('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');

        colonnes.each(function(i) {
            let nomJour = getNomJourById(i);
            const jourNum = parseInt(getJourById(i));
            const typeJour = getTypeJourById(i);

            let idxJour = ["LU", "MA", "ME", "JE", "VE"].indexOf(nomJour);
            let couvert = 0;

            const nextTypeJour = getTypeJourById(i + 1);
            if (nextTypeJour === "JFER" && nomJour !== "VE" && nomJour !== "SA" && nomJour !== "DI") {
                idxJour = 4;
            }

            if (idxJour !== -1 && typeJour !== "JFER") {
                couvert = urData[idxJour + 1];

                // ===== AOUT (prioritaire) =====
                if (estPeriodeAout(jourNum, mois, annee)) {
                    let pctAout = urData[8]; // nouvelle colonne
                    couvert = Math.round(couvert * (1 - pctAout / 100) / 5) * 5;
                    // On saute toutes les autres baisses
                }

                // ===== sinon règles normales =====
                else {

                    // Vacances
                    if (estVacances(jourNum, mois, annee)) {
                        let reduction = urData[6];
                        couvert = Math.round(couvert * (1 - reduction / 100) / 5) * 5;
                    }

                    // Ramadan
                    let ramadanPct = estRamadan(jourNum, mois, annee);
                    if (ramadanPct > 0) {
                        if (estVacances(jourNum, mois, annee)) {
                            ramadanPct = ramadanPct / 2;
                        }
                        couvert = Math.round(couvert * (1 - ramadanPct / 100) / 5) * 5;
                    }

                    // Vendredi veille vacances
                    if (nomJour === "VE" && estVeilleVacances(jourNum, mois, annee)) {
                        couvert = Math.round(couvert * (1 - veillevacances / 100) / 5) * 5;
                    }

                    // Jours de pont
                    if (typeJour === "PONT") {
                        let pontPct = urData[7];
                        couvert = Math.round(couvert * (pontPct / 100) / 5) * 5;
                    }
                }
            }


            if (nomJour === "SA" || nomJour === "DI" || typeJour === "JFER") {
                couvert = 0;
            }

            const input = $(`#NBCOUV_${i}`);
            if (input.length) input.val(couvert).trigger('change');
        });
    }

    function ajouterBoutonApresExporterTotal() {
        const divRef = document.getElementById('id_btn_name_BT_exporterTotal');
        if (!divRef || document.getElementById('id_btn_name_btnOk')) return;

        const tdParent = divRef.parentElement;
        const td = document.createElement('td');
        td.setAttribute('align', 'left');
        td.setAttribute('height', '30');
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.id = 'id_btn_name_btnOk';
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = '112px';
        div.innerHTML = '<em><span style="height:16px;">&#x1F374;&nbsp;Ajouter Couverts</span></em>';

        div.onclick = function() { appliquerCouverts(); return false; };
        div.onmousedown = function() { this.className='cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow'; };
        div.onmouseout  = function() { this.className='cougar-btn cougar-btn-workflow'; };
        div.onmouseover = function() { this.className='cougar-btn cougar-btn-over cougar-btn-workflow'; };

        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }

    const observer = new MutationObserver(() => {
        const bandeauEnteteProd = document.querySelector('.BandeauEntete');
        if (bandeauEnteteProd && bandeauEnteteProd.textContent.trim() === "Saisie productivité prévisionnelle") {
            ajouterBoutonApresExporterTotal();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

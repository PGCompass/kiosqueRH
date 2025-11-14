// ==UserScript==
// @name         KiosqueRH – Couverts automatique
// @version      2.1
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
        ["234001",  60,  60,  40,  20,  20, 10,  0,  0],
        ["304501", 320, 380, 320, 300, 110, 10,  0, 40],
        ["960001", 680, 660, 650, 630, 400, 10, 15, 65],
        ["C48001", 350, 380, 300, 370, 210, 10,  0, 40],
        ["D37501", 210, 210, 190, 170,  90, 10,  0, 40],
        ["D39901", 520, 580, 490, 530, 240, 10, 40, 50],
        ["F17501", 230, 240, 210, 190, 110, 10,  0, 50],
        ["F36501", 350, 400, 310, 340, 120, 10,  0,  0],
        ["F76701", 310, 350, 290, 280, 120, 10,  0,  0],
        ["G46201", 480, 520, 400, 500, 200, 10,  0, 40],
        ["G76301", 420, 440, 380, 420, 240, 10, 50, 50],
        ["G76302", 100, 110, 100,  80,  50, 10,  0,  0]
    ];

    const vacances = [
        ["Vacances de la Toussaint 2025", "2025-10-18", "2025-11-03"],
        ["Vacances de Noël 2025-2026", "2025-12-20", "2026-01-05"],
        ["Vacances d’hiver 2026", "2026-02-21", "2026-03-09"],
        ["Vacances de printemps 2026", "2026-04-18", "2026-05-04"],
        ["Vacances d’été 2026", "2026-07-04", "2026-09-01"]
    ];

    const ramadan = [
        ["Ramadan 2026", "2026-02-17", "2026-03-19", 10]
    ];

    const aout = [
        ["aout 2026", "2026-07-27", "2026-08-21"]
    ];

    const finaout = [
        ["finaout 2026", "2026-08-22", "2026-09-04", 20]
    ];

    const veillevacances = 15;

    const codeUR = $('#CODE_UR').val();
    let titreSynth = $('.ProdTitreLigneSynth').text().trim();
    let [_, mois, annee] = titreSynth.match(/(\d{1,2})\.(\d{4})/) || [];
    mois = parseInt(mois);
    annee = parseInt(annee);

    function getNomJourById(id) {
        const c = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (!c[id]) return "";
        return c[id].innerText.replace(/\u00A0/g, '').split('\n')[0].trim();
    }

    function getJourById(id) {
        const c = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (!c[id]) return "";
        return c[id].innerText.replace(/\u00A0/g, '').split('\n')[1].replace(/^0/, '').trim();
    }

    function getTypeJourById(id) {
        const c = Array.from(document.querySelectorAll('#ligne table.ProdTable tr:nth-of-type(2) td.ProdDonneesCal')).slice(1);
        if (!c[id]) return "";
        return c[id].innerText.replace(/\u00A0/g, '').trim();
    }

    function estVacances(j, m, a) {
        const d = new Date(a, m - 1, j);
        return vacances.some(v => d >= new Date(v[1]) && d <= new Date(v[2]));
    }

    function estRamadan(j, m, a) {
        const d = new Date(a, m - 1, j);
        for (let r of ramadan) {
            if (d >= new Date(r[1]) && d <= new Date(r[2])) return r[3];
        }
        return 0;
    }

    function estPeriodeAout(j, m, a) {
        const d = new Date(a, m - 1, j);
        return aout.some(v => d >= new Date(v[1]) && d <= new Date(v[2]));
    }

    function estFinAout(j, m, a) {
        const d = new Date(a, m - 1, j);
        for (let p of finaout) {
            if (d >= new Date(p[1]) && d <= new Date(p[2])) return p[3];
        }
        return 0;
    }

    function estVeilleVacances(j, m, a) {
        const d = new Date(a, m - 1, j);
        const lend = new Date(d);
        lend.setDate(lend.getDate() + 1);
        return vacances.some(v => lend.toDateString() === new Date(v[1]).toDateString());
    }

    function appliquerCouverts() {
        const ur = CouvertsUR.find(u => u[0] === codeUR);
        if (!ur) return;

        $('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal').each(function(i) {

            let nom = getNomJourById(i);
            const j = parseInt(getJourById(i));
            const type = getTypeJourById(i);
            let idx = ["LU","MA","ME","JE","VE"].indexOf(nom);
            let couvert = 0;

            const nextType = getTypeJourById(i + 1);
            if (nextType === "JFER" && !["VE","SA","DI"].includes(nom)) idx = 4;

            if (idx !== -1 && type !== "JFER") {
                couvert = ur[idx + 1];

                // ===== AOÛT (prioritaire, exclusif) =====
                if (estPeriodeAout(j, mois, annee)) {
                    let pctAout = ur[8];
                    couvert = Math.round(couvert * (1 - pctAout / 100) / 5) * 5;
                }

                // ===== FIN AOÛT (cumulable) =====
                else {
                    let pctFinAout = estFinAout(j, mois, annee);
                    if (pctFinAout > 0) {
                        couvert = Math.round(couvert * (1 - pctFinAout / 100) / 5) * 5;
                    }

                    // VACANCES
                    if (estVacances(j, mois, annee)) {
                        let reduction = ur[6];
                        couvert = Math.round(couvert * (1 - reduction / 100) / 5) * 5;
                    }

                    // RAMADAN
                    let ramadanPct = estRamadan(j, mois, annee);
                    if (ramadanPct > 0) {
                        if (estVacances(j, mois, annee)) ramadanPct /= 2;
                        couvert = Math.round(couvert * (1 - ramadanPct / 100) / 5) * 5;
                    }

                    // Vendredi veille vacances
                    if (nom === "VE" && estVeilleVacances(j, mois, annee)) {
                        couvert = Math.round(couvert * (1 - veillevacances / 100) / 5) * 5;
                    }

                    // Pont
                    if (type === "PONT") {
                        let pontPct = ur[7];
                        couvert = Math.round(couvert * (pontPct / 100) / 5) * 5;
                    }
                }
            }

            if (["SA","DI"].includes(nom) || type === "JFER") couvert = 0;

            const input = $(`#NBCOUV_${i}`);
            if (input.length) input.val(couvert).trigger('change');
        });
    }

    function ajouterBoutonApresExporterTotal() {
        const ref = document.getElementById('id_btn_name_BT_exporterTotal');
        if (!ref || document.getElementById('id_btn_name_btnOk')) return;

        const tdParent = ref.parentElement;
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.id = 'id_btn_name_btnOk';
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = '112px';
        div.innerHTML = '<em><span>&#x1F374;&nbsp;Ajouter Couverts</span></em>';

        div.onclick = () => appliquerCouverts();
        div.onmouseover = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-workflow';
        div.onmouseout  = () => div.className = 'cougar-btn cougar-btn-workflow';
        div.onmousedown = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow';

        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }

    const observer = new MutationObserver(() => {
        const b = document.querySelector('.BandeauEntete');
        if (b && b.textContent.trim() === "Saisie productivité prévisionnelle") {
            ajouterBoutonApresExporterTotal();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

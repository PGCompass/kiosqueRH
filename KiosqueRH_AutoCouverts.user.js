// ==UserScript==
// @name         KiosqueRH – Couverts automatique
// @version      1.0
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
        //codeUR, LU, MA, ME, JE, VE, pourcentage de baisse des vacances, pourcentage a appliquer sur les couverts des jours de PONT
        ["234001",  60,  60,  40,  20,  20, 10,  0],
        ["304501", 320, 380, 320, 300, 110, 10,  0],
        ["960001", 680, 660, 650, 630, 400, 10, 15],
        ["C48001", 350, 380, 300, 370, 210, 10,  0],
        ["D37501", 210, 210, 190, 170,  90, 10,  0],
        ["D39901", 520, 580, 490, 530, 240, 10, 40],
        ["F17501", 230, 240, 210, 190, 110, 10,  0],
        ["F36501", 350, 400, 310, 340, 120, 10,  0],
        ["F76701", 310, 350, 290, 280, 120, 10,  0],
        ["G46201", 480, 520, 400, 500, 200, 10,  0],
        ["G76301", 420, 440, 380, 420, 240, 10, 50],
        ["G76302", 100, 110, 100,  80,  50, 10,  0]
    ];

    const vacances = [
        ["Vacances de la Toussaint 2025", "2025-10-18", "2025-11-03"],
        ["Vacances de Noël 2025-2026", "2025-12-20", "2026-01-05"],
        ["Vacances d’hiver 2026", "2026-02-21", "2026-03-09"],
        ["Vacances de printemps 2026", "2026-04-18", "2026-05-04"],
        ["Vacances d’été 2026", "2026-07-04", "2026-09-01"]
    ];

    // Récupération du code UR
    const codeUR = $('#CODE_UR').val();

    // Récupération du mois et de l'année
    let titreSynth = $('.ProdTitreLigneSynth').text().trim();
    let [_, mois, annee] = titreSynth.match(/(\d{1,2})\.(\d{4})/) || [];
    mois = parseInt(mois);
    annee = parseInt(annee);

    // Fonctions de récupération du jour et type
    function getNomJourById(id) {
        const cells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (id < 0 || id >= cells.length) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').split('\n')[0].trim();
    }

    function getJourById(id) {
        const cells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (id < 0 || id >= cells.length) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').split('\n')[1].replace(/^0/, '').trim();
    }

    function getTypeJourById(id) {
        const cells = Array.from(document.querySelectorAll('#ligne table.ProdTable tr:nth-of-type(2) td.ProdDonneesCal')).slice(1);
        if (id < 0 || id >= cells.length) return "";
        return cells[id].innerText.replace(/\u00A0/g, '').trim();
    }

    // Vérification si une date est dans les vacances
    function estVacances(jour, mois, annee) {
        const date = new Date(annee, mois - 1, jour);
        for (let vac of vacances) {
            const debut = new Date(vac[1]);
            const fin = new Date(vac[2]);
            if (date >= debut && date <= fin) return true;
        }
        return false;
    }

    // Application des couverts
    function appliquerCouverts() {
        const urData = CouvertsUR.find(u => u[0] === codeUR);
        if (!urData) return;

        const lignes = $('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');

        lignes.each(function(i, td) {
            let nomJour = getNomJourById(i);
            const jourNum = parseInt(getJourById(i));
            const typeJour = getTypeJourById(i);
            let idxJour = ["LU", "MA", "ME", "JE", "VE"].indexOf(nomJour);
            let couvert = 0;

            // Vérifier si le lendemain est un JFER et si aujourd'hui n'est pas VE, SA ou DI
            const nextTypeJour = getTypeJourById(i + 1);
            if (nextTypeJour === "JFER" && nomJour !== "VE" && nomJour !== "SA" && nomJour !== "DI") {
                idxJour = 4; // appliquer les couverts du vendredi
            }

            if (idxJour !== -1 && typeJour !== "JFER") {
                couvert = urData[idxJour + 1];

                // appliquer la réduction vacances
                if (estVacances(jourNum, mois, annee)) {
                    let reduction = urData[6];
                    couvert = Math.round(couvert * (1 - reduction / 100) / 5) * 5;
                }

                // appliquer le pourcentage PONT si le jour est un pont
                if (typeJour === "PONT") {
                    let pontPct = urData[7];
                    couvert = Math.round(couvert * (pontPct / 100) / 5) * 5;
                }
            }

            // SA, DI, JFER restent à 0
            if (nomJour === "SA" || nomJour === "DI" || typeJour === "JFER") {
                couvert = 0;
            }

            // Mise à jour du champ
            let input = $(`#NBCOUV_${i}`);
            if (input.length) input.val(couvert).trigger('change');
        });
    }



    function ajouterBoutonApresExporterTotal() {
        const divRef = document.getElementById('id_btn_name_BT_exporterTotal');
        if (!divRef || document.getElementById('id_btn_name_btnOk')) return; // éviter doublons

        const tdParent = divRef.parentElement; // le <td> existant
        const td = document.createElement('td');
        td.setAttribute('align', 'left');
        td.setAttribute('height', '30');

        // ajouter espace comme les autres
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.name = 'btnOk';
        div.id = 'id_btn_name_btnOk';
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = '112px'; // un peu plus large pour l'icône
        div.innerHTML = '<em><span style="height:16px;">&#x1F374;&nbsp;Ajouter Couverts</span></em>';

        div.onclick = function() {
            if (this.disabled) return false;
            // lancement de la fonction pour les couverts automatiques
            appliquerCouverts();
            return false;
        };
        div.onmousedown = function() { if(!this.disabled) this.className='cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow'; };
        div.onmouseout = function() { if(!this.disabled) this.className='cougar-btn cougar-btn-workflow'; };
        div.onmouseover = function() { if(!this.disabled) this.className='cougar-btn cougar-btn-over cougar-btn-workflow'; };

        td.appendChild(div);

        // Insérer le nouveau <td> juste après le td existant
        if (tdParent.nextSibling) {
            tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
        } else {
            tdParent.parentNode.appendChild(td);
        }
    }

    // Observer le DOM pour attendre que BT_exporterTotal soit ajouté
    const observer = new MutationObserver(() => {
        const bandeauEnteteProd = document.querySelector('.BandeauEntete');
        if (bandeauEnteteProd && bandeauEnteteProd.textContent.trim() === "Saisie productivité prévisionnelle") {
            ajouterBoutonApresExporterTotal();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

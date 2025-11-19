// ==UserScript==
// @name         KiosqueRH - Email Prévisions Couverts
// @version      1.0
// @description  Génère un mail Outlook selon les prévisions et heures négatives
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_EmailAuto.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_EmailAuto.user.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const GérantUR = [
        // CODEUR, site, nom
        ["234001", "RIE PORTE DE BUC", "Etienne"],
        ["304501", "RIE LE VERDI", "Sébastien"],
        ["960001", "RIE GREEN OFFICE", "Laurent"],
        ["C48001", "RIE H2O", "Aïcha"],
        ["D37501", "RIE EUROATRIUM", "Astrid"],
        ["D39901", "RIE ARIANE", "Laurence"],
        ["F17501", "RIE MOVE", "Michel"],
        ["F36501", "RIE VOLTAIRE", "Catherine"],
        ["F76701", "RIE HORIZONS", "Guillaume"],
        ["G46201", "RIE KALIFORNIA", "Thierry"],
        ["G76301", "RIE SO POP", "Olivier"]
    ];

    /*******************************************
     * AJOUT DU BOUTON EMAIL
     *******************************************/
    function ajouterBoutonEmail() {
        const ref = document.getElementById('id_btn_name_BT_exporterTotal');
        if (!ref || document.getElementById('btnEmailProd')) return;

        const tdParent = ref.parentElement;
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.id = 'btnEmailProd';
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = 'auto';

        div.innerHTML = `<em><span>📧&nbsp;E-mail</span></em>`;

        div.onclick = genererEmail;
        div.onmouseover = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-workflow';
        div.onmouseout  = () => div.className = 'cougar-btn cougar-btn-workflow';
        div.onmousedown = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow';

        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }


    /*******************************************
     * FONCTION PRINCIPALE : GENERATION EMAIL
     *******************************************/
    function genererEmail() {

        const start = () => {

            /*********** Code UR ***********/
            const codeUR = $('#UR').val() || $('#CODE_UR').val() || '';
            let nomGerant = "";
            let nomSite = "";
            const emailDest = `E${codeUR}@compass-group.fr`;

            /*********** Récupération mois + année ***********/
            const titre = $('.ProdTitreLigneSynth').text().trim();
            const match = titre.match(/(\d{1,2})[./](\d{4})/);
            const mois = match ? match[1] : "";
            const annee = match ? match[2] : "";

            /*********** Jours ***********/
            const dayCells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
            if (!dayCells.length) {
                alert("Impossible de lire les jours.");
                return;
            }
            // Recherche dans le tableau GérantUR
            for (const g of GérantUR) {
                if (g[0] === codeUR) {
                    nomSite = g[1];    // 2e élément = site
                    nomGerant = g[2];  // 3e élément = nom
                    break;
                }
            }

            const joursNeg = [];
            const joursZeroCouv = [];
            const ETP_H = 7.38;

            /*********** Analyse ***********/
            dayCells.forEach((cell, i) => {
                const txt = cell.innerText.replace(/\u00A0/g, '').split('\n');
                const jourTxt = (txt[1] || '').trim().replace(/^0/, '');

                let typeJour = getTypeJourById(i); // reprend la fonction du script Couverts automatique
                if (typeJour === "PONT") {
                    typeJour = "PONT – étions nous ouvert ?";
                } else if (!typeJour || typeJour.trim() === "") {
                    typeJour = "pas de saisi.";
                }
                const nbcEl = document.getElementById('NBCOUV_' + i);
                const couverts = nbcEl ? parseInt(nbcEl.value || nbcEl.textContent || 0) : 0;

                // Heures via AJUSTDIV
                const adj = document.getElementById('AJUSTDIV_' + i);
                let h = adj ? adj.value.trim() : null;
                if (!h && document.getElementById('TOTPLA_' + i)) {
                    h = document.getElementById('TOTPLA_' + i).textContent.trim();
                }
                const heures = parseFloat((h || "0").replace(',', '.')) || 0;

                // Jours avec heures négatives
                if (heures < 0) {
                    const nbETP = Math.round((Math.abs(heures) / ETP_H) * 10) / 10;
                    joursNeg.push({ jour: jourTxt, heures, etp: nbETP, couverts });
                }

                // Jours ouvrés avec 0 couvert (hors JFER et W.E)
               if (couverts === 0 && !["JFER","W.E"].includes(getTypeJourById(i))) {
                   joursZeroCouv.push({ jour: jourTxt, typeJour });
               }
            });

            // Fonction pour récupérer le type de jour (JFER / W.E) depuis le 2e rang
            function getTypeJourById(id) {
                const c = Array.from(document.querySelectorAll('#ligne table.ProdTable tr:nth-of-type(2) td.ProdDonneesCal')).slice(1);
                if (!c[id]) return "";
                return c[id].innerText.replace(/\u00A0/g, '').trim();
            }


            /*********** MAIL ***********/
            let sujet = `${nomSite} - ${mois}/${annee} - KiosqueRH heures négatives ⚠️`;

            let corps = "";
            corps += `Bonjour ${nomGerant},\n\n`;
            const date = new Date(annee, mois - 1);
            const moisNom = date.toLocaleString('fr-FR', { month: 'long' });
            corps += `Voici les jours du mois de ${moisNom} ${annee} présentant des heures négatives : (⚠️quand vous actez des absences, il faut deduire les heures correspondantes !)\n\n`;


            if (joursNeg.length === 0) {
                corps += "Aucune journée négative ce mois-ci.\n\n";
            } else {
                joursNeg.forEach(j => {
                    corps += `• ${j.jour}/${mois} : ${j.couverts} couverts prévus ${j.heures}h (soit ${j.etp} ETP à retirer)\n`;
                });
                corps += "\n";
            }

            corps += `La conversion de ces heures permet d’anticiper les sureffectifs, et de poser les bonnes décisions : congés, RTT ou affectations.\n`;

            if (joursZeroCouv.length) {
                corps += "\nJours sans couvert saisie :\n\n";
                joursZeroCouv.forEach(j => {
                    corps += `• ${j.jour}/${mois} : 0 couvert, ${j.typeJour}\n`;
                });
                corps += "\n";
            }
            corps += "Merci de vérifier les pointages et d’adapter les plannings afin d’éviter les sureffectifs.\n\n";
            corps += "Cordialement,\n\n";
            corps += "Pierre GARDIE\n";
            corps += "Chef de secteur\n";

            /*********** Mailto ***********/
            const mailto = `mailto:${emailDest}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
            window.location.href = mailto;
        };


        /*********** ATTENTE ADP ***********/
        if (!document.getElementById('AJUSTDIV_0')) {
            const obs = new MutationObserver(() => {
                if (document.getElementById('AJUSTDIV_0')) {
                    obs.disconnect();
                    setTimeout(start, 50);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(start, 50);
        }
    }



    /*******************************************
     * OBSERVER POUR AJOUTER LE BOUTON
     *******************************************/
    const observer = new MutationObserver(() => {
        const b = document.querySelector('.BandeauEntete');
        if (b && b.textContent.trim().includes("productivité")) {
            ajouterBoutonEmail();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

// ==UserScript==
// @name         KiosqueRH - Auto Click menu deroulant
// @version      1.3
// @description  Supprime certaines actions onchange et conserve ValidationUR tout en automatisant le clic sur un bouton
// @author       Vous
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoClick.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoClick.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Fonction pour configurer un menu déroulant
    function setupDropdown(dropdownId, button, keepValidation) {
        const dropdown = document.querySelector(`#${dropdownId}`);
        if (dropdown) {
            // Supprimez l'attribut onchange
            let currentOnchange = dropdown.getAttribute('onchange');

            if (currentOnchange && keepValidation) {
                // Conservez uniquement `ValidationUR(this.value);`
                const newOnchange = currentOnchange
                    .split(';') // Divise en différentes actions
                    .filter(action => action.trim().startsWith('ValidationUR(')) // Conserve `ValidationUR`
                    .join(';'); // Reconstruit la chaîne

                dropdown.setAttribute('onchange', newOnchange);
            } else {
                dropdown.removeAttribute('onchange');
            }

            // Ajoutez un nouvel écouteur d'événements pour gérer les changements
            dropdown.addEventListener('change', function() {

                // Vérifiez que le bouton n'est pas désactivé
                if (button && !button.disabled) {
                    button.click();
                } else {
                    console.warn('Le bouton est désactivé ou introuvable.');
                }
            });
        }
    }

    // Attendez que la page soit complètement chargée
    window.addEventListener('load', function() {
        const button = document.querySelector('#id_btn_name_btnsaisir');

        // Configurez les menus déroulants
        setupDropdown('PERIODE', button, false); // Aucun `onchange` à conserver pour PERIODE

    });
})();

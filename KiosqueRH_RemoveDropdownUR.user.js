// ==UserScript==
// @name         KiosqueRH - Supprimer UR Liste Déroulante
// @version      1.11
// @description  Supprime des options spécifiques d'une liste déroulante
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_RemoveDropdownUR.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_RemoveDropdownUR.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Tableau des valeurs à supprimer
    var delete_UR = ["234040", "234045","304511", "304540", "960040", "C48002", "C48031", "D05340", "D37511", "D37531", "D37540", 
                     "F17540", "032401", "032402", "048401", "236901", "236999", "353401" , "252401", "252411", "651901", 
                     "651904", "651911", "663740", "F07803", "470601", "470602", "470699", "G37703", "048403", "014701", 
                     "G46240", "G46203", "G46245"];

    // Tentative de sélection de l'élément par ID
    var selectElement = document.getElementById("UR");

    // Si l'élément avec l'ID "UR" n'existe pas, on cherche par classe
    if (!selectElement) {
        var elements = document.getElementsByClassName("selectCGEST");
        if (elements.length >= 3) {
            selectElement = elements[4]; // Prendre la 3e occurrence (index 4)
        }
    }

    // Si l'élément sélectionné existe, on supprime les options spécifiques
    if (selectElement) {
        for (var i = selectElement.options.length - 1; i >= 0; i--) {
            var option = selectElement.options[i];
            if (delete_UR.includes(option.value)) {
                selectElement.remove(i);
            }
        }
    }

})();

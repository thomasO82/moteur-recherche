import path from 'path'
import fs from 'fs'

//import des modules dont j'ai besoins pour recuperer les chemin d'acces dont j'ai besoin.
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '..', 'bdd.json');

export class Helper {
    //transforme chaine de caractere en tableau et supprime les chaines vide du tableau.
    //retourne un tableau
    static stringToTab(str) {
        let tab = str.toLowerCase().split(/[^a-zA-ZàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ]/);
        this.removeOcurence(tab, '');
        return tab;
    }

    //supprime toutes les occurences d'un mot dans une chaine de caractere.
    static removeOcurence(array, letter) {
        for (let i = 0; i < array.length; i++) {
            if (array[i] == letter) {
                array.splice(i, 1);
                i--;
            }
        }
    }

    //compte les occurences d'un mot dans un tableau
    static countWord(word, wordTab) {
        if (word != '') {
            let count = 0;
            for (let i = 0; i < wordTab.length; i++) {
                if (wordTab[i] == word) {
                    count++;
                }
            }
            return count;
        }
        return;
    }

    // verifie si mon fichier contiens une url
    static checkIfBddIncludeUrl(url, fileContent) {
        let listUrls = [];
        for (let i = 0; i < fileContent.length; i++) {
            listUrls.push(fileContent[i].url);
        }
        if (listUrls.includes(url)) {
            return true;
        }
        return false;
    }

    //ordonne mon tableau par ordre decroissant
    static orderArray(array) {
        array.sort(function compare(a, b) {
            if (a.count > b.count){
                return -1;
            }
            if (a.count < b.count){
                return 1;
            }
            return 0;
        });
    }

    //recupere le contenu de mon fichier JSON et le transforme en quelque chose utilisable par javascript
    static getAll(){
        return(JSON.parse(fs.readFileSync(jsonPath)))
    }
}

import express from "express"; //framework qui facilite grandement l'utilisation de nodeJS
import "twig"; //moteur de template, permet d'afficher des variables en html
import fetch from "node-fetch"; //ici, va nous permettre "d'aspirer" une page html grace à une url
import bodyParser from 'body-parser' //permet de parser une requette http pour recupérer les données envoyées
import { Helper } from "./helper/helper.js"; //ma classe qui permet d'utiliser des methodes utilitaires
import Cheerio from 'cheerio'; // librarie qui va nous permettre de recuperer le texte d'un code html
import fs from 'fs'; // librarie files system de node js. nous permet d'interagir avec des fichiers (écrire/lire)
import { Page } from "./models/Page.js"; // ma classe Page
import { Word } from "./models/Word.js"; // ma classe Word
import session from 'express-session'; // module qui nous permettra d'utiliser les variables de session express
const app = express(); // déclaration de mon application express
const bddPath = "./bdd.json"; // chemin du fichier

//si le fichier n'existe pas, alors je le crée
if (!fs.existsSync(bddPath)) {
    fs.writeFileSync(bddPath, JSON.stringify([])) //alors on le crée et on lui insère un tableau vide
    // nous avons besoin de convertir notre tableau en chaine JSON pour pouvoir l'insérer dans le fichier (JSON.stringify)
}

// je demande à mon application express d'utiliser session. nous pourrons donc déclarer des variables session
app.use(session({
    secret: 'SECRET',
    resave: true,
    saveUninitialized: true
}));
app.use(express.static('./assets')); //demande à express d'aller chercher les fichiers static (image, css, js...) dans le dossier assets
app.use(bodyParser.urlencoded({ extended: true })); //configuration bodyparser

//demande à l'application express d'écouter sur le port 8080,
app.listen(8080, () => {
    console.log("Le serveur a demarré et tourne bien")
})

// ma premiere route, lorsque nous irons à l'url localhost:8080/ ce code sera joué
app.get('/', async (req, res) => {
    let error = req.session.error; // j'utilise une variable de session defini plus bas, qui nous permettra d'afficher une erreur
    delete req.session.error; // j'efface ma variable session, nous n'en aurons plus besoin
    let fileContent = Helper.getAll(); // je récupère le contenu de mon fichier
    let listUrls = []; //tableau qui contiendra la liste des urls

    //parcours du contenu du fichier
    for (let i = 0; i < fileContent.length; i++) {
        listUrls.push(fileContent[i].url); // push l'url de notre objet dans le tableau 
    }
    res.render('indexation.html.twig',  //permet d'afficher quelque chose. en l'occurence, notre fichier twig
        // j'envoie un objet qui contiendra ce que j'ai besoin d'afficher dans mon twig
        {
            listUrls: listUrls,
            error: error
        });
})

//notre seconde route. C'est une route POST. Les parametres seront stockés dans la requette http contrairement à une route GET ou les paramètres sont dans l'URL 
app.post('/', async (req, res) => {
    let url = req.body.url; //grace à body-parser, on peut récupérer les paramètres de notre requete comme suit.
    let response; // variable responde qui contiendra l'HTML de la page que l'on cherche

    // le bloc try... catch nous permet d'executer du code, et de faire quelque chose si une exception est détectée
    try {
        response = await fetch(url); //nous essayons d'assigner à une variable response le résultat de la methode fetch. 
    } catch (error) {
        req.session.error = "veuillez entrer une url valide" // si ça échoue, nous assignons à une variable globale un texte qui sera affiché à l'utilisateur 
        res.redirect('/'); // nous redirigons l'utilisateur sur la route get "/"
        return; // nous retournons quelque chose pour empecher le reste du code de la route de se jouer
    }
    const body = await response.text(); //nous transformons en texte le retour de notre fetch.
    const cheerio = Cheerio.load(body); // nous donnons à Cheerio le contenu texte (l'HTML de la page que l'on cherche pour pouvoir l'utiliser)
    const title = cheerio('title').text() // nous demandons à Cheerio de récupérer tout ce qu'il y a dans la balise "title" et de le transformer en texte
    let wordTab = []; // tableau vide qui contiendra tous nos objets Word
    let bodyContent; // variable vide qui contiendras le contenu de la balise "body"
    let fileContent = Helper.getAll(); // je récupère le contenu du fichier JSON avec ma methode getAll() de mon Helper  
    let counter = 0;
    // si la base de donnée ne contient pas l'url que l'on souhaite indexer 
    if (!Helper.checkIfBddIncludeUrl(url, fileContent)) {
        bodyContent = Helper.stringToTab(cheerio('body').text()); // on récupère le contenu de la balise body grace à cheerio et nous convertissons le texte en tableau
        for (let i = 0; i < bodyContent.length; i++) {
            // si le nombre de lettre du mot est supérieur à 3
            if (bodyContent[i].length > 2) {
                counter = Helper.countWord(bodyContent[i], bodyContent); //nous assignons à la variable counter le résultat de la methode countWord de ma classe Helper
                wordTab.push(new Word(bodyContent[i], counter)); //nous poussons dans le tableau dédié un objet Word avec ce dont il a besoin 
                Helper.removeOcurence(bodyContent,bodyContent[i]); //une fois le mot recherché, nous pouvons supprimmer toute les occurences de celui ci. ça évitera qu'il soit compté plusieurs fois
            }
        }
        let newPage = new Page(title, url, wordTab); //Nous construisons un objet Page avec son titre, l'url de la page et le tableau de tous les mots qu'il contient
        fileContent.push(newPage); //je pousse mon objet page dans le tableau obtenu à partir de mon fichier
        fs.writeFileSync(bddPath, JSON.stringify(fileContent, null, 4)); // je réécris mon fichier avec son nouveau contenu
    } else {
        //dans le cas contraire, j'assigne à une variable session (error) un texte à afficher dans notre twig 
        req.session.error = true;
    }
    res.redirect('/'); // je redirige l'utilisateur sur la route get "/"
})

//route get. le code se jouera si l'utilisateur visite l'url suivante "/search"
app.get('/search', async (req, res) => {
    // affiche le fichier twig dont on a besoin
    res.render('search.html.twig', {

    });
});

//route post, le code se jouera quand l'utilisateur enverra son formulaire (car il est de methode post)
app.post('/search', async (req, res) => {
    let error;
    let word = req.body.word; // je déclare une variable à laquelle j'assigne le contenu de mon paramètre de requète "word"
    let pageArray = []; //déclaration d'un tableau vide qui contiendra le detail de nos pages 
    let fileContent = JSON.parse(fs.readFileSync(bddPath)); // le contenu de notre fichier json
    let page; // variable vide qui contiendra l'objet page courant dans notre parcours de tableau suivant (facilite grandement la lecture)
    if (word.length > 2) {
        //parcours du tableau obtenu grace à notre fichier json
        for (let i = 0; i < fileContent.length; i++) {
            page = fileContent[i]; //assignation de l'item courant dans le parcours de notre tableau

            //parcours des mots contenus dans les pages
            for (let j = 0; j < page.words.length; j++) {
                //si le mot courant est egal au mot recherché
                if (page.words[j].word == word) {
                    //nous poussons dans notre tableau vide le détail de la page qui nous interesse
                    pageArray.push({
                        url: page.url,
                        word: word,
                        count: page.words[j].count
                    });
                }
            }
        }
        Helper.orderArray(pageArray); // nous ordonnons notre tableau par ordre décroissant grace à la méthode de mon Helper orderArray
    } else {
        error = true;
    }
    //nous affichons ensuite notre vue avec notre tableau
    res.render('search.html.twig', {
        pageArray: pageArray,
        error: error
    });
})


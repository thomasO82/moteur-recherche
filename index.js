
import express from "express"; 
import "twig"; 
import fetch from "node-fetch"; 
import bodyParser from 'body-parser'
import { Helper } from "./helper/helper.js"; 
import Cheerio from 'cheerio'; 
import fs from 'fs';
import { Page } from "./models/Page.js"; 
import { Word } from "./models/Word.js"; 
import session from 'express-session';
const app = express(); 
const bddPath = "./bdd.json"; 


if (!fs.existsSync(bddPath)) {
    fs.writeFileSync(bddPath, JSON.stringify([]))
}

app.use(session({
    secret: 'SECRET',
    resave: true,
    saveUninitialized: true
}));

app.use(express.static('./assets')); 
app.use(bodyParser.urlencoded({ extended: true })); 

app.listen(8080, () => {
    console.log("Le serveur a demarrer et tourne bien")
})

app.get('/', async (req, res) => {
    let error = req.session.error; 
    delete req.session.error;
    
    let fileContent = Helper.getAll(); 
    let listUrls = []; 

    for (let i = 0; i < fileContent.length; i++) {
        listUrls.push(fileContent[i].url); 
    }
    res.render('indexation.html.twig',  
        {
            listUrls: listUrls,
            error: error
        });
})

app.post('/', async (req, res) => {
    let url = req.body.url; 
    let response; 

    try {
        response = await fetch(url); 
    } catch (error) {
        req.session.error = true 
        res.redirect('/'); 
        return;
    }
    const body = await response.text(); 
    const cheerio = Cheerio.load(body); 
    const title = cheerio('title').text()
    let wordTab = []; 
    let bodyContent; 
    let fileContent = Helper.getAll();
    let counter = 0;
    if (!Helper.checkIfBddIncludeUrl(url, fileContent)) {
        bodyContent = Helper.stringToTab(cheerio('body').text()); 
        for (let i = 0; i < bodyContent.length; i++) {
            if (bodyContent[i].length > 2) {
                counter = Helper.countWord(bodyContent[i], bodyContent); 
                wordTab.push(new Word(bodyContent[i], counter)); 
                Helper.removeOcurence(bodyContent,bodyContent[i]); 
            }
        }
        let newPage = new Page(title, url, wordTab);
        fileContent.push(newPage);
        fs.writeFileSync(bddPath, JSON.stringify(fileContent, null, 4)); 
    } else {
        req.session.error = true;
    }
    res.redirect('/'); 
})

app.get('/search', async (req, res) => {
    res.render('search.html.twig', {

    });
});

app.post('/search', async (req, res) => {
    let error;
    let word = req.body.word; 
    let pageArray = []; 
    let fileContent = JSON.parse(fs.readFileSync(bddPath)); 
    let page; 
    if (word.length > 2) {
        for (let i = 0; i < fileContent.length; i++) {
            page = fileContent[i];
            for (let j = 0; j < page.words.length; j++) {
                if (page.words[j].word == word) {
                    pageArray.push({
                        url: page.url,
                        word: word,
                        count: page.words[j].count
                    });
                }
            }
        }
        Helper.orderArray(pageArray); 
    } else {
        error = true;
    }
    res.render('search.html.twig', {
        pageArray: pageArray,
        error: error
    });
})



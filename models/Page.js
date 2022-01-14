//librarie qui permet de crypter une chaine de caractere.
import crypto from 'crypto';
import fs from 'fs';
export class Page {
    id;
    title;
    url;
    words;
    constructor(title, url, words){
        this.title = title;
        this.url = url;
        this.words = words;
        this.id = crypto.createHash('md5').update(url).digest('hex'); //je créé un id avec le cryptage de mon url, ce qui me permet d'avoir un id unique 
    }
}
const fs = require('fs');

class JsonBase {
    constructor( filename, default_, dirpath ){
        this.dirpath = dirpath || "database";
        default_ = JSON.parse(JSON.stringify(default_));
        this.pathfile = `${this.dirpath}/${filename}.json`;

        if (!fs.existsSync(this.dirpath)){
            fs.mkdirSync(this.dirpath)
        }
        
        if ( this.exists() ){
            this.read()
            let f = false;
            for(const key in default_){
                if (this.body[key] == undefined) {
                    this.body[key] = default_[key];
                    f = true
                }
            }
            if (f) this.save()
        }
        else{
            this.body = default_;
            this.save()
        }
    }
    
    exists() {
        return fs.existsSync( this.pathfile );
    }   
    
    read() {
        this.body = JSON.parse ( fs.readFileSync( this.pathfile , {encoding: 'utf-8'}) )
    }
    
    save(){
        fs.writeFileSync( this.pathfile , JSON.stringify( this.body , null, 4));
    }
    
    deleteFile(){
        fs.unlinkSync(this.pathfile);
    }
    
    copy(filename){
        return new JsonBase(filename, this.body, this.dirpath);
    }
    
    transfer(filename){
        this.deleteFile();
        return this.copy(filename);
    }

}

class Chats {
    constructor(dir) {
        this.dir = dir;
        this.cache = {};
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir)     
    }

    create(chat_id, pattern) {
        const index = `${chat_id}`;
        const db = new JsonBase(index, pattern, this.dir);
        this.cache[index] = db;
        return db;
    }

    get(chat_id) {
        const index = `${chat_id}`;
        if (this.cache[index]) return this.cache[index];
        if (this.exists(index)){
            const db = new JsonBase(index, {}, this.dir);
            this.cache[index] = db;
            return db;
        }
        console.log('not exists')
        return null;
    }

    edit(from, key, value) {
        from[key] = value;
        this.save()
    }

    exists(chat_id) {
        return this.cache[`${chat_id}`] != null || fs.existsSync(`${this.dir}/${chat_id}.json`);
    }
}


class User {

    constructor(from, database, dop_data) {
        this.user = from;
        dop_data = JSON.parse(JSON.stringify(dop_data));
        for (const key in dop_data) {
            if (!this.user[key])this.user[key] = dop_data[key]
        }
        this.database = database;
        this.unpack();
    }

    edit(key, value) {  
        this.user[key] = value;
        this.unpack();
        this.save()
    }

    unpack() {
        for (const key in this.user) {
            this[key] = this.user[key];
        }        
    }

    save() {
        this.database.save();
    }

}


class Users {
    constructor(dop_data) {
        this.users = new JsonBase("users", {}, './database');
        this.dop_data = dop_data
    }

    get(from, needCreate) {
        let user = this.users.body[from.id];
        if (!user && needCreate) {
            user = new User(from, this.users, this.dop_data);
            this.users.body[user.id] = user.user;
            this.save()
        }
        return this.users.body[from.id] ? new User(this.users.body[from.id], this.users, this.dop_data) : false;
    }

    save() {
        this.users.save()
    }

    getArray(){
        let array = [];
        for (const id in this.users.body){
            array.push(this.users.body[id]);
        }
        return array;
    }

}

module.exports = {JsonBase, User, Users, Chats};
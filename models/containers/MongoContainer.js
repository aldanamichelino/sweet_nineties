const mongoose = require('mongoose');
const { mongoDB_config } = require('../../config');
const { write } = require('../../config');

class MongoContainer {
    constructor(collection, schema) {
        if(!mongoose.connection.readyState){
            this.connect().then(() => write('info', 'Database connected'));
        }

        this.model = mongoose.model(collection, schema);
    }
     
    //CONNECT
    async connect() {
        await mongoose.connect(mongoDB_config.db_uri, {dbName: mongoDB_config.db_name});
    }

    //CREATE
    async save(object) {
        try{
            const newDocument = new this.model(object);
            return await newDocument.save();
        } catch(error){
            write('error', `Error: ${error.message}`);
        }
    }

    //READ
    async getAll(){
        try{
            const documents = await this.model.find({}, {__v: 0}).lean();
            return documents;
        } catch(error){
            write('error', `Error: ${error.message}`);
        }
    }

    async getById(id){
        try{
            const document = await this.model.findOne({_id: id}, {__v: 0}).lean();
            if(!document){
                write('error', 'El documento solicitado no existe en nuestra base de datos');
                throw new Error('El documento solicitado no existe en nuestra base de datos');
            } else {
                return document;
            }
        } catch(error) {
            write('error', `Error: ${error.message}`);
        }
    }

    //UPDATE
    async update(id, newDataObject){
        try{
            const updatedDocument = await this.model.updateOne({_id: id}, {$set: {...newDataObject}});
            if(!updatedDocument.matchedCount){
                write('error', 'El documento solicitado no existe en nuestra base de datos');
                throw new Error('El documento solicitado no existe en nuestra base de datos');
            } else {
                return updatedDocument;
            }
        } catch(error) {
            write('error', `Error: ${error.message}`);
        }
    }

    //DELETE
    async delete(id){
        try{
            return await this.model.deleteOne({_id: id});
        } catch(error){
            write('error', `Error: ${error.message}`);
        }
    }
}

module.exports = MongoContainer;
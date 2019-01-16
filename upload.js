const http = require('http');
const https = require('https');
const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const TOKEN_PATH = 'token.json';
let auth = undefined;
let counter = 0;

module.exports = function uploadDir(dir)   {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Drive API.
        authorize(JSON.parse(content), uploadDirectory, dir);
    });
}
    
function authorize(credentials, callback, dir) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if(err) throw err;
        oAuth2Client.setCredentials(JSON.parse(token));
        auth = oAuth2Client;
        callback(dir, 'root');
    });
}

function uploadFile(filepath, parent)   {
    var drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
        name: path.basename(filepath),
        parents: [parent]
    };
    let type = mime.lookup(path.basename(filepath));
    if(!type)   type = 'text/plain';
    var media = {
        mimeType: type,
        body: fs.createReadStream(filepath)
    };
    drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    }, (err, file) => {
        if(err) throw err;
        console.log(`Uploaded File: ${filepath}  with id: ${file.data.id}`, );
    });
}

function finish()   {
    console.log(`Finished`);
}

function uploadDirectory(dir, parent)   {
    var drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
        'name': path.basename(dir),
        'mimeType': 'application/vnd.google-apps.folder',
        parents: [parent]
      };
      drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      }, (err, file) => {
        if (err)  throw err;
        console.log(`Created Directory: ${dir}  with id: ${file.data.id}`);
        iterate(dir, uploadFile, uploadDirectory, file.data.id);
    });
}


function iterate(dir, uploadFile, uploadDirectory, parent)   {
    const dirpath = path.resolve(dir);
    fs.readdir(dirpath, (err, files) => {
        if(err) throw err;
        files.forEach((file) => {
            const filepath = path.resolve(dirpath, file);
            fs.stat(filepath, (err, stats) => {
                if(err) throw err;
                if(stats.isDirectory()) {
                   uploadDirectory(filepath, parent);
                }
                else if(stats.isFile()) {
                    uploadFile(filepath, parent);
                }
            });
        });
    });
}
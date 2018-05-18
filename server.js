'use strict';
var express = require('express');
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var app = express();
var appPort = 3001;

var UPLOAD_FOLDER = 'jsapiupload';
var uploadsPath =  path.join(__dirname, UPLOAD_FOLDER);

app.use(express.static(__dirname + '/public', {
    etag: false,
    lastModified: false
}));
app.use('/' + UPLOAD_FOLDER, express.static(uploadsPath, {
    etag: false,
    lastModified: false
}));

if(!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

app.use(multer({inMemory: true}));

var uploadedFiles = {};
var generateFilename = function(name) {
    var ext = path.extname(name);
    var base = path.basename(name, ext);

    return [UPLOAD_FOLDER, '/', base,'_',Date.now(),ext].join('');
};

app.post('/' + UPLOAD_FOLDER, function (req, res) {

    var body = req.body;
    var name = body.name;

    if(!uploadedFiles[name]) {
        uploadedFiles[name] = {
            localFilename: generateFilename(name),
            expectedStart: 0
        };
    }
    var fileInfo = uploadedFiles[name];
    if (fileInfo.expectedStart === body.start) {
        return res.status(400).json({expectedStart: fileInfo.expectedStart});
    }

    var chunk = req.files['chunk'];
    fs.appendFile(path.resolve(fileInfo.localFilename), chunk.buffer, function (err) {
        if (err) {
            console.log(err);
            throw err;
        }

        fileInfo.expectedStart += chunk.buffer.length;
        if (body.lastChunk === 'true') {
            res.json({fileUrl: encodeURI(fileInfo.localFilename)});
            delete uploadedFiles[name];
        } else {
            res.json({expectedStart: fileInfo.expectedStart});
        }
    });
});

app.listen(appPort, function () {
    console.log('Site available on http://localhost:' + appPort);
});
var ipfsAPI = require('ipfs-api');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var multer = require('multer');
var upload = multer({ dest: '/var/www/html/uploads/' });
var sha256File = require('sha256-file');
const app = express();

router.post('/', upload.fields([ { name: 'thumbnail' } ]), function(req, res, next) {

var path = req.files.thumbnail[0].path;
var filename = req.files.thumbnail[0].filename;
var originalname = req.files.thumbnail[0].originalname;
var targetPath = '/var/www/html/uploads/' + originalname;
var fwversion = req.body.fwversion;
var devicetype = req.body.devicetype;

const ipfs = ipfsAPI({
  host: '127.0.0.1',
  port: 5001,
  protocol: 'http'
});

let IPFS_File = fs.readFileSync(path);
//let IPFS_Buffer = new Buffer(IPFS_File); //OLD buffer method
let IPFS_Buffer = Buffer.from(IPFS_File);  //NEW buffer method

fs.rename(path, targetPath, function(err) {
    if (err) {
      throw err;
    }
    fs.unlink(path, function() {
      if (err) {
        throw err;
      }

    ipfs.files.add(IPFS_Buffer, function (err, file) {
        if (err) {
          console.log(err);
        }
      console.log(file);
      //console.log(sha256File(targetPath));
      res.render('upload', { fwv: fwversion, devicet: devicetype, title: 'Uploaded', target: targetPath, fsize: req.files.thumbnail[0].size, fname: filename, ofname: originalname, hash:sha256File(targetPath), ipfs_path: file[0].path, ipfs_hash: file[0].hash, ipfs_size: file[0].size, url:"http://vendor.local/uploads/"+originalname });
      //console.log('File uploaded to: ' + targetPath + ' - ' + req.files.thumbnail[0].size + ' bytes. Hash value is ');
      //console.log(next);
      //res.send('File uploaded to: ' + targetPath + ' - ' + req.files.thumbnail[0].size + ' bytes');
	})
    });
  });
});

module.exports = router;

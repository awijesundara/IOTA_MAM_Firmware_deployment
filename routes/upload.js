const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const multer = require('multer');
const sha256File = require('sha256-file');
// NOTE: the original code used the long-deprecated `ipfs-api` package.
// `kubo-rpc-client` is the maintained successor for talking to a Kubo
// (go-ipfs) node's HTTP RPC API; it exposes a promise-based client instead
// of the old callback style. Behaviour (pin firmware binary to IPFS,
// then report firmware metadata + IPFS + Tangle info) is unchanged.
const { create } = require('kubo-rpc-client');

const UPLOAD_DIR = process.env.FIRMWARE_UPLOAD_DIR || '/var/www/html/uploads/';
const upload = multer({ dest: UPLOAD_DIR });

router.post('/', upload.fields([{ name: 'thumbnail' }]), async function (req, res, next) {
    try {
        const file = req.files.thumbnail[0];
        const { path, filename, originalname } = file;
        const targetPath = UPLOAD_DIR + originalname;
        const fwversion = req.body.fwversion;
        const devicetype = req.body.devicetype;

        const ipfs = create({
            host: process.env.IPFS_API_HOST || '127.0.0.1',
            port: process.env.IPFS_API_PORT || 5001,
            protocol: process.env.IPFS_API_PROTOCOL || 'http'
        });

        const fileBuffer = await fs.readFile(path);

        await fs.rename(path, targetPath);

        const { cid, size } = await ipfs.add(fileBuffer);

        res.render('upload', {
            fwv: fwversion,
            devicet: devicetype,
            title: 'Uploaded',
            target: targetPath,
            fsize: file.size,
            fname: filename,
            ofname: originalname,
            hash: sha256File(targetPath),
            ipfs_path: cid.toString(),
            ipfs_hash: cid.toString(),
            ipfs_size: size,
            url: (process.env.FIRMWARE_PUBLIC_BASE_URL || 'http://vendor.local/uploads/') + originalname
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

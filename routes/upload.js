const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const sha256File = require('sha256-file');
// NOTE: the original code used the long-deprecated `ipfs-api` package.
// `kubo-rpc-client` is the maintained successor for talking to a Kubo
// (go-ipfs) node's HTTP RPC API; it exposes a promise-based client instead
// of the old callback style. Behaviour (pin firmware binary to IPFS,
// then report firmware metadata + IPFS + Tangle info) is unchanged.
// kubo-rpc-client ships as an ESM-only package (package.json "type":
// "module", no "require" export condition), so it must be loaded via
// dynamic import() rather than require() under CommonJS. A top-level
// require() here throws ERR_PACKAGE_PATH_NOT_EXPORTED and crashes the
// whole app at boot, since app.js requires this route eagerly.
let createPromise;
function getIpfsCreate() {
    if (!createPromise) {
        createPromise = import('kubo-rpc-client').then((mod) => mod.create);
    }
    return createPromise;
}

const UPLOAD_DIR = process.env.FIRMWARE_UPLOAD_DIR || '/var/www/html/uploads/';
const upload = multer({ dest: UPLOAD_DIR });

router.post('/', upload.fields([{ name: 'thumbnail' }]), async function (req, res, next) {
    try {
        const file = req.files.thumbnail[0];
        const { path: tempPath, filename, originalname } = file;
        // Sanitize the client-supplied original filename: strip any directory
        // components so a crafted name (e.g. "../../etc/passwd") can't write
        // outside UPLOAD_DIR (path traversal).
        const safeName = path.basename(originalname);
        const targetPath = path.join(UPLOAD_DIR, safeName);
        const fwversion = req.body.fwversion;
        const devicetype = req.body.devicetype;

        const create = await getIpfsCreate();
        const ipfs = create({
            host: process.env.IPFS_API_HOST || '127.0.0.1',
            port: process.env.IPFS_API_PORT || 5001,
            protocol: process.env.IPFS_API_PROTOCOL || 'http'
        });

        const fileBuffer = await fs.readFile(tempPath);

        await fs.rename(tempPath, targetPath);

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
            url: (process.env.FIRMWARE_PUBLIC_BASE_URL || 'http://vendor.local/uploads/') + safeName
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

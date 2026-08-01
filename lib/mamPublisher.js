// Thin wrapper around the legacy IOTA MAM (Masked Authenticated Messaging)
// library used to publish firmware-update announcements to the Tangle.
//
// NOTE ON DEPRECATION: @iota/mam / mam.node.js and iota.lib.js target the
// pre-Chrysalis IOTA 1.0 mainnet. That network, the MAM protocol, and this
// client library are all deprecated and unmaintained by the IOTA Foundation.
// There is no drop-in JS replacement: the intended successor ("Streams") is
// a Rust/WASM library with a different transport and data model. See the
// README "Legacy protocol notice" section for details and current options.
//
// This module only re-packages the original inline logic from app.js into a
// reusable function; it does not change what gets sent to the Tangle or how.

const Mam = require('./mam.node.js');
const IOTA = require('iota.lib.js');

/**
 * Publish a firmware announcement packet to an IOTA MAM channel.
 *
 * @param {object} packet - firmware metadata (version, file name/size/hash, URL, device type)
 * @param {object} options
 * @param {string} options.provider - IOTA node HTTP(S) endpoint
 * @param {string} options.seed - 81-char A-Z9 IOTA seed used to derive the MAM channel
 * @param {number} [options.security] - MAM security level (default 2, matches original behaviour)
 * @returns {Promise<{root: string, messages: Array}>}
 */
async function publishFirmwareUpdate(packet, { provider, seed, security = 2 } = {}) {
    const iota = new IOTA({ provider });
    let mamState = Mam.init(iota, seed, security, 0);

    const fetchExisting = async () => {
        const startTrytes = iota.utils.toTrytes('START');
        const startMessage = Mam.create(mamState, startTrytes);
        return Mam.fetch(startMessage.root, 'public', null, null);
    };

    const publish = async (data) => {
        const trytes = iota.utils.toTrytes(JSON.stringify(data));
        const message = Mam.create(mamState, trytes);
        mamState = message.state;
        await Mam.attach(message.payload, message.address);
        return message.root;
    };

    const existing = await fetchExisting();
    const startCount = existing.messages.length;

    // Re-derive state at the current channel index so the new message is
    // appended after whatever is already in the stream.
    mamState = Mam.init(iota, seed, security, startCount);

    const root = await publish(packet);
    return { root, messages: existing.messages };
}

module.exports = { publishFirmwareUpdate };

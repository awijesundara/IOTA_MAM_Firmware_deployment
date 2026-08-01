// Gateway-side self-test: subscribes to the legacy IOTA MAM channel and
// replays every firmware announcement published so far. See the README
// "Legacy protocol notice" section: this targets the deprecated pre-Chrysalis
// MAM protocol and public node, kept as-is for research reproducibility.
require('dotenv').config();
var Mam = require('../lib/mam.node.js')
var IOTA = require('iota.lib.js')
var iota = new IOTA({ provider: process.env.IOTA_NODE_PROVIDER || `https://tangle.anushkawijesundara.com:8443` })

// Init State
// INSERT THE ROOT IN HERE!
let root = process.env.IOTA_MAM_ROOT || 'YOUR ROOT'

// Initialise MAM State
var mamState = Mam.init(iota)

// Publish to tangle
const publish = async packet => {
  var trytes = iota.utils.toTrytes(JSON.stringify(packet))
  var message = Mam.create(mamState, trytes)
  mamState = message.state
  await Mam.attach(message.payload, message.address)
  return message.root
}

// Callback used to pass data out of the fetch
const logData = data => console.log(JSON.parse(iota.utils.fromTrytes(data)))

const execute = async () => {
  var resp = await Mam.fetch(root, 'public', null, logData)
  console.log(resp)
}

execute()

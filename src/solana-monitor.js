require('dotenv').config()
const { Connection, PublicKey } = require('@solana/web3.js')

const sqlite3 = require('sqlite3').verbose()
const client = require('./bot')

const alchemyKey = process.env.ALCHEMY_KEY
var connection

if (process.env.MODE === 'dev') {
  connection = new Connection('https://api.mainnet-beta.solana.com')
} else {
  connection = new Connection(
    `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`
  )
}

let db = new sqlite3.Database('./bot.db', (err) => {
  if (err) {
    console.error(err.message)
  }
})

async function checkTransactions() {
  db.each(
    `SELECT serverId, channelId, tokenAddress FROM settings`,
    async (err, row) => {
      if (err) {
        console.error(err.message)
        return
      }
      const { serverId, channelId, tokenAddress } = row
      if (!tokenAddress) return

      const tokenPubKey = new PublicKey(tokenAddress)
      const signatures = await connection.getSignaturesForAddress(tokenPubKey)

      for (const signature of signatures) {
        if (signature.err != null) {
          const transaction = await connection.getParsedTransaction(
            signature.signature,
            { maxSupportedTransactionVersion: 0 }
          )
          if (transaction) {
            // console.log('TRANSACTION ', transaction)
            console.log(
              transaction.transaction?.message?.instructions,
              transaction.transaction?.message?.instructions != null &&
                transaction.transaction?.message?.instructions?.parsed?.type ==
                  'transfer'
            )
            if (
              transaction.transaction?.message?.instructions != null &&
              transaction.transaction?.message?.instructions?.parsed?.type ==
                'transfer'
            ) {
              console.log(
                transaction.transaction?.message?.instructions?.parsed?.info
              )
            }

            // const { meta, transaction: tx } = transaction

            // // Check if it's a buy transaction (simplified example)
            // if (
            //   meta &&
            //   meta.postBalances &&
            //   meta.postBalances[0] > meta.preBalances[0]
            // ) {
            //   console.log('INSTRUCTIONS ', tx)

            //   if (transferInstruction) {
            //     // Extract the amount of tokens transferred
            //     const tokenAmount = transferInstruction.parsed.info.amount

            //     // Calculate the amount of SOL spent
            //     const solSpent = meta.preBalances[0] - meta.postBalances[0]

            //     const message = `Bought ${tokenAmount} ${tokenName} for ${solSpent} SOL. Transaction: https://explorer.solana.com/tx/${signature.signature}`
            //     notifyDiscord(channelId, message)
            //   }
            // }
          }
        }
      }
    }
  )
}

function notifyDiscord(channelId, message) {
  const channel = client.channels.cache.get(channelId)
  if (channel) {
    channel.send(message)
  }
}

setInterval(checkTransactions, process.env.RATE_LIMIT) // Check every 10 sec

module.exports = checkTransactions

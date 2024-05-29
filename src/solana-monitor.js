const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js')
const sqlite3 = require('sqlite3').verbose()
const client = require('./bot')

const connection = new Connection(clusterApiUrl('mainnet-beta'))
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
        const transaction = await connection.getParsedTransaction(
          signature.signature,
          { maxSupportedTransactionVersion: 0 }
        )
        if (transaction) {
          // console.log(transaction)

          const { meta, transaction: tx } = transaction

          // Check if it's a buy transaction (simplified example)
          if (
            meta &&
            meta.postBalances &&
            meta.postBalances[0] > meta.preBalances[0]
          ) {
            // Extract the transfer instruction
            // const transferInstruction = tx.message.instructions.find(
            //   (instruction) => instruction.parsed.type === 'transfer'
            // )

            // log the instructions
            console.log('INSTRUCTIONS ', tx.message.instructions)

            if (transferInstruction) {
              // Extract the amount of tokens transferred
              const tokenAmount = transferInstruction.parsed.info.amount

              // Calculate the amount of SOL spent
              const solSpent = meta.preBalances[0] - meta.postBalances[0]

              const message = `Bought ${tokenAmount} ${tokenName} for ${solSpent} SOL. Transaction: https://explorer.solana.com/tx/${signature.signature}`
              notifyDiscord(channelId, message)
            }
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

setInterval(checkTransactions, 5000) // Check every 5 sec

module.exports = checkTransactions
// require('dotenv').config()
// const { Connection, PublicKey } = require('@solana/web3.js')
// const sqlite3 = require('sqlite3').verbose()
// const client = require('./bot')

// const alchemyKey = process.env.ALCHEMY_KEY
// const rateLimit = process.env.RATE_LIMIT
// let connection

// if (process.env.MODE === 'dev') {
//   connection = new Connection('https://api.mainnet-beta.solana.com')
// } else {
//   connection = new Connection(
//     `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`
//   )
// }

// let db = new sqlite3.Database('./bot.db', (err) => {
//   if (err) {
//     console.error(err.message)
//   }
// })

// async function checkTransactions() {
//   db.each(
//     `SELECT serverId, channelId, tokenAddress FROM settings`,
//     async (err, row) => {
//       if (err) {
//         console.error(err.message)
//         return
//       }
//       const { serverId, channelId, tokenAddress } = row
//       if (!tokenAddress) return

//       const tokenPubKey = new PublicKey(tokenAddress)
//       const signatures = await connection.getSignaturesForAddress(tokenPubKey)

//       for (const signature of signatures) {
//         if (signature.err == null) {
//           const transaction = await connection.getParsedTransaction(
//             signature.signature,
//             { maxSupportedTransactionVersion: 0 }
//           )
//           if (transaction) {
//             const { meta, transaction: tx } = transaction

//             if (meta && tx) {
//               const preTokenBalance = meta.preTokenBalances.find(
//                 (balance) => balance.mint === tokenAddress
//               )
//               const postTokenBalance = meta.postTokenBalances.find(
//                 (balance) => balance.mint === tokenAddress
//               )

//               if (preTokenBalance && postTokenBalance) {
//                 const tokenAmount =
//                   postTokenBalance.uiTokenAmount.uiAmount -
//                   preTokenBalance.uiTokenAmount.uiAmount

//                 const solSpent =
//                   meta.preBalances[0] - meta.postBalances[0] / Math.pow(10, 9)

//                 if (tokenAmount > 0 && solSpent > 0) {
//                   const message = `Bought ${tokenAmount} tokens for ${solSpent} SOL. Transaction: https://explorer.solana.com/tx/${signature.signature}`
//                   notifyDiscord(channelId, message)
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   )
// }

// function notifyDiscord(channelId, message) {
//   const channel = client.channels.cache.get(channelId)
//   if (channel) {
//     channel.send(message)
//   }
// }

import { config } from 'dotenv'
import { Connection, PublicKey } from '@solana/web3.js'
import sqlite3 from 'sqlite3'
import client from './bot'
import { TextChannel } from 'discord.js'

config()

const alchemyKey: string = process.env.ALCHEMY_KEY as string
const rateLimit: string = process.env.RATE_LIMIT as string
let connection: Connection

if (process.env.MODE === 'dev') {
  connection = new Connection('https://api.mainnet-beta.solana.com')
} else {
  connection = new Connection(
    `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`
  )
}

let db = new sqlite3.Database('./bot.db', (err: Error | null) => {
  if (err) {
    console.error(err.message)
  }
})

async function checkTransactions(): Promise<void> {
  db.each(
    `SELECT serverId, channelId, tokenAddress FROM settings`,
    async (err: Error | null, row: any) => {
      if (err) {
        console.error(err.message)
        return
      }
      const { serverId, channelId, tokenAddress } = row
      if (!tokenAddress) return

      const tokenPubKey = new PublicKey(tokenAddress)
      const signatures = await connection.getSignaturesForAddress(tokenPubKey)

      for (const signature of signatures) {
        if (signature.err == null) {
          const transaction = await connection.getParsedTransaction(
            signature.signature,
            { maxSupportedTransactionVersion: 0 }
          )
          if (transaction) {
            const { meta, transaction: tx } = transaction

            if (meta && tx) {
              const preTokenBalance = meta.preTokenBalances?.find(
                (balance) => balance.mint === tokenAddress
              )
              const postTokenBalance = meta.postTokenBalances?.find(
                (balance) => balance.mint === tokenAddress
              )

              if (
                preTokenBalance?.uiTokenAmount.uiAmount &&
                postTokenBalance?.uiTokenAmount.uiAmount
              ) {
                const tokenAmount =
                  postTokenBalance.uiTokenAmount.uiAmount -
                  preTokenBalance.uiTokenAmount.uiAmount

                const solSpent =
                  meta.preBalances[0] - meta.postBalances[0] / Math.pow(10, 9)

                if (tokenAmount > 0 && solSpent > 0) {
                  const message = `Bought ${tokenAmount} tokens for ${solSpent} SOL. Transaction: https://explorer.solana.com/tx/${signature.signature}`
                  notifyDiscord(channelId, message)
                }
              }
            }
          }
        }
      }
    }
  )
}
function notifyDiscord(channelId: string, message: string): void {
  const channel = client.channels.cache.get(channelId) as TextChannel
  if (channel) {
    channel.send(message)
  }
}

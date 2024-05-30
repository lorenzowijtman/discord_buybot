// require('dotenv').config()
// const { Client, GatewayIntentBits } = require('discord.js')
// const sqlite3 = require('sqlite3').verbose()
// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// })

// const token = process.env.TOKEN

// let db = new sqlite3.Database('./bot.db', (err) => {
//   if (err) {
//     console.error(err.message)
//   }
//   console.log('Connected to the bot database.')
// })

// db.run(
//   `CREATE TABLE IF NOT EXISTS settings (serverId TEXT, channelId TEXT, tokenAddress TEXT)`
// )

// client.once('ready', () => {
//   console.log('Discord bot is ready!')
// })

// client.on('messageCreate', (message) => {
//   if (message.content.startsWith('!setChannel')) {
//     if (message.guild) {
//       const serverId = message.guild.id
//       const channelId = message.channel.id
//       db.run(
//         `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, ?, (SELECT tokenAddress FROM settings WHERE serverId = ?))`,
//         [serverId, channelId, serverId],
//         function (err) {
//           if (err) {
//             return console.error(err.message)
//           }
//           message.channel.send(`Channel set to: ${channelId}`)
//         }
//       )
//     }
//   }

//   if (message.content.startsWith('!setToken')) {
//     const args = message.content.split(' ')
//     if (args.length === 2 && args[1].length === 44) {
//       const serverId = message.guild.id
//       const tokenAddress = args[1]
//       db.run(
//         `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, (SELECT channelId FROM settings WHERE serverId = ?), ?)`,
//         [serverId, serverId, tokenAddress],
//         function (err) {
//           if (err) {
//             return console.error(err.message)
//           }
//           message.channel.send(`Token address set to: ${tokenAddress}`)
//         }
//       )
//     } else {
//       message.channel.send(
//         'Invalid token address. Please provide a valid Solana token address.'
//       )
//     }
//   }

//   if (message.content.startsWith('!getAllRecords')) {
//     db.each(`SELECT * FROM settings`, (err, row) => {
//       if (err) {
//         return console.error(err.message)
//       }
//       message.channel.send(
//         `Server ID: ${row.serverId}, Channel ID: ${row.channelId}, Token Address: ${row.tokenAddress}`
//       )
//     })
//   }

//   if (message.content.startsWith('!deleteAllRecords')) {
//     db.run(`DELETE FROM settings`, function (err) {
//       if (err) {
//         return console.error(err.message)
//       }
//       message.channel.send('All records deleted.')
//     })
//   }

//   if (message.content.startsWith('!removeToken')) {
//     const serverId = message.guild.id
//     db.run(
//       `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, (SELECT channelId FROM settings WHERE serverId = ?), NULL)`,
//       [serverId, serverId],
//       function (err) {
//         if (err) {
//           return console.error(err.message)
//         }
//         message.channel.send(`Token address removed.`)
//       }
//     )
//   }
// })

// client.login(token)

// module.exports = client

import { config } from 'dotenv'
import { Client, GatewayIntentBits, Message } from 'discord.js'
import sqlite3 from 'sqlite3'

config()
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const token: string = process.env.TOKEN as string

let db = new sqlite3.Database('./bot.db', (err: Error | null) => {
  if (err) {
    console.error(err.message)
  }
  console.log('Connected to the bot database.')
})

db.run(
  `CREATE TABLE IF NOT EXISTS settings (serverId TEXT, channelId TEXT, tokenAddress TEXT)`
)

client.once('ready', () => {
  console.log('Discord bot is ready!')
})

client.on('messageCreate', (message: Message) => {
  if (message.content.startsWith('!setChannel')) {
    if (message.guild) {
      const serverId = message.guild.id
      const channelId = message.channel.id
      db.run(
        `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, ?, (SELECT tokenAddress FROM settings WHERE serverId = ?))`,
        [serverId, channelId, serverId],
        function (err) {
          if (err) {
            return console.error(err.message)
          }
          message.channel.send(`Channel set to: ${channelId}`)
        }
      )
    }
  }

  if (message.content.startsWith('!setToken')) {
    const args = message.content.split(' ')
    if (args.length === 2 && args[1].length === 44) {
      const serverId = message.guild?.id
      const tokenAddress = args[1]
      db.run(
        `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, (SELECT channelId FROM settings WHERE serverId = ?), ?)`,
        [serverId, serverId, tokenAddress],
        function (err) {
          if (err) {
            return console.error(err.message)
          }
          message.channel.send(`Token address set to: ${tokenAddress}`)
        }
      )
    } else {
      message.channel.send(
        'Invalid token address. Please provide a valid Solana token address.'
      )
    }
  }

  if (message.content.startsWith('!getAllRecords')) {
    db.each(`SELECT * FROM settings`, (err, row: any) => {
      if (err) {
        return console.error(err.message)
      }
      message.channel.send(
        `Server ID: ${row.serverId}, Channel ID: ${row.channelId}, Token Address: ${row.tokenAddress}`
      )
    })
  }

  if (message.content.startsWith('!deleteAllRecords')) {
    db.run(`DELETE FROM settings`, function (err) {
      if (err) {
        return console.error(err.message)
      }
      message.channel.send('All records deleted.')
    })
  }

  if (message.content.startsWith('!removeToken')) {
    const serverId = message.guild?.id
    db.run(
      `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, (SELECT channelId FROM settings WHERE serverId = ?), NULL)`,
      [serverId, serverId],
      function (err) {
        if (err) {
          return console.error(err.message)
        }
        message.channel.send(`Token address removed.`)
      }
    )
  }
})

client.login(token)

export default client

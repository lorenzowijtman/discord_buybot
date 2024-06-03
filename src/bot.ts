import { config } from 'dotenv'
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Message,
} from 'discord.js'
import sqlite3 from 'sqlite3'
import SolanaMonitor from './solana-monitor'

export class Bot {
  private client: Client
  private db: sqlite3.Database
  private token: string
  private solanaMonitor: SolanaMonitor
  private commands: Collection<string, any>

  private initialize(): void {
    this.token = process.env.TOKEN as string

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })

    this.commands = new Collection()

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return
      console.log(interaction)

      const command = this.commands.get(interaction.commandName)

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        )
        return
      }

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          })
        }
      }
    })

    this.db = new sqlite3.Database('../bot.db', (err) => {
      if (err) {
        console.error(err.message)
      }
      console.log('Connected to the bot database.')
    })

    this.db.run(
      `CREATE TABLE IF NOT EXISTS settings (serverId TEXT, channelId TEXT, tokenAddress TEXT)`
    )

    this.solanaMonitor = new SolanaMonitor(this.client, this.db)
    this.solanaMonitor.run()
  }

  private handleMessages(message: Message): void {
    if (message.content.startsWith('!setChannel')) {
      if (message.guild) {
        const serverId = message.guild.id
        const channelId = message.channel.id
        this.db.run(
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
        this.db.run(
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
      this.db.each(`SELECT * FROM settings`, (err, row: any) => {
        if (err) {
          return console.error(err.message)
        }
        message.channel.send(
          `Server ID: ${row.serverId}, Channel ID: ${row.channelId}, Token Address: ${row.tokenAddress}`
        )
      })
    }

    if (message.content.startsWith('!deleteAllRecords')) {
      this.db.run(`DELETE FROM settings`, function (err) {
        if (err) {
          return console.error(err.message)
        }
        message.channel.send('All records deleted.')
      })
    }

    if (message.content.startsWith('!removeToken')) {
      const serverId = message.guild?.id
      this.db.run(
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
  }

  run(): void {
    this.initialize()

    this.client.once('ready', () => {
      console.log('Discord bot is ready!')
    })

    this.client.on('messageCreate', this.handleMessages)

    this.client.login(this.token)
  }
}

export default Bot

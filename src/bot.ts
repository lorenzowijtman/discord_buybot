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
import { ping, track, stop } from './commands'
import path from 'path'

export class Bot {
  private client: Client
  private db: sqlite3.Database
  private token: string
  private solanaMonitor: SolanaMonitor
  private commands: Collection<string, any>

  private setCommands(): void {
    this.commands.set(ping.data.name, ping)
    this.commands.set(track.data.name, track)
    this.commands.set(stop.data.name, stop)
  }

  private initialize(): void {
    this.token = process.env.TOKEN as string

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })

    this.db = new sqlite3.Database(path.join(__dirname, '../bot.db'), (err) => {
      if (err) {
        console.error(err.message)
      }
      console.log('Connected to the bot database.')
    })

    this.db.run(
      `CREATE TABLE IF NOT EXISTS settings (serverId TEXT, channelId TEXT, tokenAddress TEXT, lastSignature TEXT)`
    )

    this.commands = new Collection()
    this.setCommands()

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
        await command.execute(interaction, this.db)
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

    this.solanaMonitor = new SolanaMonitor(this.client, this.db)
    this.solanaMonitor.run()
  }

  private handleMessages(message: Message): void {
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

    if (message.content.startsWith('!getGuildId')) {
      const serverId = message.guild?.id
      message.channel.send(`Server ID: ${serverId}`)
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

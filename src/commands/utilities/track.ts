import { SlashCommandBuilder } from '@discordjs/builders'
import sqlite3 from 'sqlite3'

export default {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Provide token CA for buy tracking')
    .addStringOption((option) =>
      option
        .setName('token')
        .setDescription('The token to track')
        .setRequired(true)
    ),
  async execute(interaction: any, db: sqlite3.Database) {
    const token = interaction.options.getString('token')
    const tokenRegex = new RegExp('[1-9A-HJ-NP-Za-km-z]{32,44}')
    if (tokenRegex.test(token)) {
      const serverId = interaction.guildId
      db.run(
        `INSERT OR REPLACE INTO settings (serverId, channelId, tokenAddress) VALUES (?, (SELECT channelId FROM settings WHERE serverId = ?), ?);`,
        [serverId, serverId, token],
        function (err) {
          if (err) {
            return console.error(err.message)
          }
          interaction.reply(`Token address set to: ${token}`)
        }
      )
    } else {
      interaction.reply(
        'Invalid token address. Please provide a valid Solana token address.'
      )
    }
  },
}

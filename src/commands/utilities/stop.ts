import { SlashCommandBuilder } from '@discordjs/builders'
import sqlite3 from 'sqlite3'

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop tracking token'),
  async execute(interaction: any, db: sqlite3.Database) {
    const serverId = interaction.guildId
    db.run(
      `DELETE FROM settings WHERE serverId = ?;`,
      [serverId],
      function (err) {
        if (err) {
          return console.error(err.message)
        }
        interaction.reply(`Stopped tracking token.`)
      }
    )
  },
}

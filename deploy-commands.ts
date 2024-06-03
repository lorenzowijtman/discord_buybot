import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import { config } from 'dotenv'
import { ping, track, stop } from './src/commands'
config()

const commands = [ping, track, stop]
const newCommands: any[] = []

// Loop over all commands
for (const command of commands) {
  console.log(command)
  if ('data' in command && 'execute' in command) {
    newCommands.push((command.data as SlashCommandBuilder).toJSON())
  } else {
    console.log(
      `[WARNING] The command "${command}" is missing a required "data" or "execute" property.`
    )
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN as string)

// Define clientId and guildId
const clientId = process.env.CLIENT_ID as string
const guildId = process.env.GUILD_ID as string

// and deploy your commands!
;(async () => {
  try {
    console.log(
      `Started refreshing ${newCommands.length} application (/) commands.`
    )

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: newCommands,
    })) as any

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    )

    // The put method is used to fully refresh all commands in the guild with the current set
    const guildData = (await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      {
        body: newCommands,
      }
    )) as any

    console.log(
      `Successfully reloaded ${guildData.length} application (/) commands for Guild.`
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
})()

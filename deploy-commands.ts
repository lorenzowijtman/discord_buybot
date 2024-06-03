import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import { config } from 'dotenv'
import { ping } from './src/commands'
config()

const commands = [ping]
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
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
})()

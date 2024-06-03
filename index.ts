import express, { Request, Response } from 'express'
import Bot from './src/bot'
import { config } from 'dotenv'

config()

const app = express()
const port = process.env.PORT || 8080

app.get('/', (_req: Request, res: Response) => {
  return res.send('Express Typescript on Vercel')
})

app.get('/ping', (_req: Request, res: Response) => {
  return res.send('pong 🏓')
})

app.listen(port, () => {
  const bot = new Bot()

  bot.run()
  return console.log(`Server is listening on ${port}`)
})

import { config } from 'dotenv'
import { Connection, PublicKey } from '@solana/web3.js'
import sqlite3 from 'sqlite3'
import { Client, TextChannel } from 'discord.js'

export class SolanaMonitor {
  private alchemyKey: string = process.env.ALCHEMY_KEY as string
  private rateLimit: number = process.env.RATE_LIMIT as unknown as number
  private connection: Connection
  private db: sqlite3.Database
  private client: Client

  constructor(client: Client, db: sqlite3.Database) {
    this.client = client
    this.db = db

    this.checkTransactions = this.checkTransactions.bind(this)

    console.log('db in constructor: ', db)
  }

  private initialize(): void {
    if (process.env.MODE === 'dev') {
      this.connection = new Connection('https://api.mainnet-beta.solana.com')
    } else {
      this.connection = new Connection(
        `https://solana-mainnet.g.alchemy.com/v2/${this.alchemyKey}`
      )
    }
  }

  private async checkTransactions(): Promise<void> {
    console.log(this.db)
    this.db.each(
      `SELECT serverId, channelId, tokenAddress FROM settings`,
      async (err: Error | null, row: any) => {
        if (err) {
          console.error(err.message)
          return
        }
        const { serverId, channelId, tokenAddress } = row
        if (!tokenAddress) return

        const tokenPubKey = new PublicKey(tokenAddress)
        const signatures = await this.connection.getSignaturesForAddress(
          tokenPubKey
        )

        for (const signature of signatures) {
          if (signature.err == null) {
            const transaction = await this.connection.getParsedTransaction(
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
                    this.notifyDiscord(channelId, message)
                  }
                }
              }
            }
          }
        }
      }
    )
  }

  private notifyDiscord(channelId: string, message: string): void {
    const channel = this.client.channels.cache.get(channelId) as TextChannel
    if (channel) {
      channel.send(message)
    }
  }

  run(): void {
    this.initialize()
    setInterval(this.checkTransactions, this.rateLimit)
  }
}

export default SolanaMonitor

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
  }

  private initialize(): void {
    if (process.env.MODE === 'dev') {
      this.connection = new Connection('https://api.mainnet-beta.solana.com')
      console.log('Connected to Solana mainnet network.')
    } else {
      this.connection = new Connection(
        `https://solana-mainnet.g.alchemy.com/v2/${this.alchemyKey}`
      )
      console.log('Connected to Alchemy network.')
    }
  }

  private async checkTransactions(): Promise<void> {
    this.db.each(
      `SELECT serverId, channelId, tokenAddress, lastSignature FROM settings`,
      async (err: Error | null, row: any) => {
        console.log('row: ', row)
        if (err) {
          console.error(err.message)
          return
        }
        const { serverId, channelId, tokenAddress, lastSignature } = row
        if (!tokenAddress) return

        const tokenPubKey = new PublicKey(tokenAddress)
        const signatures = await this.connection.getSignaturesForAddress(
          tokenPubKey
        )

        // Only check the signatures that are newer than the last checked signature
        const newSignatures = signatures.filter((signature) =>
          lastSignature ? signature !== lastSignature : true
        )

        for (const signature of newSignatures) {
          if (signature.err == null) {
            console.log('signature err nn ')
            const transaction = await this.connection.getParsedTransaction(
              signature.signature,
              { maxSupportedTransactionVersion: 0 }
            )

            this.db.run(
              `UPDATE settings SET lastSignature = ? WHERE serverId = ? AND tokenAddress = ?`,
              [signature.signature, serverId, tokenAddress],
              (updateErr) => {
                if (updateErr) {
                  console.error(updateErr.message)
                }
              }
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
                    break
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

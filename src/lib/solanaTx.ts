import { Connection, PublicKey, Transaction, VersionedTransaction, BlockhashWithExpiryBlockHeight } from '@solana/web3.js';

export interface ExecuteSolanaTxOptions {
  connection: Connection;
  transaction: Transaction | VersionedTransaction;
  sendTransaction?: (tx: any, conn: any, options?: any) => Promise<string>;
  walletProvider?: any;
  publicKey?: PublicKey | null;
  isAppKitConnected?: boolean;
  latestBlockhash?: BlockhashWithExpiryBlockHeight;
  maxConfirmAttempts?: number;
}

/**
 * Executes and reliably confirms a Solana transaction.
 * Solves "transaction signature has expired" and RPC polling timeouts by:
 * 1. Enabling skipPreflight & maxRetries when sending
 * 2. Attempting standard confirmTransaction with fresh blockhash bounds
 * 3. Fallback to querying getSignatureStatus directly on-chain if confirmation times out
 */
export async function executeSolanaTransaction({
  connection,
  transaction,
  sendTransaction,
  walletProvider,
  publicKey,
  isAppKitConnected,
  latestBlockhash,
  maxConfirmAttempts = 12
}: ExecuteSolanaTxOptions): Promise<string> {
  const sendOptions = {
    skipPreflight: true,
    maxRetries: 5,
    preflightCommitment: 'confirmed' as const,
  };

  let signature = '';

  if (isAppKitConnected && walletProvider && typeof walletProvider.sendTransaction === 'function') {
    try {
      signature = await walletProvider.sendTransaction(transaction, connection, sendOptions);
    } catch (e: any) {
      if (publicKey && sendTransaction) {
        console.warn('AppKit provider failed, trying sendTransaction fallback:', e);
        signature = await sendTransaction(transaction, connection, sendOptions);
      } else {
        throw e;
      }
    }
  } else if (publicKey && sendTransaction) {
    try {
      signature = await sendTransaction(transaction, connection, sendOptions);
    } catch (e: any) {
      if (walletProvider && typeof walletProvider.sendTransaction === 'function') {
        console.warn('sendTransaction failed, trying walletProvider fallback:', e);
        signature = await walletProvider.sendTransaction(transaction, connection, sendOptions);
      } else {
        throw e;
      }
    }
  } else if (walletProvider && typeof walletProvider.sendTransaction === 'function') {
    signature = await walletProvider.sendTransaction(transaction, connection, sendOptions);
  } else if (sendTransaction) {
    signature = await sendTransaction(transaction, connection, sendOptions);
  } else {
    throw new Error('No connected wallet provider available. Please connect your wallet via WalletConnect or Phantom.');
  }

  if (!signature) {
    throw new Error('Failed to generate transaction signature.');
  }

  // Get recent blockhash info for confirmation bounds if not provided
  let blockhashInfo = latestBlockhash;
  if (!blockhashInfo) {
    try {
      blockhashInfo = await connection.getLatestBlockhash('confirmed');
    } catch (e) {
      console.warn('Could not fetch latest blockhash for confirmation:', e);
    }
  }

  // Primary confirmation via RPC strategy
  let isConfirmed = false;
  if (blockhashInfo) {
    try {
      const confirmRes = await connection.confirmTransaction({
        signature,
        blockhash: blockhashInfo.blockhash,
        lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      }, 'confirmed');

      if (confirmRes.value.err) {
        throw new Error(`Transaction error on-chain: ${JSON.stringify(confirmRes.value.err)}`);
      }
      isConfirmed = true;
    } catch (err: any) {
      console.warn('Primary confirmTransaction threw or timed out, checking status on-chain:', err);
    }
  }

  // Fallback signature status polling to prevent false "signature expired" errors
  if (!isConfirmed) {
    for (let attempt = 0; attempt < maxConfirmAttempts; attempt++) {
      try {
        const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (status && status.value) {
          if (status.value.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.value.err)}`);
          }
          if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
            isConfirmed = true;
            break;
          }
        }
      } catch (statErr) {
        console.warn(`Attempt ${attempt + 1}/${maxConfirmAttempts} checking status failed:`, statErr);
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  if (!isConfirmed) {
    throw new Error('Transaction signature expired because approval in wallet took too long. Please try again and approve promptly.');
  }

  return signature;
}

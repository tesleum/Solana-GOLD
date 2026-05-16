import { TransactionMessage, VersionedTransaction, AddressLookupTableAccount, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export async function logic(
  amountUsGoldDecimals: number,
  exactUsGoldAmount: number,
  usGoldMint: PublicKey,
  currentPublicKey: PublicKey,
  connection: any,
  payees: { pubkey: PublicKey, percent: number }[],
  sendTransaction: any,
  walletProvider: any,
  isAppKitConnected: boolean
) {
  // 1. Get exact quote
  const res = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${usGoldMint.toString()}&amount=${exactUsGoldAmount}&swapMode=ExactOut&slippageBps=50`);
  const quoteResponse = await res.json();
  if (quoteResponse.error) throw new Error(quoteResponse.error);

  // 2. Get swap instructions
  const {
      computeBudgetInstructions,
      setupInstructions,
      swapInstruction,
      cleanupInstruction,
      addressLookupTableAddresses,
  } = await fetch('https://quote-api.jup.ag/v6/swap-instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          quoteResponse,
          userPublicKey: currentPublicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
      })
  }).then(r => r.json());

  const deserializeInstruction = (instruction: any) => {
      return new TransactionInstruction({
          programId: new PublicKey(instruction.programId),
          keys: instruction.accounts.map((key: any) => ({
              pubkey: new PublicKey(key.pubkey),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
          })),
          data: Buffer.from(instruction.data, "base64"),
      });
  };

  const getAddressLookupTableAccounts = async (keys: string[]) => {
      const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
          keys.map((key: string) => new PublicKey(key))
      );
      return addressLookupTableAccountInfos.reduce((acc: any[], accountInfo: any, index: number) => {
          const addressLookupTableAddress = keys[index];
          if (accountInfo) {
              const addressLookupTableAccount = new AddressLookupTableAccount({
                  key: new PublicKey(addressLookupTableAddress),
                  state: AddressLookupTableAccount.deserialize(accountInfo.data),
              });
              acc.push(addressLookupTableAccount);
          }
          return acc;
      }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts = await getAddressLookupTableAccounts(addressLookupTableAddresses);

  const instructions = [
      ...computeBudgetInstructions.map(deserializeInstruction),
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstruction),
  ];

  const sourceATA = await getAssociatedTokenAddress(usGoldMint, currentPublicKey);

  for (const payee of payees) {
      if (payee.percent <= 0) continue;
      const destAmount = Math.floor(exactUsGoldAmount * (payee.percent / 100));
      if (destAmount <= 0) continue;

      const destATA = await getAssociatedTokenAddress(usGoldMint, payee.pubkey);
      instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
              currentPublicKey,
              destATA,
              payee.pubkey,
              usGoldMint
          )
      );
      instructions.push(
          createTransferInstruction(
              sourceATA,
              destATA,
              currentPublicKey,
              destAmount,
              [],
              TOKEN_PROGRAM_ID
          )
      );
  }

  if (cleanupInstruction) {
      instructions.push(deserializeInstruction(cleanupInstruction));
  }

  const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const messageV0 = new TransactionMessage({
      payerKey: currentPublicKey,
      recentBlockhash: blockhash,
      instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);

  let signature;
  if (currentPublicKey && sendTransaction) {
      signature = await sendTransaction(transaction, connection);
  } else if (isAppKitConnected && walletProvider) {
      signature = await walletProvider.sendTransaction(transaction, connection);
  } else {
      throw new Error("No wallet provider available to send transaction");
  }

  return signature;
}

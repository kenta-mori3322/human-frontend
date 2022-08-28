import {
  assertIsDeliverTxSuccess,
} from '@cosmjs/stargate'

import {
  selectTransferSourceChain,
  selectSourceWalletAddress,
  selectTransferTargetChain,
  selectTransferTargetAddressHex,
  selectTransferAmount,
} from "../store/selectors";

import { useSelector } from "react-redux";
import { useCallback, useMemo, useState } from "react";
import { MsgRequestTransaction } from "../humans-sdk/tx";
import { ChainID } from '@certusone/wormhole-sdk/lib/cjs/proto/publicrpc/v1/publicrpc';
import { TxClient, MissingWalletError, CalcFee} from "./common"
import { useHumanProvider } from "../contexts/HumanProviderContext"

export default function useRequestTransaction() {
  const [transactionResult, setTransactionResult] = useState("");
  const [txRequesting, setTxRequesting] = useState(false);

  const sourceChain = useSelector(selectTransferSourceChain);
  const sourceAmount = useSelector(selectTransferAmount);
  const sourceWalletAddress = useSelector(selectSourceWalletAddress);

  const targetChain = useSelector(selectTransferTargetChain);
  const targetAddressHex = useSelector(selectTransferTargetAddressHex);
  const serviceFee = CalcFee();

  const {
    humanSignerClient
  } = useHumanProvider();

  const sendMsgRequestTransaction = async (fee = [], memo = '') => {
    try {
      const client = await TxClient(humanSignerClient);
      const [firstAccount] = await humanSignerClient.getAccounts();

      let oChain = "Human";
      if (sourceChain == ChainID.CHAIN_ID_ETHEREUM) {
        oChain = "Ethereum"
      }

      let tChain = "Human"
      if (targetChain == ChainID.CHAIN_ID_ETHEREUM) {
        tChain = "Ethereum"
      }

      const value: MsgRequestTransaction = {
        creator: firstAccount.address,
        originChain: oChain,
        originAddress: sourceWalletAddress as string,
        targetChain: tChain,
        targetAddress: targetAddressHex as string,
        amount: sourceAmount,
        fee: "" + serviceFee,
      };

      const msg = await client.msgRequestTransaction(value)
      const result = await client.signAndBroadcast([msg], { fee: { amount: fee, gas: "200000" }, memo })
      console.log(result.rawLog);

      return result.rawLog
    } catch (e: any) {
      if (e == MissingWalletError) {
        console.log('TxClient:MsgRequestTransaction:Init Could not initialize signing client. Wallet is required.')
      } else {
        console.log('TxClient:MsgRequestTransaction:Send Could not broadcast Tx: ' + e.message)
      }

      return e.message
    }
  }

  const handleRequestTransaction = useCallback(async () => {
    setTxRequesting(true)
    const result = await sendMsgRequestTransaction();
    assertIsDeliverTxSuccess(result);
    setTransactionResult(result);
    setTxRequesting(false)
  }, [transactionResult]);

  return useMemo(
    () => ({
      txRequesting, transactionResult, handleTransaction: handleRequestTransaction
    }),
    [
      txRequesting, transactionResult, handleRequestTransaction
    ]
  );
}


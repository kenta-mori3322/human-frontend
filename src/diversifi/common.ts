import { SigningStargateClient, StdFee } from "@cosmjs/stargate";

import {
  Registry,
  DirectSecp256k1HdWallet,
  OfflineSigner,
  EncodeObject,
} from "@cosmjs/proto-signing";

import { MsgRequestTransaction } from "../diversifi-sdk/tx";
import { MsgTranfserPoolcoin } from "../diversifi-sdk/tx";
import { MsgKeysignVote } from "../diversifi-sdk/tx";
import { MsgApproveTransaction } from "../diversifi-sdk/tx";
import { MsgObservationVote } from "../diversifi-sdk/tx";
import { MsgUpdateBalance } from "../diversifi-sdk/tx";

import { MsgMultiSend } from "../bank-sdk/tx";
import { MsgSend } from "../bank-sdk/tx";

import { useSelector } from "react-redux";
import {
  selectTransferAmount,
} from "../store/selectors";

interface TxClientOptions {
  addr: string;
}

const defaultFee = {
  amount: [],
  gas: "200000",
};

interface SignAndBroadcastOptions {
  fee: StdFee;
  memo?: string;
}

const types = [
  ["/vigorousdeveloper.pochuman.pochuman.MsgRequestTransaction", MsgRequestTransaction],
  ["/vigorousdeveloper.pochuman.pochuman.MsgTranfserPoolcoin", MsgTranfserPoolcoin],
  ["/vigorousdeveloper.pochuman.pochuman.MsgKeysignVote", MsgKeysignVote],
  ["/vigorousdeveloper.pochuman.pochuman.MsgApproveTransaction", MsgApproveTransaction],
  ["/vigorousdeveloper.pochuman.pochuman.MsgObservationVote", MsgObservationVote],
  ["/vigorousdeveloper.pochuman.pochuman.MsgUpdateBalance", MsgUpdateBalance],

  ["/cosmos.bank.v1beta1.MsgMultiSend", MsgMultiSend],
  ["/cosmos.bank.v1beta1.MsgSend", MsgSend],
];

// export const Diversifi_Node1 = "18.234.18.234"
export const Diversifi_Node1 = process.env.REACT_APP_Diversifi_Node_Provider1;

export const MissingWalletError = new Error("wallet is required");
export const registry = new Registry(<any>types);

export const CalcFee = () => {
  const sendAmount = useSelector(selectTransferAmount);

  if (+sendAmount < 10 ) return 1;
  if (+sendAmount < 100 ) return 2;
  if (+sendAmount < 500 ) return 5;

  return 10;
}

export const TxClient = async (
  wallet: OfflineSigner,
  { addr: addr }: TxClientOptions = { addr: "http://" + Diversifi_Node1 }
) => {
  if (!wallet) throw MissingWalletError;
  let client: any;
  if (addr) {
    client = await SigningStargateClient.connectWithSigner(addr, wallet, {
      registry,
    });
  } else {
    client = await SigningStargateClient.offline(wallet, { registry });
  }
  const { address } = (await wallet.getAccounts())[0];

  return {
    signAndBroadcast: (msgs: EncodeObject[], { fee, memo }: SignAndBroadcastOptions = {fee: defaultFee, memo: ""}) => client.signAndBroadcast(address, msgs, fee,memo),
    msgRequestTransaction: (data: MsgRequestTransaction): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgRequestTransaction", value: MsgRequestTransaction.fromPartial( data ) }),
    msgTranfserPoolcoin: (data: MsgTranfserPoolcoin): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgTranfserPoolcoin", value: MsgTranfserPoolcoin.fromPartial( data ) }),
    msgKeysignVote: (data: MsgKeysignVote): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgKeysignVote", value: MsgKeysignVote.fromPartial( data ) }),
    msgApproveTransaction: (data: MsgApproveTransaction): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgApproveTransaction", value: MsgApproveTransaction.fromPartial( data ) }),
    msgObservationVote: (data: MsgObservationVote): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgObservationVote", value: MsgObservationVote.fromPartial( data ) }),
    msgUpdateBalance: (data: MsgUpdateBalance): EncodeObject => ({ typeUrl: "/vigorousdeveloper.pochuman.pochuman.MsgUpdateBalance", value: MsgUpdateBalance.fromPartial( data ) }),
    msgMultiSend: (data: MsgMultiSend): EncodeObject => ({ typeUrl: "/cosmos.bank.v1beta1.MsgMultiSend", value: MsgMultiSend.fromPartial( data ) }),
    msgSend: (data: MsgSend): EncodeObject => ({ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: MsgSend.fromPartial( data ) }),
    
  };
};

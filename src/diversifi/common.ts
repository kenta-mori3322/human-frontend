import { SigningStargateClient, StdFee } from "@cosmjs/stargate";

import {
  Registry,
  DirectSecp256k1HdWallet,
  OfflineSigner,
  EncodeObject,
} from "@cosmjs/proto-signing";
import {
  MsgRequestTransaction,
  MsgApproveTransaction,
  MsgFetchBalance,
} from "../diversifi-sdk/tx";

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
  [
    "/DiversifiTechnologies.diversifi.diversifi.MsgRequestTransaction",
    MsgRequestTransaction,
  ],
  [
    "/DiversifiTechnologies.diversifi.diversifi.MsgApproveTransaction",
    MsgApproveTransaction,
  ],
  [
    "/DiversifiTechnologies.diversifi.diversifi.MsgFetchBalance",
    MsgFetchBalance,
  ],
];

// export const Diversifi_Node1 = "18.234.18.234"
export const Diversifi_Node1 = process.env.REACT_APP_Diversifi_Node_Provider1;

export const MissingWalletError = new Error("wallet is required");
export const registry = new Registry(<any>types);

export async function CreateAddress(): Promise<OfflineSigner> {
  const mnemonic =
    "pet apart myth reflect stuff force attract taste caught fit exact ice slide sheriff state since unusual gaze practice course mesh magnet ozone purchase";
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: "kima",
  });

  return wallet;
}

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
    signAndBroadcast: (
      msgs: EncodeObject[],
      { fee, memo }: SignAndBroadcastOptions = { fee: defaultFee, memo: "" }
    ) => client.signAndBroadcast(address, msgs, fee, memo),
    msgRequestTransaction: (data: MsgRequestTransaction): EncodeObject => ({
      typeUrl:
        "/DiversifiTechnologies.diversifi.diversifi.MsgRequestTransaction",
      value: MsgRequestTransaction.fromPartial(data),
    }),
    msgApproveTransaction: (data: MsgApproveTransaction): EncodeObject => ({
      typeUrl:
        "/DiversifiTechnologies.diversifi.diversifi.MsgApproveTransaction",
      value: MsgApproveTransaction.fromPartial(data),
    }),
    msgFetchBalance: (data: MsgFetchBalance): EncodeObject => ({
      typeUrl: "/DiversifiTechnologies.diversifi.diversifi.MsgFetchBalance",
      value: MsgFetchBalance.fromPartial(data),
    }),
  };
};

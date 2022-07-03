import {
  ChainId,
  CHAIN_ID_SOLANA,
  CHAIN_ID_TERRA,
  isEVMChain,
} from "@certusone/wormhole-sdk";
import EthereumSignerKey from "./EthereumSignerKey";
import SolanaWalletKey from "./SolanaWalletKey";
import HumanWalletKey from "./HumanWalletKey";

function KeyAndBalance({ chainId }: { chainId: ChainId }) {
  if (isEVMChain(chainId)) {
    return (
      <>
        <EthereumSignerKey />
      </>
    );
  }
  if (chainId === CHAIN_ID_SOLANA) {
    return (
      <>
        <SolanaWalletKey />
      </>
    );
  }
  if (chainId === CHAIN_ID_TERRA) {
    return (
      <>
        <HumanWalletKey />
      </>
    );
  }
  return null;
}

export default KeyAndBalance;

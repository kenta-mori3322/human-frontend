import {
  ChainId,
  CHAIN_ID_SOLANA,
  CHAIN_ID_TERRA,
  getEmitterAddressTerra,
  isEVMChain,
  parseSequenceFromLogTerra,
} from "@certusone/wormhole-sdk";
import { SigningCosmosClient } from "@cosmjs/launchpad";
import { Alert } from "@material-ui/lab";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  Transaction,
  PublicKey,
} from "@solana/web3.js";

import { Signer, ethers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { useSnackbar } from "notistack";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useEthereumProvider } from "../contexts/EthereumProviderContext";
import { useSolanaWallet } from "../contexts/SolanaWalletContext";
import {
  selectTerraFeeDenom,
  selectTransferAmount,
  selectTransferIsSendComplete,
  selectTransferIsSending,
  selectTransferIsTargetComplete,
  selectTransferOriginAsset,
  selectTransferOriginChain,
  selectTransferRelayerFee,
  selectTransferSourceAsset,
  selectTransferSourceChain,
  selectTransferSourceParsedTokenAccount,
  selectTransferTargetChain,
} from "../store/selectors";
import { setIsSending, setTransferTx } from "../store/transferSlice";
import { TERRA_TOKEN_BRIDGE_ADDRESS } from "../utils/consts";

import parseError from "../utils/parseError";
import { postWithFees, waitForTerraExecution } from "../utils/terra";
import useTransferTargetAddressHex from "./useTransferTargetAddress";
import erc20ABI from "../humans/ethereum/erc20ABI.json";
import { StandardToken } from "../humans/ethereum/erc20Token";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CalcFee } from "../humans/common"
import { useHumanProvider } from "../contexts/HumanProviderContext";

async function evm(
  dispatch: any,
  enqueueSnackbar: any,
  signer: Signer,
  tokenAddress: string,
  decimals: number,
  amount: string,
  serviceFee: number,
): Promise<boolean> {
  const { ethereum } = window as any;
  const provider = new ethers.providers.Web3Provider(ethereum);

  if (provider !== undefined) {
    const contract = new ethers.Contract(
      tokenAddress,
      erc20ABI.abi,
      signer
    ) as StandardToken;

    dispatch(setIsSending(true));

    try {
      //-----------------------------------
      // Step 1, Transfer Token from user wallet to ethereum pool
      //-----------------------------------
      const baseAmountParsed = parseUnits(amount, decimals);

      // Ethereum Pool Address
      const toAddress = process.env.REACT_APP_ETHEREUM_POOL_ADDRESS as string;

      const transaction = await contract.transfer(toAddress, baseAmountParsed);
      // Wait for the transaction to be mined...
      const transaction_info = await transaction.wait();
      console.log(`[Success] Transaction Hash: ${transaction_info.blockHash}`);

      dispatch(
        setTransferTx({
          id: transaction_info.transactionHash,
          block: transaction_info.blockNumber,
        })
      );
      enqueueSnackbar(null, {
        content: <Alert severity="success">Transaction confirmed</Alert>,
      });
      //-----------------------------------
      // Step 2, Check diversifi if the transaction is actually made
      //-----------------------------------

      //-----------------------------------
      // Step 3, Transfer the same amount of USDC on Targeted Chain to the user wallet
      //-----------------------------------

      // enqueueSnackbar(null, {
      //   content: <Alert severity="info">Fetching VAA</Alert>,
      // });

      // enqueueSnackbar(null, {
      //   content: <Alert severity="success">Fetched Signed VAA</Alert>,
      // });
      return true;
    } catch (e) {
      console.error(e);
      enqueueSnackbar(null, {
        content: <Alert severity="error">{parseError(e)}</Alert>,
      });

      return false;
    }
  } else {
    enqueueSnackbar(null, {
      content: <Alert severity="error">No provider!</Alert>,
    });

    return false;
  }
}

async function terra(
  dispatch: any,
  enqueueSnackbar: any,
  walletAddress: string,
  wallet: any,
  amt: string,
  targetChain: ChainId,
  targetAddress: Uint8Array,
  feeDenom: string,
  relayerFee?: string
): Promise<boolean> {
  dispatch(setIsSending(true));
  try {

    let amount = parseFloat(amt);
    if (isNaN(amount)) {
        alert("Invalid amount");
        return false;
    }

    amount *= 1e9;
    amount = Math.floor(amount);

    // Initialize the gaia api with the offline signer that is injected by Keplr extension.
    const cosmJS = new SigningCosmosClient(
      process.env.REACT_APP_Humans_Node_Provider1_Query as string,
      walletAddress,
      wallet
    );

    const result = await cosmJS.sendTokens(process.env.REACT_APP_HUMAN_POOL_ADDRESS as string, [{
        denom: "uheart",
        amount: amount.toString(),
    }]);

    dispatch(setTransferTx({ id: result.transactionHash, block: -1 }));
    enqueueSnackbar(null, {
      content: <Alert severity="success">Transaction confirmed</Alert>,
    });

    return true;
  } catch (e) {
    console.error(e);
    enqueueSnackbar(null, {
      content: <Alert severity="error">{parseError(e)}</Alert>,
    });
    dispatch(setIsSending(false));

    return false;
  }
}

export function useHandleTransfer() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const sourceChain = useSelector(selectTransferSourceChain);
  const sourceAsset = useSelector(selectTransferSourceAsset);
  const originChain = useSelector(selectTransferOriginChain);
  const originAsset = useSelector(selectTransferOriginAsset);
  const amount = useSelector(selectTransferAmount);
  const targetChain = useSelector(selectTransferTargetChain);
  const targetAddress = useTransferTargetAddressHex();
  const isTargetComplete = useSelector(selectTransferIsTargetComplete);
  const isSending = useSelector(selectTransferIsSending);
  const isSendComplete = useSelector(selectTransferIsSendComplete);
  const { signer } = useEthereumProvider();
  const solanaWallet = useSolanaWallet();
  const solPK = solanaWallet?.publicKey;
  const {humanAddress, humanSignerClient} = useHumanProvider();
  const terraFeeDenom = useSelector(selectTerraFeeDenom);
  const sourceParsedTokenAccount = useSelector(
    selectTransferSourceParsedTokenAccount
  );
  const relayerFee = useSelector(selectTransferRelayerFee);
  const sourceTokenPublicKey = sourceParsedTokenAccount?.publicKey;
  const decimals = sourceParsedTokenAccount?.decimals;
  const isNative = sourceParsedTokenAccount?.isNativeAsset || false;
  const disabled = !isTargetComplete || isSending || isSendComplete;

  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const serviceFee = CalcFee();

  const processApprove = async () => {
    const bytes: Uint8Array = new Uint8Array();
    enqueueSnackbar(null, {
      content: <Alert severity="success">Humanchain is working to complete transfer. Please wait for a few seconds...</Alert>,
    });

    dispatch(setIsSending(false));
  };

  const handleTransferClick = useCallback(async () => {
    // TODO: we should separate state for transaction vs fetching vaa
    let walletTransferred = false;
    if (
      isEVMChain(sourceChain) &&
      !!signer &&
      !!sourceAsset &&
      decimals !== undefined &&
      !!targetAddress
    ) {
      walletTransferred = await evm(
        dispatch,
        enqueueSnackbar,
        signer,
        sourceAsset,
        decimals,
        amount,
        serviceFee,
      );
    } else if (
      sourceChain === CHAIN_ID_TERRA &&
      !!humanSignerClient &&
      !!targetAddress
    ) {
      walletTransferred = await terra(
        dispatch,
        enqueueSnackbar,
        humanAddress as string,
        humanSignerClient,
        amount,
        targetChain,
        targetAddress,
        terraFeeDenom,
        relayerFee
      );
    } else {
    }

    // If the token transfer fails or user cancells transfer
    if (!walletTransferred) {
      dispatch(setIsSending(false));
      return;
    }

    // Process
    setTimeout(() => {
      processApprove();
    }, 500);
  }, [
    dispatch,
    enqueueSnackbar,
    sourceChain,
    signer,
    relayerFee,
    solanaWallet,
    solPK,
    humanSignerClient,
    sourceTokenPublicKey,
    sourceAsset,
    amount,
    decimals,
    targetChain,
    targetAddress,
    originAsset,
    originChain,
    isNative,
    terraFeeDenom,
  ]);
  return useMemo(
    () => ({
      handleClick: handleTransferClick,
      disabled,
      showLoader: isSending,
    }),
    [handleTransferClick, disabled, isSending]
  );
}

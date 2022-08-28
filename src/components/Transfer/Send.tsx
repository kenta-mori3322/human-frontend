import {
  isEVMChain,
} from "@certusone/wormhole-sdk";
import { Checkbox, FormControlLabel } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { ethers } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import useAllowance from "../../hooks/useAllowance";
import { useHandleTransfer } from "../../hooks/useHandleTransfer";
import useIsWalletReady from "../../hooks/useIsWalletReady";
import SendConfirmationDialog from "./SendConfirmationDialog";
import {
  selectSourceWalletAddress,
  selectTransferAmount,
  selectTransferIsSendComplete,
  selectTransferRelayerFee,
  selectTransferSourceAsset,
  selectTransferSourceChain,
  selectTransferSourceParsedTokenAccount,
  selectTransferTargetError,
  selectTransferTransferTx,
  selectTransferTargetAddressHex,
} from "../../store/selectors";
import ButtonWithLoader from "../ButtonWithLoader";
import KeyAndBalance from "../KeyAndBalance";
import ShowTx from "../ShowTx";
import StepDescription from "../StepDescription";
import WaitingForWalletMessage from "./WaitingForWalletMessage";
import useRequestTransaction from "../../humans/useRequestTransaction"
import useSendToken from "../../humans/useSendToken"
import { useSnackbar } from "notistack";
// import usePoolBalance from "../../diversifi/usePoolBalance"


function Send() {
  const { handleClick, disabled, showLoader } = useHandleTransfer();
  const {handleSendToken, txInrequest, txResult} = useSendToken();
  const { handleTransaction, txRequesting, transactionResult } = useRequestTransaction();
  const [ transferFinished, setTransferFinished] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleConfirmClick = useCallback(async() => {
    // solanaBalance, ethereumBalance
    if (!sourceWalletAddress || !targetAddressHex) {
        // Show notification
        enqueueSnackbar(null, {
          content: <Alert severity="error">Sorry! Addresses were not set properly. Please retry setting addresses.</Alert>,
        });

        return
    }

    //
    setIsConfirmOpen(false);
    
    //------------------------------
    await handleTransaction();

    // if there occurs an error
    if (transactionResult.includes("failed to execute")) {
      setTxRequestError("Targeted pool doens't have enough balance in it.")

      // Show notification
      enqueueSnackbar(null, {
        content: <Alert severity="error">Targeted pool doens't have enough balance in it.</Alert>,
      });

      return
    }
    
    enqueueSnackbar(null, {
      content: <Alert severity="success">Transaction request was approved by Human</Alert>,
    });
    //------------------------------

    // Process transfer token through wallet
    if (sourceChain == 3) // Human
      await handleSendToken();
    else
      await handleClick();
      
    setTransferFinished(true)
  }, [handleClick, handleTransaction]);

  const sourceChain = useSelector(selectTransferSourceChain);
  const sourceAsset = useSelector(selectTransferSourceAsset);
  const sourceAmount = useSelector(selectTransferAmount);

  const sourceParsedTokenAccount = useSelector(
    selectTransferSourceParsedTokenAccount
  );
  const relayerFee = useSelector(selectTransferRelayerFee);
  const sourceDecimals = sourceParsedTokenAccount?.decimals;
  const sourceIsNative = sourceParsedTokenAccount?.isNativeAsset;
 
  const baseAmountParsed =
    sourceDecimals !== undefined &&
    sourceDecimals !== null &&
    sourceAmount &&
    parseUnits(sourceAmount, sourceDecimals);
  const feeParsed =
    sourceDecimals !== undefined
      ? parseUnits(relayerFee || "0", sourceDecimals)
      : 0;

  const transferAmountParsed = baseAmountParsed && baseAmountParsed.toBigInt();
  const humanReadableTransferAmount =
    sourceDecimals !== undefined &&
    sourceDecimals !== null &&
    transferAmountParsed &&
    formatUnits(transferAmountParsed, sourceDecimals);
  const oneParsed =
    sourceDecimals !== undefined &&
    sourceDecimals !== null &&
    parseUnits("1", sourceDecimals).toBigInt();
  const transferTx = useSelector(selectTransferTransferTx);
  const isSendComplete = useSelector(selectTransferIsSendComplete);

  const error = useSelector(selectTransferTargetError);
  const [allowanceError, setAllowanceError] = useState("");
  const { isReady, statusMessage, walletAddress } =
    useIsWalletReady(sourceChain);
  const sourceWalletAddress = useSelector(selectSourceWalletAddress);
  //The chain ID compare is handled implicitly, as the isWalletReady hook should report !isReady if the wallet is on the wrong chain.
  const isWrongWallet =
    sourceWalletAddress &&
    walletAddress &&
    sourceWalletAddress !== walletAddress;
  const [shouldApproveUnlimited, setShouldApproveUnlimited] = useState(false);
  const toggleShouldApproveUnlimited = useCallback(
    () => setShouldApproveUnlimited(!shouldApproveUnlimited),
    [shouldApproveUnlimited]
  );

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const handleTransferClick = useCallback(() => {
    setIsConfirmOpen(true);
  }, []);
  const handleConfirmClose = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const targetAddressHex = useSelector(selectTransferTargetAddressHex);
  // const {
  //   solanaBalance, ethereumBalance
  // } = usePoolBalance();

  const {
    sufficientAllowance,
    isAllowanceFetching,
    isApproveProcessing,
    approveAmount,
  } = useAllowance(
    sourceChain,
    sourceAsset,
    transferAmountParsed || undefined,
    sourceIsNative
  );

  const approveButtonNeeded = isEVMChain(sourceChain) && !sufficientAllowance;
  const notOne = shouldApproveUnlimited || transferAmountParsed !== oneParsed;
  const isDisabled =
    !isReady ||
    isWrongWallet ||
    isAllowanceFetching ||
    isApproveProcessing;

  const [txRequestError, setTxRequestError] = useState("");

  const errorMessage = isWrongWallet
    ? "A different wallet is connected than in Step 1."
    : statusMessage || error || allowanceError || txRequestError || undefined;

  const approveExactAmount = useMemo(() => {
    return () => {
      setAllowanceError("");
      approveAmount(BigInt(transferAmountParsed)).then(
        () => {
          setAllowanceError("");
        },
        (error) => setAllowanceError("Failed to approve the token transfer.")
      );
    };
  }, [approveAmount, transferAmountParsed]);
  const approveUnlimited = useMemo(() => {
    return () => {
      setAllowanceError("");
      approveAmount(ethers.constants.MaxUint256.toBigInt()).then(
        () => {
          setAllowanceError("");
        },
        (error) => setAllowanceError("Failed to approve the token transfer.")
      );
    };
  }, [approveAmount]);

  return (
    <>
      <StepDescription>
        Transfer the tokens through Human Pool.
      </StepDescription>
      <KeyAndBalance chainId={sourceChain} />
      {approveButtonNeeded ? (
        <>
          <FormControlLabel
            control={
              <Checkbox
                checked={shouldApproveUnlimited}
                onChange={toggleShouldApproveUnlimited}
                color="primary"
              />
            }
            label="Approve Unlimited Tokens"
          />
          <ButtonWithLoader
            disabled={isDisabled}
            onClick={
              shouldApproveUnlimited ? approveUnlimited : approveExactAmount
            }
            showLoader={isAllowanceFetching || isApproveProcessing}
            error={errorMessage}
          >
            {"Approve " +
              (shouldApproveUnlimited
                ? "Unlimited"
                : humanReadableTransferAmount
                ? humanReadableTransferAmount
                : sourceAmount) +
              ` Token${notOne ? "s" : ""}`}
          </ButtonWithLoader>
        </>
      ) : (
        <>
          <ButtonWithLoader
            disabled={isDisabled}
            onClick={handleTransferClick}
            showLoader={showLoader || txRequesting || txInrequest}
            error={errorMessage}
          >
            Transfer
          </ButtonWithLoader>

          <SendConfirmationDialog
            open={isConfirmOpen}
            onClick={handleConfirmClick}
            onClose={handleConfirmClose}
          />
        </>
      )}
      <WaitingForWalletMessage />
      {transferTx ? <ShowTx chainId={sourceChain} tx={transferTx} /> : null}
      {/* <TransactionProgress
        chainId={sourceChain}
        tx={transferTx}
        isSendComplete={isSendComplete}
      /> */}
    </>
  );
}

export default Send;

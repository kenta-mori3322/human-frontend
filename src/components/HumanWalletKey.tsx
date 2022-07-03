import { useCallback, useState } from "react";
import ToggleConnectedButton from "./ToggleConnectedButton";
import useHumanchainConnection from "../hooks/useHumanchainConnection";

const HumanWalletKey = () => {
  // const wallet = useWallet();
  // const connectedWallet = useConnectedWallet();
  const { walletAddress, handleKeplrConnect, handleKeplrDisConnect} = useHumanchainConnection();

  return (
    <>
      <ToggleConnectedButton
        connect={handleKeplrConnect}
        disconnect={handleKeplrDisConnect}
        connected={!!walletAddress}
        pk={walletAddress || ""}
      />
    </>
  );
};

export default HumanWalletKey;

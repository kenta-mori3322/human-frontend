import ToggleConnectedButton from "./ToggleConnectedButton";
import { useHumanProvider } from "../contexts/HumanProviderContext";

const HumanWalletKey = () => {
  const { connect, disconnect, humanAddress } =
  useHumanProvider();

  return (
    <>
      <ToggleConnectedButton
        connect={connect}
        disconnect={disconnect}
        connected={!!humanAddress}
        pk={humanAddress || ""}
      />
    </>
  );
};

export default HumanWalletKey;

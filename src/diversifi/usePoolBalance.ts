import { useEffect, useMemo, useState } from "react";

export default function usePoolBalance() {
  const [ethereumBalance, setEthereumBalance] = useState("");
  const [humanBalance, setHumanBalance] = useState("");

  let interval: any;

  // const Diversifi_Node1 = "18.234.18.234"
  const Diversifi_Node1 = process.env.REACT_APP_Diversifi_Node_Provider1_Query;

  const fetchBalance = async () => {
    fetch(
      "http://" +
        Diversifi_Node1 +
        "/VigorousDeveloper/poc-human/pochuman/pool_balance",
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setEthereumBalance("" + parseFloat(data.poolBalance[0].balance));
        setHumanBalance("" + parseFloat(data.poolBalance[1].balance));
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    fetchBalance();
    if (interval != undefined) {
      clearInterval(interval);
    }
    interval = setInterval(() => {
      fetchBalance();
    }, 2500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return useMemo(
    () => ({
      ethereumBalance,
      humanBalance,
    }),
    [humanBalance, ethereumBalance]
  );
}

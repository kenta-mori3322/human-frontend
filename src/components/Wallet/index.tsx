import { Typography } from "@material-ui/core";
import {
  Container,
  Step,
  StepButton,
  StepContent,
  Stepper,
} from "@material-ui/core";
import useAccountBalance from "../../diversifi/useAccountBalance"

function Wallet() {
  const { balance, walletAddress } = useAccountBalance();

  return (
    <Container maxWidth="md">
      <Stepper activeStep={0} orientation="vertical">
        <Step
          expanded={true}
        >
          <StepButton icon={null}>

            Kima Account
          </StepButton>
          <StepContent>
            <Typography style={{ fontSize: "18px", marginLeft: "20px" }} variant="caption">Address: {walletAddress}</Typography>
            <Typography style={{ fontSize: "18px", marginLeft: "20px" }} variant="caption">Balance: {balance}</Typography>
          </StepContent>
        </Step>
      </Stepper>
    </Container>
  );
}

export default Wallet;

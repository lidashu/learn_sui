import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { WalletStatus } from "./components/WalletStatus";

function App() {
  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Heading><WalletStatus /></Heading>
        </Box>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      
    </>
  );
}

export default App;

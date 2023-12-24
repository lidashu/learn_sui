import { useCurrentAccount } from "@mysten/dapp-kit";
import { Container, Flex, Text } from "@radix-ui/themes";

export function WalletStatus() {
  const account = useCurrentAccount();

  return (
    <Container my="2">
      {account ? (
        <Flex direction="column">
          <Text>connected: {account.address.substring(0, 5) + "..." + account.address.substring(account.address.length-5)}</Text>
        </Flex>
      ) : (
        <Text></Text>
      )}
    </Container>
  );
}

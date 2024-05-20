import { CirclesData } from '@circles-sdk/data';
import { Rpc } from '@circles-sdk/data';

// Run on chiado
// - V1_HUB_ADDRESS=0xdbf22d4e8962db3b2f1d9ff55be728a887e47710
// - V2_HUB_ADDRESS=0xFFfbD3E62203B888bb8E09c1fcAcE58242674964
// - V2_NAME_REGISTRY_ADDRESS=0x0A1D308a39A6dF8972A972E586E4b4b3Dc73520f
const circlesRpc = `http://localhost:8545`;
const rpc = new Rpc(circlesRpc);

describe('CirclesData', () => {
  it('should get the total V1 CRC balance of an address as Time Circles', async () => {
    const circlesData = new CirclesData(rpc);

    const totalBalance = await circlesData.getTotalBalance('0xc313FE6C294A7aE1818d0e537D7Ca5Ab0ef07F63');
    expect(totalBalance).toBeDefined();
    // expect a decimal number
    expect(totalBalance).toMatch(/^\d+\.\d+$/);

    console.log(totalBalance.toString());
  });

  it('should get the total V1 CRC balance of an address as CRC', async () => {
    const circlesData = new CirclesData(rpc);

    const totalBalance = await circlesData.getTotalBalance('0xc313FE6C294A7aE1818d0e537D7Ca5Ab0ef07F63', false);
    expect(totalBalance).toBeDefined();
    // expect an integer
    expect(totalBalance).toMatch(/^\d+$/);

    console.log(totalBalance.toString());
  });

  it('should get the detailed V1 token balances of an address as Time Circles', async () => {
    const circlesData = new CirclesData(rpc);

    const tokenBalanceRows = await circlesData.getTokenBalances('0xc313FE6C294A7aE1818d0e537D7Ca5Ab0ef07F63');
    expect(tokenBalanceRows).toBeDefined();
    // expect a decimal number (or '0')
    expect(tokenBalanceRows[0].balance).toMatch(/^\d+(\.\d+)?$/);

    console.log(JSON.stringify(tokenBalanceRows, null, 2));
  });

  it('should get the detailed V1 token balances of an address as CRC', async () => {
    const circlesData = new CirclesData(rpc);

    const tokenBalanceRows = await circlesData.getTokenBalances('0xc313FE6C294A7aE1818d0e537D7Ca5Ab0ef07F63', false);
    expect(tokenBalanceRows).toBeDefined();
    // expect an integer
    expect(tokenBalanceRows[0].balance).toMatch(/^\d+$/);

    console.log(JSON.stringify(tokenBalanceRows, null, 2));
  });

  it('should get the total V2 CRC balance of an address as Time Circles', async () => {
    const circlesData = new CirclesData(rpc);

    const totalBalance = await circlesData.getTotalBalanceV2('0xae3a29a9ff24d0e936a5579bae5c4179c4dff565');
    expect(totalBalance).toBeDefined();
    // expect a decimal number (or '0')
    expect(totalBalance).toMatch(/^\d+(\.\d+)?$/);

    console.log(totalBalance.toString());
  });

  it('should get the total V2 CRC balance of an address as CRC', async () => {
    const circlesData = new CirclesData(rpc);

    const totalBalance = await circlesData.getTotalBalanceV2('0xAE3a29a9Ff24d0E936A5579bAe5C4179C4dff565', false);
    expect(totalBalance).toBeDefined();
    // expect an integer
    expect(totalBalance).toMatch(/^\d+$/);

    console.log(totalBalance.toString());
  });

  it('should get the detailed V2 token balances of an address as Time Circles', async () => {
    const circlesData = new CirclesData(rpc);

    const tokenBalanceRows = await circlesData.getTokenBalancesV2('0xae3a29a9ff24d0e936a5579bae5c4179c4dff565');
    expect(tokenBalanceRows).toBeDefined();
    // expect a decimal number (or '0')
    expect(tokenBalanceRows[0].balance).toMatch(/^\d+(\.\d+)?$/);

    console.log(JSON.stringify(tokenBalanceRows, null, 2));
  });

  it('should get the detailed V2 token balances of an address as CRC', async () => {
    const circlesData = new CirclesData(rpc);

    const tokenBalanceRows = await circlesData.getTokenBalancesV2('0xae3a29a9ff24d0e936a5579bae5c4179c4dff565', false);
    expect(tokenBalanceRows).toBeDefined();
    // expect an integer
    expect(tokenBalanceRows[0].balance).toMatch(/^\d+$/);

    console.log(JSON.stringify(tokenBalanceRows, null, 2));
  });

  it('should get the transaction history of an address', async () => {
    const circlesData = new CirclesData(rpc);

    const transactionHistoryQuery = circlesData.getTransactionHistory('0xc5d6c75087780e0c18820883cf5a580bb3a4d834', 10);
    expect(transactionHistoryQuery).toBeDefined();

    const hasRows = await transactionHistoryQuery.queryNextPage();
    expect(hasRows).toBe(true);

    console.log(JSON.stringify(transactionHistoryQuery.currentPage?.results, null, 2));
  });

  it('should get the current trust relations of an address', async () => {
    const circlesData = new CirclesData(rpc);

    const trustRelationsQuery = circlesData.getTrustRelations('0xc5d6c75087780e0c18820883cf5a580bb3a4d834', 10);
    expect(trustRelationsQuery).toBeDefined();

    const hasRows = await trustRelationsQuery.queryNextPage();
    expect(hasRows).toBe(true);

    console.log(JSON.stringify(trustRelationsQuery.currentPage?.results, null, 2));
  });
});
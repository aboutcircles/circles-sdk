import { CirclesQuery } from '@circles-sdk/data';
import { TransactionHistoryRow } from '@circles-sdk/data';
import { TrustListRow } from '@circles-sdk/data/dist/rows/trustListRow';
import { CirclesRpc } from '@circles-sdk/data';

// Run on chiado
// - V1_HUB_ADDRESS=0xdbf22d4e8962db3b2f1d9ff55be728a887e47710
// - V2_HUB_ADDRESS=0xFFfbD3E62203B888bb8E09c1fcAcE58242674964
// - V2_NAME_REGISTRY_ADDRESS=0x0A1D308a39A6dF8972A972E586E4b4b3Dc73520f
const circlesRpc = `http://localhost:8545`;
const rpc = new CirclesRpc(circlesRpc);

describe('CirclesQuery', () => {
  it('should return a paged result for wallet transactions', async () => {
    const pagedQuery = new CirclesQuery<TransactionHistoryRow>(rpc, {
      namespace: 'V_Crc',
      table: 'Transfers',
      sortOrder: 'DESC',
      limit: 10,
      columns: [],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'And',
          Predicates: [
            {
              Type: 'FilterPredicate',
              FilterType: 'LessThanOrEquals',
              Column: 'blockNumber',
              Value: 7075793
            },
            {
              Type: 'Conjunction',
              ConjunctionType: 'Or',
              Predicates: [
                {
                  Type: 'FilterPredicate',
                  FilterType: 'Equals',
                  Column: 'from',
                  Value: '0xc5d6c75087780e0c18820883cf5a580bb3a4d834'
                },
                {
                  Type: 'FilterPredicate',
                  FilterType: 'Equals',
                  Column: 'to',
                  Value: '0xc5d6c75087780e0c18820883cf5a580bb3a4d834'
                }
              ]
            }
          ]
        }
      ]
    });

    const requestYieldedData = await pagedQuery.queryNextPage();
    expect(requestYieldedData).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(10);
    expect(pagedQuery.currentPage?.firstCursor).toBeDefined();
    expect(pagedQuery.currentPage?.lastCursor).toBeDefined();
    expect(pagedQuery.currentPage?.sortOrder).toBe('DESC');
    expect(pagedQuery.currentPage?.size).toBe(10);
    expect(pagedQuery.currentPage?.limit).toBe(10);

    const page1 = pagedQuery.currentPage.results;
    console.log('page1', page1);

    const requestYieldedData2 = await pagedQuery.queryNextPage();
    expect(requestYieldedData2).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(10);
    expect(pagedQuery.currentPage?.firstCursor).toBeDefined();
    expect(pagedQuery.currentPage?.lastCursor).toBeDefined();
    expect(pagedQuery.currentPage?.sortOrder).toBe('DESC');
    expect(pagedQuery.currentPage?.size).toBe(10);
    expect(pagedQuery.currentPage?.limit).toBe(10);

    const page2 = pagedQuery.currentPage.results;
    console.log('page2', page2);

    const requestYieldedData3 = await pagedQuery.queryNextPage();
    expect(requestYieldedData3).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(10);

    const page3 = pagedQuery.currentPage.results;
    console.log('page3', page3);

    const requestYieldedData4 = await pagedQuery.queryNextPage();
    expect(requestYieldedData4).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(3);

    const page4 = pagedQuery.currentPage.results;
    console.log('page4', page4);

    const requestYieldedData5 = await pagedQuery.queryNextPage();
    expect(requestYieldedData5).toBe(false);
  });

  it('should return a paged result for v1 trust relations', async () => {
    const pagedQuery = new CirclesQuery<TrustListRow>(rpc, {
      namespace: 'V_CrcV1',
      table: 'TrustRelations',
      sortOrder: 'DESC',
      limit: 1,
      columns: []
    });

    const requestYieldedData = await pagedQuery.queryNextPage();
    expect(requestYieldedData).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(1);
    expect(pagedQuery.currentPage?.firstCursor).toBeDefined();
    expect(pagedQuery.currentPage?.lastCursor).toBeDefined();
    expect(pagedQuery.currentPage?.sortOrder).toBe('DESC');
    expect(pagedQuery.currentPage?.size).toBe(1);
    expect(pagedQuery.currentPage?.limit).toBe(1);

    const page1 = pagedQuery.currentPage.results;
    console.log('page1', page1);

    const requestYieldedData2 = await pagedQuery.queryNextPage();
    expect(requestYieldedData2).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(1);
    expect(pagedQuery.currentPage?.firstCursor).toBeDefined();
    expect(pagedQuery.currentPage?.lastCursor).toBeDefined();
    expect(pagedQuery.currentPage?.sortOrder).toBe('DESC');
    expect(pagedQuery.currentPage?.size).toBe(1);
    expect(pagedQuery.currentPage?.limit).toBe(1);

    const page2 = pagedQuery.currentPage.results;
    console.log('page2', page2);

    expect(page1[0]).not.toEqual(page2[0]);
    expect(page1[0].blockNumber).toBeGreaterThan(page2[0].blockNumber);
  });

  it('paged queries should support filtering', async () => {
    const pagedQuery = new CirclesQuery<any>(rpc, {
      namespace: 'V_CrcV1',
      table: 'TrustRelations',
      sortOrder: 'DESC',
      limit: 1,
      columns: [],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'And',
          Predicates: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'user',
              Value: '0xa318d01a47e200a89691484164ede4504e270cd7'
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'LessThanOrEquals',
              Column: 'blockNumber',
              Value: 9777990
            }
          ]
        }
      ]
    });

    const requestYieldedData = await pagedQuery.queryNextPage();
    expect(requestYieldedData).toBe(true);

    expect(pagedQuery.currentPage).toBeDefined();
    expect(pagedQuery.currentPage?.results).toBeDefined();
    expect(pagedQuery.currentPage?.results.length).toBe(1);
    expect(pagedQuery.currentPage?.firstCursor).toBeDefined();
    expect(pagedQuery.currentPage?.lastCursor).toBeDefined();
    expect(pagedQuery.currentPage?.sortOrder).toBe('DESC');
    expect(pagedQuery.currentPage?.size).toBe(1);
    expect(pagedQuery.currentPage?.limit).toBe(1);

    const page1 = pagedQuery.currentPage.results;
    console.log('page1', page1);

    // Make sure the results contain only data that matches the filter:
    page1.forEach(result => {
      expect(result.user).toBe('0xa318d01a47e200a89691484164ede4504e270cd7');
      expect(result.blockNumber).toBeLessThanOrEqual(9777990);
    });

    const requestYieldedData2 = await pagedQuery.queryNextPage();
    expect(requestYieldedData2).toBe(true);

    const page2 = pagedQuery.currentPage.results;
    console.log('page2', page2);

    page2.forEach(result => {
      expect(result.user).toBe('0xa318d01a47e200a89691484164ede4504e270cd7');
      expect(result.blockNumber).toBeLessThanOrEqual(9777990);
    });

    const requestYieldedData3 = await pagedQuery.queryNextPage();
    expect(requestYieldedData3).toBe(false);
  });
});

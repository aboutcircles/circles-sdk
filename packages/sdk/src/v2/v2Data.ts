import { ethers } from 'ethers';
/*
  ### circles_query

  This method allows you to query Circles events. The method takes a single parameter, which is a JSON object with the
  following properties:

  * `namespace` - The protocol namespace to query (System, CrcV1 or CrcV2).
  * `table` - The table to query (e.g. `Signup`, `Trust`, etc.).
  * `columns` - An array of column names to return or `[]` to return all columns of the table.
  * `filter` - Filters that can be used e.g. for pagination or to search for specific values.
  * `order` - A list of columns to order the results by.
  * `distinct` - If set to `true`, only distinct rows are returned.
  * `limit` - The maximum number of rows to return (defaults to max. 1000).

  *There is no default order, so make sure to always add sensible order columns.*

  #### Available namespaces, tables and columns

  Every table has at least the following columns:

  * `blockNumber` - The block number the event was emitted in.
  * `timestamp` - The unix timestamp of the event.
  * `transactionIndex` - The index of the transaction in the block.
  * `logIndex` - The index of the log in the transaction.

  Tables for batch events have an additional `batchIndex` column.
  The items of a batch are treated like individual events that can only be distinguished by the `batchIndex`.

  Namespaces and tables:

  * `System`
      * `Block`
  * `CrcV1`
      * `HubTransfer`
      * `OrganizationSignup`
      * `Signup`
      * `Transfer`
      * `Trust`
  * `CrcV2`
      * `ApprovalForAll`
      * `DiscountCost`
      * `InviteHuman`
      * `PersonalMint`
      * `RegisterGroup`
      * `RegisterHuman`
      * `RegisterOrganization`
      * `RegisterShortName`
      * `Stopped`
      * `TransferBatch`
      * `TransferSingle`
      * `Trust`
      * `UpdateMetadataDigest`
      * `URI`

  #### Available filter types

  * `Equals`
  * `NotEquals`
  * `GreaterThan`
  * `GreaterThanOrEquals`
  * `LessThan`
  * `LessThanOrEquals`
  * `Like`
  * `NotLike`
  * `In`
  * `NotIn`

  #### Pagination

  You can use the combination of `blockNumber`, `transactionIndex` and `logIndex`
  (+ `batchIndex` in the case of batch events) together with a `limit` to paginate through the results.

  #### Example

  Query the last two Circles signups:

  ```shell
  curl -X POST --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "circles_query",
    "params": [
      {
        "Namespace": "CrcV1",
        "Table": "Signup",
        "Limit": 2,
        "Columns": [],
        "Filter": [],
        "Order": [
          {
            "Column": "blockNumber",
            "SortOrder": "ASC"
          },
          {
            "Column": "transactionIndex",
            "SortOrder": "ASC"
          },
          {
            "Column": "logIndex",
            "SortOrder": "ASC"
          }
        ]
      }
    ]
  }' -H "Content-Type: application/json" https://localhost:8545/
  ```

  ##### Response:

  ```json
  {
    "jsonrpc": "2.0",
    "result": {
      "columns": [
        "blockNumber",
        "timestamp",
        "transactionIndex",
        "logIndex",
        "transactionHash",
        "user",
        "token"
      ],
      "rows": [
        [
          "0x597343",
          "0x64f5aa5a",
          "0x0",
          "0x3",
          "0xb41462160f73af912b550b27a7ed31e091d5da6c59a6325b367048ea42eef47f",
          "0x4bc38a9f15508d19299a45b063556ec4bee853ff",
          "0xcc724001786fcf8414747dd598e8e9383882b6d7"
        ],
        [
          "0x597343",
          "0x64f5aa5a",
          "0x0",
          "0x3",
          "0xb41462160f73af912b550b27a7ed31e091d5da6c59a6325b367048ea42eef47f",
          "0x4bc38a9f15508d19299a45b063556ec4bee853ff",
          "0xcc724001786fcf8414747dd598e8e9383882b6d7"
        ]
      ]
    },
    "id": 1
  }
  ```
 */
export class V2Data {
  constructor(public readonly circlesRpcUrl: string) {
  }

  /**
   * Find all incoming and outgoing trust relations of a user
   * @param user The user's address
   */
  public async findTrustRelations(user: string): Promise<string[]> {
    // Select all distinct trust events
    return [];
  }
}
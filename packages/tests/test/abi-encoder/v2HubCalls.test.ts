import { ethers, keccak256 } from 'ethers';
import { V2HubCalls as V2HubCallsEncoder } from '@circles-sdk/abi-v2';
import {
  V2HubInputTypes,
  V2HubDecoders as V2HubCallsDecoder
} from '@circles-sdk/abi-v2';
import HubV2 from '@circles/circles-contracts-v2/out/Hub.sol/Hub.json';
import { HashCode, HashName } from 'multihashes';
import {
  addressToUint,
  decodeMultihash,
  encodeMultihash,
  generateRandomAddress, generateRandomData,
  uintToAddress
} from '../util';

describe('V2HubCalls', () => {
  const contractInterface = new ethers.Interface(HubV2.abi);

  // INDEFINITE_FUTURE
  test('INDEFINITE_FUTURE() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().INDEFINITE_FUTURE();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('INDEFINITE_FUTURE');
    expect(decoded?.args).toEqual([]);
  });

  // ISSUANCE_PER_SECOND
  test('ISSUANCE_PER_SECOND() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().ISSUANCE_PER_SECOND();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('ISSUANCE_PER_SECOND');
    expect(decoded?.args).toEqual([]);
  });

  // MINIMUM_DONATION
  test('MINIMUM_DONATION() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().MINIMUM_DONATION();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('MINIMUM_DONATION');
    expect(decoded?.args).toEqual([]);
  });

  // SENTINEL
  test('SENTINEL() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().SENTINEL();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('SENTINEL');
    expect(decoded?.args).toEqual([]);
  });

  // WELCOME_BONUS
  test('WELCOME_BONUS() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().WELCOME_BONUS();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('WELCOME_BONUS');
    expect(decoded?.args).toEqual([]);
  });

  // avatars
  test('avatars(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().avatars(<V2HubInputTypes.AvatarsInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('avatars');
    expect(decoded?.args).toEqual([address]);
  });

  test('balanceOf(_account, _id) encodes and decodes correctly', () => {
    const account = generateRandomAddress();
    const id = addressToUint(generateRandomAddress());
    const encoded = new V2HubCallsEncoder().balanceOf(<V2HubInputTypes.BalanceOfInputs>{
      _account: account,
      _id: id
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('balanceOf');

    const decodedAccount = decoded?.args[0];
    expect(decodedAccount).toEqual(account);

    const decodedId = decoded?.args[1];
    expect(id).toEqual(decodedId);
  });

  test('balanceOfBatch(_accounts, _ids) encodes and decodes correctly', () => {
    const accounts = [generateRandomAddress(), generateRandomAddress()];
    const ids = [addressToUint(generateRandomAddress()), addressToUint(generateRandomAddress())];
    const encoded = new V2HubCallsEncoder().balanceOfBatch(<V2HubInputTypes.BalanceOfBatchInputs>{
      _accounts: accounts,
      _ids: ids
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('balanceOfBatch');

    const decodedAccounts = decoded?.args[0];
    expect(decodedAccounts.map((p: string) => uintToAddress(BigInt(p)))).toEqual(accounts);

    const decodedIds = decoded?.args[1];
    expect(decodedIds).toEqual(ids);
  });

  test('burn(_id, _value) encodes and decodes correctly', () => {
    const id = addressToUint(generateRandomAddress());
    const value = ethers.parseEther('100');
    const data = generateRandomData(32);
    const encoded = new V2HubCallsEncoder().burn(<V2HubInputTypes.BurnInputs>{
      _id: id,
      _amount: value,
      _data: data
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.BurnInputs>decoded.inputs;

    expect(decoded?.name).toBe('burn');
    expect(id).toEqual(inputs._id);
    expect(value).toEqual(inputs._amount);
  });

  // test('burnBatch(_ids, _values) encodes and decodes correctly', () => {
  //   const ids = [generateRandomAddress(), generateRandomAddress()];
  //   const values = [ethers.parseEther('100'), ethers.parseEther('200')];
  //   const encoded = new V2HubCallsEncoder().burnBatch(ids, values);
  //   const decoded = new V2HubCallsDecoder().decode(encoded);
  //   const inputs = <V2HubInputTypes.BurnBatchInputs>decoded.inputs;
  //
  //   expect(decoded?.name).toBe('burnBatch');
  //   expect(inputs._ids.map((id) => uintToAddress(BigInt(id)))).toEqual(ids);
  //   expect(inputs._values.map((val) => BigInt(val))).toEqual(values);
  // });

  test('calculateIssuance(_human) encodes and decodes correctly', () => {
    const human = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().calculateIssuance(<V2HubInputTypes.CalculateIssuanceInputs>{ _human: human });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('calculateIssuance');
    expect(decoded?.args).toEqual([human]);
  });

  test('createERC20InflationWrapper(_tokenId, _name, _symbol) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const name = 'TestToken';
    const symbol = 'TT';
    const encoded = new V2HubCallsEncoder().createERC20InflationWrapper(<V2HubInputTypes.CreateERC20InflationWrapperInputs>{
      _tokenId: tokenId,
      _name: name,
      _symbol: symbol
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('createERC20InflationWrapper');

    const decodedTokenId = decoded?.args[0];
    expect(decodedTokenId).toEqual(tokenId);

    const decodedName = decoded?.args[1];
    expect(decodedName).toEqual(name);

    const decodedSymbol = decoded?.args[2];
    expect(decodedSymbol).toEqual(symbol);
  });

  // getDeterministicAddress
  test('getDeterministicAddress(_tokenId, _bytecodeHash) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const bytecodeHash = Buffer.from(keccak256('0x1234567890abcdef'), 'hex');
    const encoded = new V2HubCallsEncoder().getDeterministicAddress(<V2HubInputTypes.GetDeterministicAddressInputs>{
      _tokenId: tokenId,
      _bytecodeHash: bytecodeHash
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('getDeterministicAddress');
    expect(decoded?.args[0]).toEqual(tokenId);
    expect(decoded?.args[1]).toEqual(bytecodeHash);
  });

  test('groupMint(_group, _collateral, _amounts) encodes and decodes correctly', () => {
    const group = generateRandomAddress();
    const collateral = [generateRandomAddress(), generateRandomAddress()];
    const data = generateRandomData(32);
    const amounts = [ethers.parseEther('1000'), ethers.parseEther('2000')];
    const encoded = new V2HubCallsEncoder().groupMint(<V2HubInputTypes.GroupMintInputs>{
      _group: group,
      _collateralAvatars: collateral,
      _amounts: amounts,
      _data: data
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('groupMint');

    const decodedGroup = decoded?.args[0];
    expect(ethers.isAddress(decodedGroup)).toBe(true);
    expect(decodedGroup).toEqual(group);

    const decodedCollateral = decoded?.args[1];
    expect(decodedCollateral.map((p: string) => uintToAddress(BigInt(p)))).toEqual(collateral);

    const decodedAmounts = decoded?.args[2];
    expect(decodedAmounts.map((p: string) => BigInt(p))).toEqual(amounts);
  });

  // hubV1
  test('hubV1() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().hubV1();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('hubV1');
    expect(decoded?.args).toEqual([]);
  });

  // invitationOnlyTime
  test('invitationOnlyTime() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().invitationOnlyTime();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('invitationOnlyTime');
    expect(decoded?.args).toEqual([]);
  });

  // inviteHuman
  test('inviteHuman(_human) encodes and decodes correctly', () => {
    const human = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().inviteHuman(<V2HubInputTypes.InviteHumanInputs>{ _human: human });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.InviteHumanInputs>decoded.inputs;

    expect(decoded?.name).toBe('inviteHuman');
    expect(inputs._human).toEqual(human);
  });

  test('isApprovedForAll(account, operator) encodes and decodes correctly', () => {
    const account = generateRandomAddress();
    const operator = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().isApprovedForAll(<V2HubInputTypes.IsApprovedForAllInputs>{
      _account: account,
      _operator: operator
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('isApprovedForAll');
    expect(decoded?.args).toEqual([account, operator]);
  });

  // isGroup
  test('isGroup(_group) encodes and decodes correctly', () => {
    const group = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().isGroup(<V2HubInputTypes.IsGroupInputs>{ _group: group });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('isGroup');
    expect(decoded?.args).toEqual([group]);
  });

  test('isHuman(_human) encodes and decodes correctly', () => {
    const human = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().isHuman(<V2HubInputTypes.IsHumanInputs>{ _human: human });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('isHuman');
    expect(decoded?.args).toEqual([human]);
  });

  // isOrganization
  test('isOrganization(_organization) encodes and decodes correctly', () => {
    const organization = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().isOrganization(<V2HubInputTypes.IsOrganizationInputs>{ _organization: organization });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('isOrganization');
    expect(decoded?.args).toEqual([organization]);
  });

  test('mintPolicies(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().mintPolicies(<V2HubInputTypes.MintPoliciesInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('mintPolicies');
    expect(decoded?.args).toEqual([address]);
  });

  // mintTimes
  test('mintTimes(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().mintTimes(<V2HubInputTypes.MintTimesInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('mintTimes');
    expect(decoded?.args).toEqual([address]);
  });

  // names
  test('names(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().names(<V2HubInputTypes.NamesInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('names');
    expect(decoded?.args).toEqual([address]);
  });

  // operatorPathTransfer
  test('operatorPathTransfer() encodes and decodes correctly', () => {
    // TODO: This operation is not yet implemented in the contract
    const encoded = new V2HubCallsEncoder().operatorPathTransfer();
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.NoInputs>decoded.inputs;

    expect(decoded?.name).toBe('operatorPathTransfer');
    expect(inputs).toEqual([]);
  });

  // personalMint
  test('personalMint() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().personalMint();
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.NoInputs>decoded.inputs;

    expect(decoded?.name).toBe('personalMint');
    expect(inputs).toEqual([]);
  });

  test('registerCustomGroup(_mint, _treasury, _name, _symbol, _cidV0Digest) encodes and decodes correctly', () => {
    const mint = generateRandomAddress();
    const treasury = generateRandomAddress();
    const name = 'GroupName';
    const symbol = 'GN';
    const cidV0Digest = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const decodedMultihash = decodeMultihash(cidV0Digest);

    const encoded = new V2HubCallsEncoder().registerCustomGroup(<V2HubInputTypes.RegisterCustomGroupInputs>{
      _mint: mint,
      _treasury: treasury,
      _name: name,
      _symbol: symbol,
      _cidV0Digest: decodedMultihash.digest
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.RegisterCustomGroupInputs>decoded.inputs;

    expect(decoded?.name).toBe('registerCustomGroup');
    expect(inputs._mint).toEqual(mint);
    expect(inputs._treasury).toEqual(treasury);
    expect(inputs._name).toEqual(name);
    expect(inputs._symbol).toEqual(symbol);
    expect(inputs._cidV0Digest).toEqual(decodedMultihash.digest);

    const bas58Encoded = encodeMultihash(inputs._cidV0Digest, {
      code: <HashCode>18,
      name: <HashName>'sha2-256',
      length: 32,
      digest: inputs._cidV0Digest
    });
    expect(bas58Encoded).toEqual(cidV0Digest);
  });

  test('registerGroup(_name, _symbol, _cidV0Digest) encodes and decodes correctly', () => {
    const name = 'GroupName';
    const symbol = 'GN';
    const cidV0Digest = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const decodedMultihash = decodeMultihash(cidV0Digest);
    const mint = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().registerGroup(<V2HubInputTypes.RegisterGroupInputs>{
      _mint: mint,
      _name: name,
      _symbol: symbol,
      _cidV0Digest: decodedMultihash.digest
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.RegisterGroupInputs>decoded.inputs;

    expect(decoded?.name).toBe('registerGroup');
    expect(inputs?._mint).toBe(mint);
    expect(inputs._name).toEqual(name);
    expect(inputs._symbol).toEqual(symbol);
    expect(inputs._cidV0Digest).toEqual(decodedMultihash.digest);

    const bas58Encoded = encodeMultihash(inputs._cidV0Digest, {
      code: <HashCode>18,
      name: <HashName>'sha2-256',
      length: 32,
      digest: inputs._cidV0Digest
    });
    expect(bas58Encoded).toEqual(cidV0Digest);
  });

  test('registerHuman(_cidV0Digest) encodes and decodes correctly', () => {
    const cidV0 = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const decodedMultihash = decodeMultihash(cidV0);

    const encoded = new V2HubCallsEncoder().registerHuman(<V2HubInputTypes.RegisterHumanInputs>{ _cidV0Digest: decodedMultihash.digest });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.RegisterHumanInputs>decoded.inputs;

    expect(decoded?.name).toBe('registerHuman');
    expect(inputs._cidV0Digest).toEqual(decodedMultihash.digest);

    const bas58Encoded = encodeMultihash(inputs._cidV0Digest, {
      code: <HashCode>18,
      name: <HashName>'sha2-256',
      length: 32,
      digest: inputs._cidV0Digest
    });
    expect(bas58Encoded).toEqual(cidV0);
  });

  test('registerOrganization(_name, _cidV0Digest) encodes and decodes correctly', () => {
    const name = 'OrgName';
    const cidV0Digest = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const decodedMultihash = decodeMultihash(cidV0Digest);

    const encoded = new V2HubCallsEncoder().registerOrganization(<V2HubInputTypes.RegisterOrganizationInputs>{
      _name: name,
      _cidV0Digest: decodedMultihash.digest
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.RegisterOrganizationInputs>decoded.inputs;

    expect(decoded?.name).toBe('registerOrganization');
    expect(inputs._name).toEqual(name);
    expect(inputs._cidV0Digest).toEqual(decodedMultihash.digest);

    const bas58Encoded = encodeMultihash(inputs._cidV0Digest, {
      code: <HashCode>18,
      name: <HashName>'sha2-256',
      length: 32,
      digest: inputs._cidV0Digest
    });
    expect(bas58Encoded).toEqual(cidV0Digest);
  });

  test('safeBatchTransferFrom(_from, _to, _ids, _values, _data) encodes and decodes correctly', () => {
    const from = generateRandomAddress();
    const to = generateRandomAddress();
    const ids = [generateRandomAddress(), generateRandomAddress()];
    const values = [ethers.parseEther('100'), ethers.parseEther('200')];
    const data = generateRandomData(32);
    const encoded = new V2HubCallsEncoder().safeBatchTransferFrom(<V2HubInputTypes.SafeBatchTransferFromInputs>{
      _from: from,
      _to: to,
      _ids: ids.map((id) => addressToUint(id)),
      _values: values,
      _data: data
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.SafeBatchTransferFromInputs>decoded.inputs;

    expect(decoded?.name).toBe('safeBatchTransferFrom');
    expect(inputs._from).toEqual(from);
    expect(inputs._to).toEqual(to);
    expect(inputs._ids.map((id) => uintToAddress(BigInt(id)))).toEqual(ids);
    expect(inputs._values.map((val) => BigInt(val))).toEqual(values);
    expect(inputs._data).toEqual(data);
  });

  test('safeTransferFrom(_from, _to, _id, _value, _data) encodes and decodes correctly', () => {
    const from = generateRandomAddress();
    const to = generateRandomAddress();
    const id = generateRandomAddress();
    const value = ethers.parseEther('1000');
    const data = generateRandomData(32);
    const encoded = new V2HubCallsEncoder().safeTransferFrom(<V2HubInputTypes.SafeTransferFromInputs>{
      _from: from,
      _to: to,
      _id: addressToUint(id),
      _value: value,
      _data: data
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.SafeTransferFromInputs>decoded.inputs;

    expect(decoded?.name).toBe('safeTransferFrom');
    expect(inputs._from).toEqual(from);
    expect(inputs._to).toEqual(to);
    expect(uintToAddress(BigInt(inputs._id))).toEqual(id);
    expect(BigInt(inputs._value)).toEqual(value);
    expect(inputs._data).toEqual(data);
  });

  test('setApprovalForAll(operator, approved) encodes and decodes correctly', () => {
    const operator = generateRandomAddress();
    const approved = true;
    const encoded = new V2HubCallsEncoder().setApprovalForAll(<V2HubInputTypes.SetApprovalForAllInputs>{
      _operator: operator,
      _approved: approved
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.SetApprovalForAllInputs>decoded.inputs;

    expect(decoded?.name).toBe('setApprovalForAll');
    expect(inputs._operator).toEqual(operator);
    expect(inputs._approved).toEqual(approved);
  });

  // setIpfsCidV0
  test('setIpfsCidV0(_cidV0Digest) encodes and decodes correctly', () => {
    const cidV0Digest = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
    const decodedMultihash = decodeMultihash(cidV0Digest);

    const encoded = new V2HubCallsEncoder().setIpfsCidV0(<V2HubInputTypes.SetIpfsCidV0Inputs>{ _ipfsCid: decodedMultihash.digest });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.SetIpfsCidV0Inputs>decoded.inputs;

    expect(decoded?.name).toBe('setIpfsCidV0');
    expect(inputs._ipfsCid).toEqual(decodedMultihash.digest);
  });

  // standardTreasury
  test('standardTreasury() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().standardTreasury();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('standardTreasury');
    expect(decoded?.args).toEqual([]);
  });

  // stop
  test('stop() encodes and decodes correctly', () => {
    const encoded = new V2HubCallsEncoder().stop();
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.NoInputs>decoded.inputs;

    expect(decoded?.name).toBe('stop');
    expect(inputs).toEqual([]);
  });

  // stopped
  test('stopped() encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().stopped(<V2HubInputTypes.StoppedInputs>{ _human: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('stopped');
    expect(decoded?.args).toEqual([address]);
  });

  // symbols
  test('symbols(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().symbols(<V2HubInputTypes.SymbolsInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('symbols');
    expect(decoded?.args).toEqual([address]);
  });

  // tokenIDToInfERC20
  test('tokenIDToInfERC20(_tokenId) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const encoded = new V2HubCallsEncoder().tokenIDToInfERC20(<V2HubInputTypes.TokenIDToInfERC20Inputs>{ arg0: tokenId });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('tokenIDToInfERC20');
    expect(decoded?.args[0]).toEqual(tokenId);
  });

  // tokenIdToCidV0Digest
  test('tokenIdToCidV0Digest(_tokenId) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const encoded = new V2HubCallsEncoder().tokenIdToCidV0Digest(<V2HubInputTypes.TokenIdToCidV0DigestInputs>{ arg0: tokenId });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('tokenIdToCidV0Digest');
    expect(decoded?.args[0]).toEqual(tokenId);
  });

  // treasuries
  test('treasuries(_address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().treasuries(<V2HubInputTypes.TreasuriesInputs>{ arg0: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('treasuries');
    expect(decoded?.args).toEqual([address]);
  });

  test('trust(_trustReceiver, _expiry) encodes and decodes correctly', () => {
    const trustReceiver = generateRandomAddress();
    const expiry = BigInt('1234567890');
    const encoded = new V2HubCallsEncoder().trust(<V2HubInputTypes.TrustInputs>{
      _trustReceiver: trustReceiver,
      _expiry: expiry
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.TrustInputs>decoded.inputs;

    expect(decoded?.name).toBe('trust');
    expect(inputs._trustReceiver).toEqual(trustReceiver);
    expect(inputs._expiry).toEqual(expiry);
  });

  test('trustMarkers(_truster, _trustee) encodes and decodes correctly', () => {
    const truster = generateRandomAddress();
    const trustee = generateRandomAddress();
    const encoded = new V2HubCallsEncoder().trustMarkers(<V2HubInputTypes.TrustMarkersInputs>{
      arg0: truster,
      arg1: trustee
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('trustMarkers');
    expect(decoded?.args).toEqual([truster, trustee]);
  });

  test('unwrapInflationaryERC20(_tokenId, _amount) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const amount = ethers.parseEther('1000');
    const encoded = new V2HubCallsEncoder().unwrapInflationaryERC20(<V2HubInputTypes.UnwrapInflationaryERC20Inputs>{
      _tokenId: tokenId,
      _amount: amount
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('unwrapInflationaryERC20');

    const decodedTokenId = decoded?.args[0];
    expect(decodedTokenId).toEqual(tokenId);

    const decodedAmount = decoded?.args[1];
    expect(BigInt(decodedAmount)).toEqual(amount);
  });

  test('uri(_id) encodes and decodes correctly', () => {
    const id = addressToUint(generateRandomAddress());
    const encoded = new V2HubCallsEncoder().uri(<V2HubInputTypes.UriInputs>{ _id: id });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('uri');

    const decodedId = decoded?.args[0];
    expect(decodedId).toEqual(id);
  });

  // wrapInflationaryERC20
  test('wrapInflationaryERC20(_tokenId, _amount) encodes and decodes correctly', () => {
    const tokenId = addressToUint(generateRandomAddress());
    const amount = ethers.parseEther('1000');
    const encoded = new V2HubCallsEncoder().wrapInflationaryERC20(<V2HubInputTypes.WrapInflationaryERC20Inputs>{
      _tokenId: tokenId,
      _amount: amount
    });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('wrapInflationaryERC20');

    const decodedTokenId = decoded?.args[0];
    expect(decodedTokenId).toEqual(tokenId);

    const decodedAmount = decoded?.args[1];
    expect(BigInt(decodedAmount)).toEqual(amount);
  });

  test('operateFlowMatrix encodes and decodes correctly', () => {
    const flowVertices = [generateRandomAddress(), generateRandomAddress()];
    const flow = [
      { streamSinkId: BigInt(1), amount: BigInt(1000) },
      { streamSinkId: BigInt(2), amount: BigInt(2000) }
    ];
    const streams = [
      { sourceCoordinate: BigInt(1), flowEdgeIds: [BigInt(1), BigInt(2)], data: generateRandomData(32) },
      { sourceCoordinate: BigInt(2), flowEdgeIds: [BigInt(3), BigInt(4)], data: generateRandomData(32) }
    ];
    const packedCoordinates = generateRandomData(32);
    const encoded = new V2HubCallsEncoder().operateFlowMatrix(<V2HubInputTypes.OperateFlowMatrixInputs>{
      _flowVertices: flowVertices,
      _flow: flow,
      _streams: streams,
      _packedCoordinates: packedCoordinates
    });
    const decoded = new V2HubCallsDecoder().decode(encoded);
    const inputs = <V2HubInputTypes.OperateFlowMatrixInputs>decoded.inputs;

    const decodedFlows = inputs._flow.map(o => ({
      streamSinkId: BigInt(o.streamSinkId),
      amount: BigInt(o.amount)
    }));

    const decodedStreams = inputs._streams.map(o => ({
      sourceCoordinate: BigInt(o.sourceCoordinate),
      flowEdgeIds: o.flowEdgeIds.map((id: string) => BigInt(id)),
      data: new Uint8Array(Buffer.from(o.data.substring(2), 'hex'))
    }));

    expect(decoded?.name).toBe('operateFlowMatrix');
    expect(inputs._flowVertices).toEqual(flowVertices);
    expect(decodedFlows).toEqual(flow);
    expect(decodedStreams).toEqual(streams);
    expect(inputs._packedCoordinates).toEqual(packedCoordinates);
  });
});

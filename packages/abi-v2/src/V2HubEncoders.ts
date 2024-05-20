import { ethers } from 'ethers';
import * as inputTypes from './V2HubFunctionInputTypes';
import contractAbi from './V2HubAbi.json';

export class V2HubCalls {
    private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

        advancedUsageFlags(params: inputTypes.AdvancedUsageFlagsInputs): string {
        return this.contractInterface.encodeFunctionData('advancedUsageFlags', [params.arg0]);
    }

    avatars(params: inputTypes.AvatarsInputs): string {
        return this.contractInterface.encodeFunctionData('avatars', [params.arg0]);
    }

    balanceOf(params: inputTypes.BalanceOfInputs): string {
        return this.contractInterface.encodeFunctionData('balanceOf', [params._account, params._id]);
    }

    balanceOfBatch(params: inputTypes.BalanceOfBatchInputs): string {
        return this.contractInterface.encodeFunctionData('balanceOfBatch', [params._accounts, params._ids]);
    }

    balanceOfOnDay(params: inputTypes.BalanceOfOnDayInputs): string {
        return this.contractInterface.encodeFunctionData('balanceOfOnDay', [params._account, params._id, params._day]);
    }

    burn(params: inputTypes.BurnInputs): string {
        return this.contractInterface.encodeFunctionData('burn', [params._id, params._amount, params._data]);
    }

    calculateIssuance(params: inputTypes.CalculateIssuanceInputs): string {
        return this.contractInterface.encodeFunctionData('calculateIssuance', [params._human]);
    }

    calculateIssuanceWithCheck(params: inputTypes.CalculateIssuanceWithCheckInputs): string {
        return this.contractInterface.encodeFunctionData('calculateIssuanceWithCheck', [params._human]);
    }

    convertBatchInflationaryToDemurrageValues(params: inputTypes.ConvertBatchInflationaryToDemurrageValuesInputs): string {
        return this.contractInterface.encodeFunctionData('convertBatchInflationaryToDemurrageValues', [params._inflationaryValues, params._day]);
    }

    convertInflationaryToDemurrageValue(params: inputTypes.ConvertInflationaryToDemurrageValueInputs): string {
        return this.contractInterface.encodeFunctionData('convertInflationaryToDemurrageValue', [params._inflationaryValue, params._day]);
    }

    day(params: inputTypes.DayInputs): string {
        return this.contractInterface.encodeFunctionData('day', [params._timestamp]);
    }

    groupMint(params: inputTypes.GroupMintInputs): string {
        return this.contractInterface.encodeFunctionData('groupMint', [params._group, params._collateralAvatars, params._amounts, params._data]);
    }

    inflationDayZero(): string {
        return this.contractInterface.encodeFunctionData('inflationDayZero', []);
    }

    inviteHuman(params: inputTypes.InviteHumanInputs): string {
        return this.contractInterface.encodeFunctionData('inviteHuman', [params._human]);
    }

    isApprovedForAll(params: inputTypes.IsApprovedForAllInputs): string {
        return this.contractInterface.encodeFunctionData('isApprovedForAll', [params._account, params._operator]);
    }

    isGroup(params: inputTypes.IsGroupInputs): string {
        return this.contractInterface.encodeFunctionData('isGroup', [params._group]);
    }

    isHuman(params: inputTypes.IsHumanInputs): string {
        return this.contractInterface.encodeFunctionData('isHuman', [params._human]);
    }

    isOrganization(params: inputTypes.IsOrganizationInputs): string {
        return this.contractInterface.encodeFunctionData('isOrganization', [params._organization]);
    }

    isPermittedFlow(params: inputTypes.IsPermittedFlowInputs): string {
        return this.contractInterface.encodeFunctionData('isPermittedFlow', [params._to, params._circlesAvatar]);
    }

    isTrusted(params: inputTypes.IsTrustedInputs): string {
        return this.contractInterface.encodeFunctionData('isTrusted', [params._truster, params._trustee]);
    }

    migrate(params: inputTypes.MigrateInputs): string {
        return this.contractInterface.encodeFunctionData('migrate', [params._owner, params._avatars, params._amounts]);
    }

    mintPolicies(params: inputTypes.MintPoliciesInputs): string {
        return this.contractInterface.encodeFunctionData('mintPolicies', [params.arg0]);
    }

    operateFlowMatrix(params: inputTypes.OperateFlowMatrixInputs): string {
        return this.contractInterface.encodeFunctionData('operateFlowMatrix', [params._flowVertices, params._flow, params._streams, params._packedCoordinates]);
    }

    personalMint(): string {
        return this.contractInterface.encodeFunctionData('personalMint', []);
    }

    registerCustomGroup(params: inputTypes.RegisterCustomGroupInputs): string {
        return this.contractInterface.encodeFunctionData('registerCustomGroup', [params._mint, params._treasury, params._name, params._symbol, params._metatdataDigest]);
    }

    registerGroup(params: inputTypes.RegisterGroupInputs): string {
        return this.contractInterface.encodeFunctionData('registerGroup', [params._mint, params._name, params._symbol, params._metatdataDigest]);
    }

    registerHuman(params: inputTypes.RegisterHumanInputs): string {
        return this.contractInterface.encodeFunctionData('registerHuman', [params._metatdataDigest]);
    }

    registerOrganization(params: inputTypes.RegisterOrganizationInputs): string {
        return this.contractInterface.encodeFunctionData('registerOrganization', [params._name, params._metatdataDigest]);
    }

    safeBatchTransferFrom(params: inputTypes.SafeBatchTransferFromInputs): string {
        return this.contractInterface.encodeFunctionData('safeBatchTransferFrom', [params._from, params._to, params._ids, params._values, params._data]);
    }

    safeTransferFrom(params: inputTypes.SafeTransferFromInputs): string {
        return this.contractInterface.encodeFunctionData('safeTransferFrom', [params._from, params._to, params._id, params._value, params._data]);
    }

    setAdvancedUsageFlag(params: inputTypes.SetAdvancedUsageFlagInputs): string {
        return this.contractInterface.encodeFunctionData('setAdvancedUsageFlag', [params._flag]);
    }

    setApprovalForAll(params: inputTypes.SetApprovalForAllInputs): string {
        return this.contractInterface.encodeFunctionData('setApprovalForAll', [params._operator, params._approved]);
    }

    stop(): string {
        return this.contractInterface.encodeFunctionData('stop', []);
    }

    stopped(params: inputTypes.StoppedInputs): string {
        return this.contractInterface.encodeFunctionData('stopped', [params._human]);
    }

    supportsInterface(params: inputTypes.SupportsInterfaceInputs): string {
        return this.contractInterface.encodeFunctionData('supportsInterface', [params._interfaceId]);
    }

    toTokenId(params: inputTypes.ToTokenIdInputs): string {
        return this.contractInterface.encodeFunctionData('toTokenId', [params._avatar]);
    }

    totalSupply(params: inputTypes.TotalSupplyInputs): string {
        return this.contractInterface.encodeFunctionData('totalSupply', [params._id]);
    }

    treasuries(params: inputTypes.TreasuriesInputs): string {
        return this.contractInterface.encodeFunctionData('treasuries', [params.arg0]);
    }

    trust(params: inputTypes.TrustInputs): string {
        return this.contractInterface.encodeFunctionData('trust', [params._trustReceiver, params._expiry]);
    }

    trustMarkers(params: inputTypes.TrustMarkersInputs): string {
        return this.contractInterface.encodeFunctionData('trustMarkers', [params.arg0, params.arg1]);
    }

    uri(params: inputTypes.UriInputs): string {
        return this.contractInterface.encodeFunctionData('uri', [params.arg0]);
    }

    wrap(params: inputTypes.WrapInputs): string {
        return this.contractInterface.encodeFunctionData('wrap', [params._avatar, params._amount, params._type]);
    }

}


import { ethers } from 'ethers';
import * as inputTypes from './V1TokenFunctionInputTypes';
import contractAbi from './V1TokenAbi.json';

export class V1TokenCalls {
  private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

  allowance(params: inputTypes.AllowanceInputs): string {
    return this.contractInterface.encodeFunctionData('allowance', [params.owner, params.spender]);
  }

  approve(params: inputTypes.ApproveInputs): string {
    return this.contractInterface.encodeFunctionData('approve', [params.spender, params.amount]);
  }

  balanceOf(params: inputTypes.BalanceOfInputs): string {
    return this.contractInterface.encodeFunctionData('balanceOf', [params.account]);
  }

  currentIssuance(): string {
    return this.contractInterface.encodeFunctionData('currentIssuance', []);
  }

  decimals(): string {
    return this.contractInterface.encodeFunctionData('decimals', []);
  }

  decreaseAllowance(params: inputTypes.DecreaseAllowanceInputs): string {
    return this.contractInterface.encodeFunctionData('decreaseAllowance', [params.spender, params.subtractedValue]);
  }

  findInflationOffset(): string {
    return this.contractInterface.encodeFunctionData('findInflationOffset', []);
  }

  hub(): string {
    return this.contractInterface.encodeFunctionData('hub', []);
  }

  hubDeployedAt(): string {
    return this.contractInterface.encodeFunctionData('hubDeployedAt', []);
  }

  hubTransfer(params: inputTypes.HubTransferInputs): string {
    return this.contractInterface.encodeFunctionData('hubTransfer', [params.from, params.to, params.amount]);
  }

  increaseAllowance(params: inputTypes.IncreaseAllowanceInputs): string {
    return this.contractInterface.encodeFunctionData('increaseAllowance', [params.spender, params.addedValue]);
  }

  inflationOffset(): string {
    return this.contractInterface.encodeFunctionData('inflationOffset', []);
  }

  lastTouched(): string {
    return this.contractInterface.encodeFunctionData('lastTouched', []);
  }

  look(): string {
    return this.contractInterface.encodeFunctionData('look', []);
  }

  name(): string {
    return this.contractInterface.encodeFunctionData('name', []);
  }

  owner(): string {
    return this.contractInterface.encodeFunctionData('owner', []);
  }

  period(): string {
    return this.contractInterface.encodeFunctionData('period', []);
  }

  periods(): string {
    return this.contractInterface.encodeFunctionData('periods', []);
  }

  periodsWhenLastTouched(): string {
    return this.contractInterface.encodeFunctionData('periodsWhenLastTouched', []);
  }

  stop(): string {
    return this.contractInterface.encodeFunctionData('stop', []);
  }

  stopped(): string {
    return this.contractInterface.encodeFunctionData('stopped', []);
  }

  symbol(): string {
    return this.contractInterface.encodeFunctionData('symbol', []);
  }

  time(): string {
    return this.contractInterface.encodeFunctionData('time', []);
  }

  timeout(): string {
    return this.contractInterface.encodeFunctionData('timeout', []);
  }

  totalSupply(): string {
    return this.contractInterface.encodeFunctionData('totalSupply', []);
  }

  transfer(params: inputTypes.TransferInputs): string {
    return this.contractInterface.encodeFunctionData('transfer', [params.dst, params.wad]);
  }

  transferFrom(params: inputTypes.TransferFromInputs): string {
    return this.contractInterface.encodeFunctionData('transferFrom', [params.sender, params.recipient, params.amount]);
  }

  update(): string {
    return this.contractInterface.encodeFunctionData('update', []);
  }

}


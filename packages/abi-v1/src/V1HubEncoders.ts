import { ethers } from 'ethers';
import * as inputTypes from './V1HubFunctionInputTypes';
import contractAbi from './V1HubAbi.json';

export class V1HubCalls {
  private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

  checkSendLimit(params: inputTypes.CheckSendLimitInputs): string {
    return this.contractInterface.encodeFunctionData('checkSendLimit', [params.tokenOwner, params.src, params.dest]);
  }

  deployedAt(): string {
    return this.contractInterface.encodeFunctionData('deployedAt', []);
  }

  divisor(): string {
    return this.contractInterface.encodeFunctionData('divisor', []);
  }

  inflate(params: inputTypes.InflateInputs): string {
    return this.contractInterface.encodeFunctionData('inflate', [params._initial, params._periods]);
  }

  inflation(): string {
    return this.contractInterface.encodeFunctionData('inflation', []);
  }

  initialIssuance(): string {
    return this.contractInterface.encodeFunctionData('initialIssuance', []);
  }

  issuance(): string {
    return this.contractInterface.encodeFunctionData('issuance', []);
  }

  issuanceByStep(params: inputTypes.IssuanceByStepInputs): string {
    return this.contractInterface.encodeFunctionData('issuanceByStep', [params._periods]);
  }

  limits(params: inputTypes.LimitsInputs): string {
    return this.contractInterface.encodeFunctionData('limits', [params.arg0, params.arg1]);
  }

  name(): string {
    return this.contractInterface.encodeFunctionData('name', []);
  }

  organizationSignup(): string {
    return this.contractInterface.encodeFunctionData('organizationSignup', []);
  }

  organizations(params: inputTypes.OrganizationsInputs): string {
    return this.contractInterface.encodeFunctionData('organizations', [params.arg0]);
  }

  period(): string {
    return this.contractInterface.encodeFunctionData('period', []);
  }

  periods(): string {
    return this.contractInterface.encodeFunctionData('periods', []);
  }

  pow(params: inputTypes.PowInputs): string {
    return this.contractInterface.encodeFunctionData('pow', [params.base, params.exponent]);
  }

  seen(params: inputTypes.SeenInputs): string {
    return this.contractInterface.encodeFunctionData('seen', [params.arg0]);
  }

  signup(): string {
    return this.contractInterface.encodeFunctionData('signup', []);
  }

  signupBonus(): string {
    return this.contractInterface.encodeFunctionData('signupBonus', []);
  }

  symbol(): string {
    return this.contractInterface.encodeFunctionData('symbol', []);
  }

  timeout(): string {
    return this.contractInterface.encodeFunctionData('timeout', []);
  }

  tokenToUser(params: inputTypes.TokenToUserInputs): string {
    return this.contractInterface.encodeFunctionData('tokenToUser', [params.arg0]);
  }

  transferThrough(params: inputTypes.TransferThroughInputs): string {
    return this.contractInterface.encodeFunctionData('transferThrough', [params.tokenOwners, params.srcs, params.dests, params.wads]);
  }

  trust(params: inputTypes.TrustInputs): string {
    return this.contractInterface.encodeFunctionData('trust', [params.user, params.limit]);
  }

  userToToken(params: inputTypes.UserToTokenInputs): string {
    return this.contractInterface.encodeFunctionData('userToToken', [params.arg0]);
  }

  validation(params: inputTypes.ValidationInputs): string {
    return this.contractInterface.encodeFunctionData('validation', [params.arg0]);
  }

}


import TokenPortal from '../../eth-contracts/out/TokenPortal.sol/TokenPortal.json' assert { type: 'json' };
export const TokenPortalBytecode  = TokenPortal.bytecode.object as `0x${string}`;
export const {abi: TokenPortalAbi }  = TokenPortal;

import HawthoriaPortal from '../../eth-contracts/out/HawPortal.sol/HawthoriaPortal.json' assert { type: 'json' };
export const HawthoriaPortalBytecode  = HawthoriaPortal.bytecode.object as `0x${string}`;
export const {abi: HawthoriaPortalAbi }  = HawthoriaPortal;

import GitcoinDeployerHelper from "../../eth-contracts/out/GitcoinDeployHelper.sol/GitcoinDeployHelper.json" assert { type: "json" };
export const GitcoinDeployHelperBytecode  = GitcoinDeployerHelper.bytecode.object as `0x${string}`;
export const {abi: GitcoinDeployHelperAbi }  = GitcoinDeployerHelper;

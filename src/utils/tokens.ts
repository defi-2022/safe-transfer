import BN from "bn.js";
import { CustomNetworkType } from "./network";
import { customWeb3s } from "../components/App/App";
import CONTRACT_ERC20 from "../contracts/ERC20.json";

export type TokenMetadataType = {
    address: string;
    name: string;
    symbol: string;
    decimals: string;
    balance?: string;
    logo?: string | undefined;
    // eslint-disable-next-line camelcase
    logo_hash?: string | undefined;
    thumbnail?: string | undefined;
    // eslint-disable-next-line camelcase
    block_number?: string | undefined;
    validated?: string | undefined;
};

interface TokenInfo {
    id: string;
    symbol: string;
    address: string;
}
export const CUSTOM_TOKENS: Record<CustomNetworkType, TokenInfo[]> = {
    aurora: [
        {
            id: "tether",
            symbol: "USDT",
            address: "0x4988a896b1227218e4a686fde5eabdcabd91571f",
        },
        {
            id: "dai",
            symbol: "DAI",
            address: "0xe3520349f477a5f6eb06107066048508498a291b",
        },
        {
            id: "usdc",
            symbol: "USDC",
            address: "0xb12bfca5a55806aaf64e99521918a4bf0fc40802",
        },
        {
            id: "Aurora",
            symbol: "AURORA",
            address: "0x8bec47865ade3b172a928df8f990bc7f2a3b9f79",
        },
        {
            id: "Chronicle",
            symbol: "XNL",
            address: "0x7ca1c28663b76cfde424a9494555b94846205585",
        },
        {
            id: "WannaSwap",
            symbol: "WANNA",
            address: "0x7faa64faf54750a2e3ee621166635feaf406ab22",
        },
    ],
};

export const beautifyTokenBalance = (balance: string, decimals: number, fraction = 5) => {
    const exp = 10 ** fraction;

    return (+balance.slice(0, -decimals + fraction) / exp).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: fraction,
    });
};

export const fromHRToBN = (n: number, decimals: number) => new BN(10).pow(new BN(decimals)).muln(n);

export const toHRNumber = (bn: BN, decimal = 0) => bn.div(new BN(10).pow(new BN(decimal))).toNumber();
export const toHRNumberFloat = (bn: BN, decimal = 0) => toHRNumber(bn.muln(1000), decimal) / 1000;

export const getCustomTokenMetadata = async (chain: CustomNetworkType, address: string, account?: string) => {
    const tokenContract = new customWeb3s[chain].eth.Contract(CONTRACT_ERC20 as any, address);
    const balance = account ? await tokenContract.methods.balanceOf(account).call() : undefined;

    return {
        address,
        balance,
        name: await tokenContract.methods.name().call(),
        symbol: await tokenContract.methods.symbol().call(),
        decimals: await tokenContract.methods.decimals().call(),
    };
};

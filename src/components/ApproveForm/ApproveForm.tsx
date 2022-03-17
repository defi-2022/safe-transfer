import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import Web3 from "web3";
import Moralis from "moralis";
import {
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
} from "@mui/material";
import { useMoralis, useMoralisWeb3Api } from "react-moralis";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { changeNetworkAtMetamask, getTrxHashLink, idToNetwork, networkNames } from "../../utils/network";
import { isAddress } from "../../utils/wallet";
import { beautifyTokenBalance, fromHRToBN } from "../../utils/tokens";
import { APPROVE_ABI } from "../../contracts/abi";
import { generateUrl } from "../../utils/urlGenerator";

import "./ApproveForm.scss";
import { addSuccessNotification } from "../../utils/notifications";

type BalanceType = {
    // eslint-disable-next-line camelcase
    token_address: string;
    name: string;
    symbol: string;
    logo?: string | undefined;
    thumbnail?: string | undefined;
    decimals: string;
    balance: string;
};

const ApproveForm = () => {
    const { account, chainId: hexChainId } = useMoralis();
    const chainId = Web3.utils.hexToNumber(hexChainId ?? "");
    const networkName = idToNetwork[chainId];
    const [toAddress, setToAddress] = useState<undefined | string>(undefined);
    const [value, setValue] = useState<undefined | number>(undefined);
    const [selectedToken, setSelectedToken] = useState<undefined | string>(undefined); // address
    const [isApproveLoading, setIsApproveLoading] = useState(false);
    const [trxHash, setTrxHash] = useState("");
    const [trxLink, setTrxLink] = useState("");
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [genUrl, setGenUrl] = useState<undefined | string>(undefined);
    const Web3Api = useMoralisWeb3Api();

    const onMount = async () => {
        if (hexChainId) {
            const options = { chain: hexChainId, address: account };
            // @ts-ignore
            const result = await Web3Api.account.getTokenBalances(options);
            setBalances(result.sort((a, b) => (a.symbol > b.symbol ? 1 : -1)));
        }
    };

    useEffect(() => {
        onMount();
    }, [hexChainId, account]);

    const handleNetworkChange = useCallback((event) => {
        changeNetworkAtMetamask(event.target.value);
    }, []);

    if (!account) {
        return <div className="approve-form">Please connect your wallet</div>;
    }

    const handleAddressChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setToAddress(event.target.value);
    };

    const handleTokenChange = (event: SelectChangeEvent) => {
        setSelectedToken(event.target.value);
    };

    const handleValueChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(+event.target.value);
    };

    const handleCopyGenUrl = () => {
        if (genUrl) {
            navigator.clipboard.writeText(genUrl);
            addSuccessNotification("Copied", undefined, true);
        }
    };

    const handleApprove = async () => {
        const selectedTokenInfo = balances.find((v) => v.token_address === selectedToken);
        if (selectedTokenInfo && value && toAddress) {
            setGenUrl(undefined);
            setTrxHash("");
            setTrxLink("");
            setIsApproveLoading(true);
            const contractAddress = selectedTokenInfo.token_address;
            const valueBN = fromHRToBN(value, +selectedTokenInfo.decimals).toString();
            const options = {
                contractAddress,
                functionName: "approve",
                abi: APPROVE_ABI,
                params: { _spender: toAddress, _value: valueBN },
            };
            const transaction = await Moralis.executeFunction(options);
            setTrxHash(transaction.hash);
            setTrxLink(getTrxHashLink(transaction.hash, networkName));
            // @ts-ignore
            await transaction.wait();
            addSuccessNotification("Success", "Approve transaction completed");
            setIsApproveLoading(false);
            setGenUrl(
                generateUrl({
                    address: options.contractAddress,
                    from: account,
                    to: toAddress,
                    value: valueBN,
                    chain: networkName,
                })
            );
        }
    };

    const isCorrectData = isAddress(toAddress) && (value ?? 0) > 0 && selectedToken;

    return (
        <div className="approve-form">
            <FormControl className="approve-form__network-form">
                <InputLabel id="network-form-label">Network</InputLabel>
                <Select labelId="network-form-label" value={networkName} label="Network" onChange={handleNetworkChange}>
                    {Object.entries(networkNames).map(([id, name]) => (
                        <MenuItem key={id} value={id}>
                            {name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl className="approve-form__token-form">
                <InputLabel id="token-form-label">Token to spend</InputLabel>
                <Select labelId="token-form-label" value={selectedToken} label="Token" onChange={handleTokenChange}>
                    {balances.map((token) => (
                        <MenuItem key={token.token_address} value={token.token_address}>
                            {token.symbol} ({beautifyTokenBalance(token.balance, +token.decimals)})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TextField
                id="address"
                className="approve-form__address"
                label="Recipient address"
                variant="outlined"
                onChange={handleAddressChange}
            />
            <TextField
                id="value"
                className="approve-form__value"
                label="Amount"
                type="number"
                onChange={handleValueChange}
                InputLabelProps={{
                    shrink: true,
                }}
            />
            <Button
                variant="contained"
                onClick={handleApprove}
                className="approve-form__button"
                disabled={!isCorrectData || isApproveLoading}
            >
                {isApproveLoading ? "Loading..." : "Approve"}
            </Button>
            {trxHash && (
                <div className="approve-form__hash">
                    Your transaction hash:{" "}
                    <a href={trxLink} target="_blank" rel="noreferrer">
                        {trxHash}
                    </a>
                </div>
            )}
            {genUrl && (
                <div className="approve-form__url">
                    <div>New URL:</div>
                    <div>
                        {genUrl}
                        <IconButton aria-label="copy" onClick={handleCopyGenUrl}>
                            <ContentCopyIcon />
                        </IconButton>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApproveForm;

import React, { useContext, useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import cn from "classnames";

import { NetworkType, getAddressLink, getTrxHashLink, idToNetwork, networkNames } from "../../utils/network";
import { decodeToken, getShortHash, handleCopyUrl, TokenInfoType } from "../../utils/urlGenerator";
import {
    beautifyTokenBalance,
    getCustomTokenAllowance,
    getCustomTokenMetadata,
    getTokenContractFactory,
    TokenMetadataType,
} from "../../utils/tokens";
import { addErrorNotification, addSuccessNotification } from "../../utils/notifications";
import { ReactComponent as ContentCopyIcon } from "../../ui-kit/images/copy.svg";
import { ReactComponent as MetamaskIcon } from "../../ui-kit/images/metamask.svg";
import Button from "../../ui-kit/components/Button/Button";
import { InfoCell } from "../InfoCell/InfoCell";
import { NetworkImage } from "../../ui-kit/components/NetworkImage/NetworkImage";
import { StateContext } from "../../reducer/constants";

import "./TransferForm.scss";

interface TransferFormProps {
    token: string;
    onConnect: () => void;
}

const getValue = (tokenMetadata: TokenMetadataType | undefined, tokenData: TokenInfoType) =>
    tokenMetadata
        ? `${beautifyTokenBalance(tokenData.value, +tokenMetadata.decimals)} ${tokenMetadata.symbol}`
        : tokenData.value;

const TransferForm = React.memo(({ token, onConnect }: TransferFormProps) => {
    const { address, chainId, web3 } = useContext(StateContext);
    const [tokenMetadata, setTokenMetadata] = useState<undefined | TokenMetadataType>(undefined);
    const [isTransferFetching, setIsTransferFetching] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [trxHash, setTrxHash] = useState("");
    const [allowance, setAllowance] = useState<undefined | string>(undefined);
    const networkName = chainId ? idToNetwork[chainId] : undefined;
    const tokenData = decodeToken(token);

    const updateTokenMetadata = async () => {
        if (tokenData) {
            const newTokenMetadata = await getCustomTokenMetadata(tokenData.chain as NetworkType, tokenData.address);
            setTokenMetadata(newTokenMetadata);
            document.title = `Receive ${getValue(newTokenMetadata, tokenData)}`;
        }
    };

    const updateAllowance = async () => {
        if (tokenData) {
            const allowanceFromContract = await getCustomTokenAllowance(
                tokenData.chain as NetworkType,
                tokenData.address,
                tokenData.from,
                tokenData.to
            );
            setAllowance(allowanceFromContract);
        }
    };

    useEffect(() => {
        updateTokenMetadata();
        updateAllowance();
    }, [token, address]);

    const handleTransfer = async () => {
        setIsTransferFetching(true);

        try {
            if (tokenData && web3) {
                const getTokenContract = getTokenContractFactory(web3);
                const tokenContract = getTokenContract(tokenData.address);
                if (tokenContract) {
                    await tokenContract.methods
                        .transferFrom(tokenData.from, tokenData.to, tokenData.value)
                        .send({ from: address, maxPriorityFeePerGas: null, maxFeePerGas: null })
                        .on("transactionHash", (hash: string) => {
                            setTrxHash(hash);
                        });

                    addSuccessNotification("Success", "Transfer from transaction completed");
                    setIsSuccess(true);
                    setIsTransferFetching(false);
                }
            }
        } catch (e) {
            console.log(e);
            // @ts-ignore
            addErrorNotification("TransferFrom Error", e?.error?.message);
            setIsTransferFetching(false);
        }
    };

    const handleAddToMetamask = async () => {
        if (tokenData?.address) {
            await window.ethereum.request({
                method: "wallet_watchAsset",
                params: {
                    type: "ERC20",
                    options: {
                        address: tokenData.address,
                        symbol: tokenMetadata?.symbol,
                        decimals: tokenMetadata?.decimals,
                        image: tokenMetadata?.logo,
                    },
                },
            });
        }
    };

    if (!tokenData) {
        return <div className="transfer-form">Invalid token</div>;
    }

    const hasAllData =
        tokenData.chain &&
        tokenData.from &&
        tokenData.to &&
        tokenData.address &&
        tokenData.value?.length > 0 &&
        tokenData.value !== "0";

    const isDisabledContent =
        !address || tokenData.to.toLowerCase() !== address.toLowerCase() || tokenData.chain !== networkName;

    const renderButton = () => {
        if (isSuccess) {
            return null;
        }
        if (!address) {
            return (
                <Button onClick={onConnect} className="transfer-form__button">
                    CONNECT WALLET
                </Button>
            );
        }

        const hasAllowance = !!(allowance && allowance !== "0");

        return (
            <Button
                onClick={handleTransfer}
                className="transfer-form__button"
                disabled={!hasAllData || isTransferFetching || isDisabledContent || !hasAllowance}
            >
                {isTransferFetching ? "Loading..." : "Receive"}
            </Button>
        );
    };

    return (
        <div className={cn("transfer-form", { "transfer-form--disabled": isDisabledContent })}>
            <div className="transfer-form__content">
                <div className="transfer-form__title">Receive</div>
                {tokenData && (
                    <>
                        <InfoCell title="Network:">
                            <NetworkImage network={tokenData.chain} width={24} height={24} />
                            <div>&nbsp;&nbsp;{networkNames[tokenData.chain]}</div>
                        </InfoCell>
                        <div className="transfer-form__line">
                            <InfoCell className="transfer-form__copy-container" title="From:">
                                <div id="from">{getShortHash(tokenData.from)}</div>
                                <div onClick={handleCopyUrl(tokenData.from)}>
                                    <ContentCopyIcon />
                                </div>
                            </InfoCell>
                            <InfoCell className="transfer-form__copy-container" title="To:">
                                <div id="to">
                                    {tokenData.to.startsWith("0x") ? getShortHash(tokenData.to) : tokenData.to}
                                </div>
                                <div onClick={handleCopyUrl(tokenData.to)}>
                                    <ContentCopyIcon />
                                </div>
                            </InfoCell>
                        </div>
                        <InfoCell className="transfer-form__token-address" title="Token address:">
                            <a
                                href={getAddressLink(tokenData.address, tokenData.chain)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <div id="tokenAddress">{getShortHash(tokenData.address)}</div>
                            </a>
                            <div className="transfer-form__token-address__buttons">
                                <div className="transfer-form__metamask" onClick={handleAddToMetamask}>
                                    <div>Add to&nbsp;</div>
                                    <MetamaskIcon />
                                </div>
                                <div onClick={handleCopyUrl(tokenData.address)}>
                                    <ContentCopyIcon />
                                </div>
                            </div>
                        </InfoCell>
                        <div className="transfer-form__line">
                            <InfoCell title="Value:">
                                <div id="value">{getValue(tokenMetadata, tokenData)}</div>
                            </InfoCell>
                            {allowance && tokenMetadata && (
                                <InfoCell title="Allowance:">
                                    <div id="allowance">
                                        {`${beautifyTokenBalance(allowance, +tokenMetadata.decimals)} ${
                                            tokenMetadata?.symbol
                                        }`}
                                    </div>
                                </InfoCell>
                            )}
                        </div>
                        {address && tokenData.to.toLowerCase() !== address?.toLowerCase() && (
                            <div className="transfer-form__error">
                                Please change account to{" "}
                                {tokenData.to.startsWith("0x") ? getShortHash(tokenData.to) : tokenData.to}
                            </div>
                        )}
                        {address && tokenData.chain !== networkName && (
                            <div className="transfer-form__error">Please change network to {tokenData.chain}</div>
                        )}
                        {renderButton()}
                    </>
                )}
            </div>
            {trxHash && networkName && (
                <div className="transfer-form__hash">
                    <div className="transfer-form__hash__text">
                        <div>Hash:&nbsp;&nbsp;</div>
                        <div id="generated-url">
                            <a href={getTrxHashLink(trxHash, networkName)} target="_blank" rel="noreferrer">
                                {getShortHash(trxHash)}
                            </a>
                        </div>
                    </div>
                    <IconButton aria-label="copy" onClick={handleCopyUrl(trxHash)}>
                        <ContentCopyIcon />
                    </IconButton>
                </div>
            )}
        </div>
    );
});

export default TransferForm;

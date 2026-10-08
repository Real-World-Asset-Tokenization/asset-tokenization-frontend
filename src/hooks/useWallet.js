import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const updateWalletState = useCallback(async (signerAddress, provider) => {
    try {
      setAccount(signerAddress);
      const bal = await provider.getBalance(signerAddress);
      setBalance(ethers.formatEther(bal));
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error("Error updating wallet state:", err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install the browser extension.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts && accounts.length > 0) {
        await updateWalletState(accounts[0], provider);
      }
    } catch (err) {
      console.warn("Wallet connection notice:", err);
      if (err.code === -32002 || err.message?.includes("-32002")) {
        setError("MetaMask already has an open pop-up window waiting. Click the MetaMask icon in your browser toolbar to approve or close it.");
      } else {
        setError(err.message || "Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [updateWalletState]);

  const switchAccount = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      setIsConnecting(true);
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        await updateWalletState(accounts[0], provider);
      }
    } catch (err) {
      console.warn("User cancelled account switch:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [updateWalletState]);

  const disconnect = useCallback(() => {
    setAccount("");
    setBalance("0");
    setChainId(null);
  }, []);

  // Listen to accountsChanged and chainChanged
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await updateWalletState(accounts[0], provider);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // Auto-connect if already authorized
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts && accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        updateWalletState(accounts[0], provider);
      }
    });

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [disconnect, updateWalletState]);

  return {
    account,
    balance,
    chainId,
    isConnecting,
    error,
    connect,
    switchAccount,
    disconnect
  };
}

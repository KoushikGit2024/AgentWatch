import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';

export function useTailscalePorts(isOpen = false) {
  const [forwards, setForwards] = useState([]);
  const [tailnetHost, setTailnetHost] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPorts = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.getTailscalePorts();
      if (res?.success) {
        setForwards(res.forwards || []);
        setTailnetHost(res.tailnet_hostname);
        setIsConnected(res.connected);
      }
    } catch (err) {
      if (!silent) {
        console.error('Tailscale ports fetch error:', err);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPorts();
      const interval = setInterval(() => fetchPorts(true), 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchPorts]);

  const handleForwardPort = async (localPort, externalPort = null, label = null) => {
    setIsSubmitting(true);
    try {
      const res = await api.forwardPort(localPort, externalPort, label);
      if (res?.success) {
        toast.success(`Port ${localPort} forwarded on Tailnet!`, 'Tailscale');
        await fetchPorts(true);
        return res;
      }
      throw new Error(res?.error || 'Failed to forward port');
    } catch (err) {
      toast.error(err.message || 'Could not forward port on Tailnet', 'Tailscale');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePort = async (externalPort) => {
    try {
      const res = await api.removePortForward(externalPort);
      if (res?.success) {
        toast.info(`Port ${externalPort} forwarding stopped`, 'Tailscale');
        setForwards((prev) => prev.filter((item) => item.external_port !== externalPort));
        return true;
      }
      throw new Error(res?.error || 'Failed to remove port');
    } catch (err) {
      toast.error(err.message || 'Could not remove port tunnel', 'Tailscale');
      return false;
    }
  };

  return {
    forwards,
    tailnetHost,
    isConnected,
    isLoading,
    isSubmitting,
    fetchPorts,
    handleForwardPort,
    handleRemovePort,
  };
}


import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  return { copyToClipboard, copied };
};

export const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = 'Copy' }) => {
  const { copyToClipboard, copied } = useCopyToClipboard();

  return (
    <button
      onClick={() => copyToClipboard(text)}
      className={`px-3 py-1 rounded text-sm transition ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      }`}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
};

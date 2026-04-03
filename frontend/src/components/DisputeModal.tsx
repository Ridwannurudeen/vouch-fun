import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { disputeProfile, hasFundedAccount } from "../lib/genlayer";

interface DisputeModalProps {
  handle: string;
  isOpen: boolean;
  onClose: () => void;
  onDisputed: (reason: string) => void;
}

export default function DisputeModal({ handle, isOpen, onClose, onDisputed }: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    setSubmitting(true);
    setError("");
    try {
      await disputeProfile(handle, trimmedReason);
      onDisputed(trimmedReason);
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit dispute. Testnet may be unavailable.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass rounded-2xl p-6 w-full max-w-md mx-4 border border-glass-border"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-1">Challenge This Score</h3>
            <p className="text-sm text-gray-400 mb-2">
              Submit evidence that this profile's trust assessment is inaccurate.
              Validators will re-evaluate the profile against fresh web evidence.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              This challenge becomes part of the visible review trail on the profile page.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why should this score be reconsidered? Include the source or event that changes the trust judgment..."
              className="w-full h-32 px-4 py-3 bg-white/5 border border-glass-border rounded-lg text-sm text-white
                         placeholder:text-gray-600 focus:outline-none focus:border-accent/50 resize-none"
              disabled={submitting}
            />

            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

            {!hasFundedAccount && (
              <p className="text-amber-400 text-xs mt-2">
                Disputes require GEN tokens for gas. Demo wallet not configured.
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm text-gray-400 border border-glass-border
                           rounded-lg hover:bg-glass-hover transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors font-medium"
              >
                {submitting ? "Submitting..." : "Submit Challenge"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

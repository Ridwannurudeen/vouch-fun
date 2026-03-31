import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { disputeProfile, hasFundedAccount } from "../lib/genlayer";

interface DisputeModalProps {
  handle: string;
  isOpen: boolean;
  onClose: () => void;
  onDisputed: () => void;
}

export default function DisputeModal({ handle, isOpen, onClose, onDisputed }: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await disputeProfile(handle, reason);
      onDisputed();
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Challenge This Score</h3>
            <p className="text-sm text-gray-500 mb-4">
              Submit evidence that this profile's trust assessment is inaccurate.
              Validators will re-evaluate with your context.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why should this score be reconsidered? Provide evidence or reasoning..."
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:border-gray-900 resize-none"
              disabled={submitting}
            />

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            {!hasFundedAccount && (
              <p className="text-amber-600 text-xs mt-2">
                Disputes require GEN tokens for gas. Demo wallet not configured.
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200
                           rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:bg-gray-300 transition-colors font-medium"
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

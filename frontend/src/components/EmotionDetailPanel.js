import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EmotionDetailPanel({ emotion, loading, onClose }) {
  return (
    <AnimatePresence mode="wait">
      {(emotion || loading) && (
        <motion.aside
          key={emotion ? `${emotion.x},${emotion.y}` : "loading"}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel detail-panel"
          data-testid="emotion-detail-panel"
        >
          <button
            className="detail-close"
            onClick={onClose}
            aria-label="Close emotion detail"
            data-testid="detail-close"
          >
            <X size={14} strokeWidth={1.6} />
          </button>

          {loading && !emotion ? (
            <div>
              <h2 className="detail-name" style={{ opacity: 0.4 }}>
                <span className="spinner" style={{ marginRight: 10 }} />
                Naming this feeling
              </h2>
              <p className="detail-desc" style={{ opacity: 0.6 }}>
                Consulting the emotion cartographer for a coordinate that hasn&rsquo;t
                been mapped yet.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="detail-name" data-testid="detail-name">
                {emotion.name}
              </h2>
              <p className="detail-desc" data-testid="detail-description">
                {emotion.description}
              </p>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import { motion } from "framer-motion";
import { STEP_LABELS } from "./types";
import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
}

const ProgressBar = ({ currentStep }: ProgressBarProps) => {
  return (
    <div className="w-full mb-10">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        {/* Active line */}
        <motion.div
          className="absolute top-4 left-0 h-0.5 gradient-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${(currentStep / (STEP_LABELS.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {STEP_LABELS.map((label, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={label} className="flex flex-col items-center relative z-10">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300 ${
                  isCompleted
                    ? "gradient-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </motion.div>
              <span
                className={`mt-2 text-xs font-medium hidden sm:block ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;

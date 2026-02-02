import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const Stepper = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center w-full max-w-md mx-auto">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`stepper-dot ${
                currentStep > step.id
                  ? 'stepper-dot-completed'
                  : currentStep === step.id
                  ? 'stepper-dot-active'
                  : 'stepper-dot-pending'
              }`}
            >
              {currentStep > step.id ? (
                <Check className="w-5 h-5" />
              ) : (
                step.id
              )}
            </motion.div>
            <span
              className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                currentStep >= step.id ? 'text-teal-600' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`stepper-line ${
                currentStep > step.id ? 'stepper-line-completed' : 'stepper-line-pending'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Stepper;

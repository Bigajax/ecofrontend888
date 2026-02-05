interface RiquezaMentalProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function RiquezaMentalProgressBar({
  currentStep,
  totalSteps,
}: RiquezaMentalProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Progress dots/circles */}
      <div className="flex gap-3 justify-between">
        {steps.map((step) => (
          <div
            key={step}
            className={`flex-1 h-2.5 rounded-full transition-all duration-300 ${
              step <= currentStep
                ? 'bg-eco-baby shadow-minimal'
                : 'bg-eco-line/30'
            }`}
          />
        ))}
      </div>

      {/* Step counter */}
      <div className="text-center text-sm font-primary font-medium text-eco-muted">
        Passo {currentStep + 1} de {totalSteps}
      </div>
    </div>
  );
}

import React from 'react';
import { ImageQualityCheck } from './ImageQualityCheck';

export const ImageCheckView: React.FC<{ 
  t: any;
  aiOptions?: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
}> = ({ t, aiOptions, isLicensed, dailyGenCount, incrementDailyCount, setShowLimitModal, setShowActivationModal }) => {
  return (
    <div className="w-full">
      <ImageQualityCheck 
        t={t} 
        aiOptions={aiOptions} 
        isLicensed={isLicensed}
        dailyGenCount={dailyGenCount}
        incrementDailyCount={incrementDailyCount}
        setShowLimitModal={setShowLimitModal}
        setShowActivationModal={setShowActivationModal}
      />
    </div>
  );
};

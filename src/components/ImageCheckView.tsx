import React from 'react';
import { ImageQualityCheck } from './ImageQualityCheck';

export const ImageCheckView: React.FC<{ t: any, aiOptions?: any }> = ({ t, aiOptions }) => {
  return (
    <div className="w-full">
      <ImageQualityCheck t={t} aiOptions={aiOptions} />
    </div>
  );
};

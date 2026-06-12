import React from 'react';
import { ImageQualityCheck } from './ImageQualityCheck';

export const ImageCheckView: React.FC<{ t: any }> = ({ t }) => {
  return (
    <div className="w-full">
      <ImageQualityCheck t={t} />
    </div>
  );
};

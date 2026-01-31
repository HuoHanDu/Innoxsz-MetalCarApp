import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
}

export const ResultIcon: React.FC<IconProps> = ({color, size}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 20V10M12 20V4M6 20V14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ResultIcon;

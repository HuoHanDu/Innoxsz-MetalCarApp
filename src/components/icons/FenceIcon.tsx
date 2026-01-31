import React from 'react';
import Svg, {Path, Rect} from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
}

export const FenceIcon: React.FC<IconProps> = ({color, size}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="4 2"
    />
    <Path
      d="M12 8V16M8 12H16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export default FenceIcon;

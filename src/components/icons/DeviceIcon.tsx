import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
}

export const DeviceIcon: React.FC<IconProps> = ({color, size}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.5 6.5C8.5 4.5 11.5 4 14 5.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M4 4C7.5 1 13.5 0.5 18 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="12" r="3" fill={color} />
    <Path
      d="M12 15V20M9 20H15"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export default DeviceIcon;

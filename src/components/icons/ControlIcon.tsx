import React from 'react';
import Svg, {Circle} from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
}

export const ControlIcon: React.FC<IconProps> = ({color, size}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="3" fill={color} />
  </Svg>
);

export default ControlIcon;

import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';

interface IconProps {
  color: string;
  size: number;
}

export const SettingsIcon: React.FC<IconProps> = ({color, size}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Path
      d="M19.4 15C19.2 15.3 19.1 15.7 19.2 16L19.8 18.2C19.9 18.5 19.8 18.8 19.5 19L17.7 20.3C17.4 20.5 17 20.5 16.8 20.2L15.3 18.5C15.1 18.3 14.7 18.2 14.4 18.3L12.2 18.9C11.9 19 11.6 18.9 11.4 18.6L10.1 16.8C9.9 16.5 9.9 16.1 10.2 15.9L11.9 14.4C12.1 14.2 12.2 13.8 12.1 13.5L11.5 11.3C11.4 11 11.5 10.7 11.8 10.5L13.6 9.2C13.9 9 14.3 9 14.5 9.3L16 11C16.2 11.2 16.6 11.3 16.9 11.2L19.1 10.6C19.4 10.5 19.7 10.6 19.9 10.9L21.2 12.7C21.4 13 21.4 13.4 21.1 13.6L19.4 15Z"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

export default SettingsIcon;

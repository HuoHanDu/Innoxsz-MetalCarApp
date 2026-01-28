import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import HomeScreen from './src/screens/HomeScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import FenceScreen from './src/screens/FenceScreen';
import ResultScreen from './src/screens/ResultScreen';
import ControlScreen from './src/screens/ControlScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {colors} from './src/theme';

const Tab = createBottomTabNavigator();

// 图标组件
const HomeIcon = ({color, size}: {color: string; size: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FenceIcon = ({color, size}: {color: string; size: number}) => (
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

const ResultIcon = ({color, size}: {color: string; size: number}) => (
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

const ControlIcon = ({color, size}: {color: string; size: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="3" fill={color} />
  </Svg>
);

const DeviceIcon = ({color, size}: {color: string; size: number}) => (
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

const SettingsIcon = ({color, size}: {color: string; size: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Path
      d="M19.4 15C19.2 15.3 19.1 15.7 19.2 16L19.8 18.2C19.9 18.5 19.8 18.8 19.5 19L17.7 20.3C17.4 20.5 17 20.5 16.8 20.2L15.3 18.5C15.1 18.3 14.7 18.2 14.4 18.3L12.2 18.9C11.9 19 11.6 18.9 11.4 18.6L10.1 16.8C9.9 16.5 9.9 16.1 10.2 15.9L11.9 14.4C12.1 14.2 12.2 13.8 12.1 13.5L11.5 11.3C11.4 11 11.5 10.7 11.8 10.5L13.6 9.2C13.9 9 14.3 9 14.5 9.3L16 11C16.2 11.2 16.6 11.3 16.9 11.2L19.1 10.6C19.4 10.5 19.7 10.6 19.9 10.9L21.2 12.7C21.4 13 21.4 13.4 21.1 13.6L19.4 15Z"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: {
              fontSize: 11,
            },
          }}>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: '主页',
              tabBarIcon: ({color, size}) => <HomeIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Fence"
            component={FenceScreen}
            options={{
              tabBarLabel: '区域',
              tabBarIcon: ({color, size}) => <FenceIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Result"
            component={ResultScreen}
            options={{
              tabBarLabel: '结果',
              tabBarIcon: ({color, size}) => <ResultIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Control"
            component={ControlScreen}
            options={{
              tabBarLabel: '控制',
              tabBarIcon: ({color, size}) => <ControlIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Device"
            component={DeviceScreen}
            options={{
              tabBarLabel: '设备',
              tabBarIcon: ({color, size}) => <DeviceIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: '设置',
              tabBarIcon: ({color, size}) => <SettingsIcon color={color} size={size} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;

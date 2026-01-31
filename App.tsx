import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import FenceScreen from './src/screens/FenceScreen';
import ResultScreen from './src/screens/ResultScreen';
import ControlScreen from './src/screens/ControlScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {colors} from './src/theme';
import {
  HomeIcon,
  DeviceIcon,
  FenceIcon,
  ControlIcon,
  ResultIcon,
  SettingsIcon,
} from './src/components/icons';
import {ServiceProvider} from './src/contexts';

const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  return (
    <ServiceProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              lazy: false, // 预加载所有页面，避免切换时重新加载
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
    </ServiceProvider>
  );
}

export default App;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import FenceScreen from './src/screens/FenceScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#fff',
          tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#0f3460' },
          tabBarActiveTintColor: '#e94560',
          tabBarInactiveTintColor: '#888',
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options= 
            {{title: '主页',
            tabBarIcon: () => <Text>🗺️</Text>}}
           
        />
        <Tab.Screen 
          name="Device" 
          component={DeviceScreen} 
          options={{ 
            title: '设备',
            tabBarIcon: () => <Text>📡</Text>}}
           
        />
        <Tab.Screen 
          name="Fence" 
          component={FenceScreen} 
          options={{ 
            title: '围栏',
            tabBarIcon: () => <Text>📐</Text>}}
           
        />
        <Tab.Screen 
          name="Result" 
          component={ResultScreen} 
          options={{ 
            title: '结果',
            tabBarIcon: () => <Text>📍</Text>}}
           
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ 
            title: '设置',
            tabBarIcon: () => <Text>⚙️</Text>}}
           
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
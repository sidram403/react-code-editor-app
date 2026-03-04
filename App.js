import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';

const Stack = createStackNavigator();

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: '#010409',
                            borderBottomWidth: 1,
                            borderBottomColor: '#21262d',
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        headerTintColor: '#c9d1d9',
                        headerTitleStyle: {
                            fontWeight: '700',
                            fontSize: 16,
                            color: '#e6edf3',
                        },
                        cardStyle: { backgroundColor: '#0d1117' },
                    }}
                >
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Editor"
                        component={EditorScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}

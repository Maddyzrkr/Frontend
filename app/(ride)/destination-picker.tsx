import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DestinationPicker() {
  const router = useRouter();
  const [destination, setDestination] = useState('');

  const handleConfirm = async () => {
    console.log('Handling destination confirmation');
    if (destination.trim()) {
      try {
        // Create a sample location data (without actual coordinates)
        const locationData = {
          name: destination,
          latitude: 19.0760,  // Default Mumbai latitude
          longitude: 72.8777, // Default Mumbai longitude
          address: { city: 'Mumbai', country: 'India' }
        };
        
        console.log('Saving destination data to AsyncStorage:', locationData);
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('selectedDestination', JSON.stringify(locationData));
        
        console.log('Destination saved, navigating back');
        router.back();
      } catch (error) {
        console.error('Error saving destination:', error);
        Alert.alert('Error', 'Could not save destination. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Please enter a destination');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Where to?"
        value={destination}
        onChangeText={setDestination}
        autoFocus
      />
      <TouchableOpacity 
        style={styles.button}
        onPress={handleConfirm}
      >
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

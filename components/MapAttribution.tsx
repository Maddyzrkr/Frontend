import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

interface MapAttributionProps {
  style?: any;
}

/**
 * A component to properly attribute OpenStreetMap data used in the map
 */
const MapAttribution: React.FC<MapAttributionProps> = ({ style }) => {
  const openAttributionUrl = () => {
    Linking.openURL('https://www.openstreetmap.org/copyright');
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={openAttributionUrl}>
        <Text style={styles.text}>© OpenStreetMap contributors</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    color: '#333',
  },
});

export default MapAttribution; 
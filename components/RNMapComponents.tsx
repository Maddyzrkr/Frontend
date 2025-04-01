import React from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface UserLocationDotProps {
  visible: boolean;
  showHeading?: boolean;
}

export const UserLocationDot: React.FC<UserLocationDotProps> = ({
  visible,
  showHeading = false,
}) => {
  if (!visible) return null;

  try {
    return (
      <Mapbox.UserLocation
        visible={visible}
        showsUserHeadingIndicator={showHeading}
        animated={true}
      />
    );
  } catch (error) {
    console.warn('Error rendering UserLocationDot:', error);
    return null;
  }
};

interface MapMarkerProps {
  id: string;
  coordinate: [number, number];
  children?: React.ReactElement | null;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  id,
  coordinate,
  children,
}) => {
  try {
    // Always ensure we have a ReactElement for children
    const markerContent = children ? children : <View style={styles.defaultMarker} />;
    
    return (
      <Mapbox.PointAnnotation
        id={id}
        coordinate={coordinate}
      >
        {markerContent}
      </Mapbox.PointAnnotation>
    );
  } catch (error) {
    console.warn('Error rendering MapMarker:', error);
    return null;
  }
};

interface RouteLayerProps {
  id: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  id,
  coordinates,
  color = '#0066CC',
  width = 4,
}) => {
  try {
    return (
      <Mapbox.ShapeSource
        id={`${id}Source`}
        shape={{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        }}
      >
        <Mapbox.LineLayer
          id={id}
          style={{
            lineColor: color,
            lineWidth: width,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
    );
  } catch (error) {
    console.warn('Error rendering RouteLayer:', error);
    return null;
  }
};

const styles = StyleSheet.create({
  defaultMarker: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
}); 
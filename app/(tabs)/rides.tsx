import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker, RouteLayer, UserLocationDot, GoogleMapViewMethods } from '../../components/map';

// Define the Ride interface
interface Ride {
  id: string;
  provider: string;
  distance: string;
  from: string;
  to: string;
  date: string;
  fare: string;
  // Add coordinates for mapping
  fromCoords?: [number, number];
  toCoords?: [number, number];
  routeCoords?: Array<[number, number]>;
}

export default function RidesScreen() {
  // Sample coordinates for Mumbai
  const mumbaiCoords: [number, number] = [72.8777, 19.0760];
  
  // Reference to map
  const mapRef = useRef<GoogleMapViewMethods>(null);
  
  // State to track the selected ride for map display
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  
  // Add state to track map availability
  const [isMapLibraryAvailable, setIsMapLibraryAvailable] = useState<boolean>(true);
  
  // Sample ride data with coordinates
  const recentRides: Ride[] = [
    {
      id: '1',
      provider: 'Uber',
      distance: '12 miles',
      from: 'Andheri',
      to: 'Airport',
      date: '12 Mar 2025',
      fare: '₹350',
      fromCoords: [72.8513, 19.1136], // Andheri coordinates
      toCoords: [72.8697, 19.0896], // Airport coordinates
      routeCoords: [
        [72.8513, 19.1136],
        [72.8550, 19.1100],
        [72.8600, 19.1050],
        [72.8650, 19.1000],
        [72.8697, 19.0896]
      ]
    },
    {
      id: '2',
      provider: 'Ola',
      distance: '5 miles',
      from: 'Bandra',
      to: 'Downtown',
      date: '10 Mar 2025',
      fare: '₹180',
      fromCoords: [72.8296, 19.0544], // Bandra coordinates
      toCoords: [72.8347, 18.9220], // Downtown coordinates
      routeCoords: [
        [72.8296, 19.0544],
        [72.8310, 19.0400],
        [72.8330, 19.0000],
        [72.8347, 18.9220]
      ]
    },
    {
      id: '3',
      provider: 'Rapido',
      distance: '3 miles',
      from: 'Juhu',
      to: 'Andheri',
      date: '8 Mar 2025',
      fare: '₹120',
      fromCoords: [72.8296, 19.1031], // Juhu coordinates
      toCoords: [72.8513, 19.1136], // Andheri coordinates
      routeCoords: [
        [72.8296, 19.1031],
        [72.8350, 19.1050],
        [72.8400, 19.1080],
        [72.8513, 19.1136]
      ]
    },
  ];
  
  // Select a ride and show its route on the map
  const handleSelectRide = (ride: Ride) => {
    setSelectedRide(ride);
    
    if (mapRef.current && ride.fromCoords && ride.toCoords && isMapLibraryAvailable) {
      // Calculate map bounds to show both points
      const neBound: [number, number] = [
        Math.max(ride.fromCoords[0], ride.toCoords[0]) + 0.01,
        Math.max(ride.fromCoords[1], ride.toCoords[1]) + 0.01
      ];
      
      const swBound: [number, number] = [
        Math.min(ride.fromCoords[0], ride.toCoords[0]) - 0.01,
        Math.min(ride.fromCoords[1], ride.toCoords[1]) - 0.01
      ];
      
      // Zoom map to show the route
      mapRef.current.fitBounds(neBound, swBound, 50);
    }
  };

  const renderRideItem = ({ item }: { item: Ride }) => (
    <TouchableOpacity 
      style={[
        styles.rideItem, 
        selectedRide?.id === item.id ? styles.selectedRideItem : null
      ]}
      onPress={() => handleSelectRide(item)}
    >
      <View style={styles.rideIconContainer}>
        {/* @ts-ignore */}
        <Ionicons name="car" size={24} color="#0066CC" />
      </View>
      <View style={styles.rideDetails}>
        <View style={styles.rideHeader}>
          <Text style={styles.rideProvider}>{item.provider}</Text>
          <Text style={styles.rideDistance}>{item.distance}</Text>
        </View>
        <Text style={styles.rideLocation}>From: {item.from}</Text>
        <Text style={styles.rideLocation}>To: {item.to}</Text>
        <Text style={styles.rideDate}>{item.date}</Text>
        <Text style={styles.rideFare}>Fare: {item.fare}</Text>
      </View>
      <TouchableOpacity style={styles.detailsButton}>
        {/* @ts-ignore */}
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Rides</Text>
      </View>
      
      {/* Map View Section */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialCoordinates={mumbaiCoords}
          zoomLevel={11}
          onAvailabilityChange={(isAvailable) => {
            console.log('Rides screen - Map availability changed:', isAvailable);
            setIsMapLibraryAvailable(isAvailable);
          }}
        >
          {/* Only show markers and route if a ride is selected */}
          {selectedRide && selectedRide.fromCoords && (
            <MapMarker
              id="fromLocation"
              coordinate={selectedRide.fromCoords}
            >
              <View style={styles.markerContainer}>
                <View style={styles.startMarker}>
                  {/* @ts-ignore */}
                  <Ionicons name="location" size={24} color="#0066CC" />
                </View>
              </View>
            </MapMarker>
          )}
          
          {selectedRide && selectedRide.toCoords && (
            <MapMarker
              id="toLocation"
              coordinate={selectedRide.toCoords}
            >
              <View style={styles.markerContainer}>
                <View style={styles.endMarker}>
                  {/* @ts-ignore */}
                  <Ionicons name="navigate" size={24} color="#FF3B30" />
                </View>
              </View>
            </MapMarker>
          )}
          
          {selectedRide && selectedRide.routeCoords && (
            <RouteLayer
              id="ridePath"
              coordinates={selectedRide.routeCoords}
            />
          )}
        </MapView>
        
        {/* Instructions when no ride is selected but map is available */}
        {!selectedRide && isMapLibraryAvailable && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>Select a ride to view its route</Text>
          </View>
        )}
      </View>
      
      {/* Rides List */}
      <FlatList
        data={recentRides}
        renderItem={renderRideItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ridesList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Map styles
  mapContainer: {
    height: '35%',
    width: '100%',
    position: 'relative',
    marginBottom: 10,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  mapOverlayText: {
    fontSize: 16,
    color: '#666',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  markerContainer: {
    alignItems: 'center',
  },
  startMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  endMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Rides list styles
  ridesList: {
    padding: 15,
  },
  rideItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRideItem: {
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  rideIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rideDetails: {
    flex: 1,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  rideProvider: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rideDistance: {
    color: '#666',
  },
  rideLocation: {
    color: '#555',
    marginBottom: 3,
  },
  rideDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  rideFare: {
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 5,
  },
  detailsButton: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
});
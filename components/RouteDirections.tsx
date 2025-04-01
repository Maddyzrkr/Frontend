import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Optional import for BottomSheet wrapped in a try-catch
let BottomSheet: any = null;
let BottomSheetView: any = null;

try {
  const bottomSheetModule = require('@gorhom/bottom-sheet');
  BottomSheet = bottomSheetModule.default;
  BottomSheetView = bottomSheetModule.BottomSheetView;
} catch (error) {
  console.warn('Failed to load BottomSheet module:', error);
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface RouteDirectionsProps {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  visible: boolean;
  onClose: () => void;
}

// Add a fallback component when BottomSheet is not available
const FallbackBottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ visible, onClose, children }) => {
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackContent}>
          <View style={styles.handleIndicator} />
          {children}
        </View>
      </View>
    </Modal>
  );
};

// Helper for formatting distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

// Helper for formatting duration
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  }
  
  return `${minutes} min`;
};

// Helper to determine the appropriate direction icon
const getDirectionIcon = (instruction: string): string => {
  const lowerInstruction = instruction.toLowerCase();
  
  if (lowerInstruction.includes('turn right')) {
    return 'arrow-forward';
  } else if (lowerInstruction.includes('turn left')) {
    return 'arrow-back';
  } else if (lowerInstruction.includes('uturn') || lowerInstruction.includes('u-turn')) {
    return 'refresh';
  } else if (lowerInstruction.includes('continue') || lowerInstruction.includes('straight')) {
    return 'arrow-up';
  } else if (lowerInstruction.includes('arrive') || lowerInstruction.includes('destination')) {
    return 'flag';
  } else if (lowerInstruction.includes('roundabout') || lowerInstruction.includes('rotary')) {
    return 'sync';
  } else if (lowerInstruction.includes('merge') || lowerInstruction.includes('onto')) {
    return 'git-merge';
  } else if (lowerInstruction.includes('exit')) {
    return 'exit';
  }
  
  return 'navigate';
};

const RouteDirections: React.FC<RouteDirectionsProps> = ({
  steps,
  totalDistance,
  totalDuration,
  visible,
  onClose,
}) => {
  // Add state to track if BottomSheet is available
  const [isBottomSheetAvailable, setIsBottomSheetAvailable] = useState<boolean>(!!BottomSheet);
  
  // Bottom sheet reference
  const bottomSheetRef = useRef<any>(null);
  
  // Variables for bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '50%', '80%'], []);
  
  // Callbacks for sheet events
  const handleSheetChanges = useCallback((index: number) => {
    console.log('Bottom sheet index changed:', index);
  }, []);
  
  // Effect to check BottomSheet availability on mount
  useEffect(() => {
    setIsBottomSheetAvailable(!!BottomSheet && !!BottomSheetView);
  }, []);
  
  // Function to render the content of the directions panel
  const renderContent = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Directions</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.distanceText}>{formatDistance(totalDistance)}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.durationText}>{formatDuration(totalDuration)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#555" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={steps || []}
        keyExtractor={(item, index) => `direction-${index}`}
        renderItem={({ item, index }) => (
          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <Ionicons 
                name={getDirectionIcon(item.instruction)} 
                size={20} 
                color="#0066CC" 
              />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepInstruction}>{item.instruction}</Text>
              <Text style={styles.stepDistance}>{formatDistance(item.distance)}</Text>
            </View>
            {index < steps.length - 1 && <View style={styles.stepDivider} />}
          </View>
        )}
      />
    </>
  );
  
  if (!visible) return null;
  
  // Conditionally render based on BottomSheet availability
  if (isBottomSheetAvailable) {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          handleIndicatorStyle={styles.handleIndicator}
          backgroundStyle={styles.sheetBackground}
        >
          <BottomSheetView style={styles.contentContainer}>
            {renderContent()}
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    );
  } else {
    // Fallback when BottomSheet is not available
    return (
      <FallbackBottomSheet visible={visible} onClose={onClose}>
        {renderContent()}
      </FallbackBottomSheet>
    );
  }
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  sheetBackground: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: '#ddd',
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  dot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 5,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  stepIconContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 15,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 14,
    color: '#666',
  },
  stepDivider: {
    position: 'absolute',
    left: 34,
    top: 40,
    bottom: 0,
    width: 1,
    backgroundColor: '#E6E6E6',
  },
  // Fallback styles
  fallbackContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fallbackContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    paddingBottom: 30,
    maxHeight: '80%',
  },
});

export default RouteDirections; 
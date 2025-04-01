import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

interface User {
  _id: string;
  username: string;
  name: string;
  profileImage?: string;
  location: string;
  languages: string[];
  gender: string;
  rating?: number;
  distance?: string;
  mode: 'booking' | 'seeking';
  ride?: {
    provider: string;
    destination: string;
    fare: string;
    time: string;
  };
}

interface InviteData {
  userId: string;
  rideId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface UserListProps {
  users: User[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onInvite?: (userId: string) => Promise<void>;
  invites?: InviteData[];
}

export default function UserList({ 
  users, 
  loading, 
  onRefresh, 
  refreshing, 
  onInvite, 
  invites = [] 
}: UserListProps) {
  const router = useRouter();

  const handleUserPress = (userId: string) => {
    router.push(`/chat/${userId}`);
  };

  const isInviteSent = (userId: string) => {
    return invites.some(invite => invite.userId === userId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No matching users found</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item._id)}
    >
      <Image
        source={item.profileImage ? { uri: item.profileImage } : require('./default-avatar.png')}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.distance && <Text style={styles.userLocation}>{item.distance} away</Text>}
        <Text style={styles.userLocation}>{item.location}</Text>
        <Text style={styles.userDetails}>
          {item.gender} • {item.languages.join(', ')}
        </Text>
        <Text style={styles.userMode}>
          {item.mode === 'booking' ? 'Looking to Book' : 'Looking for Riders'}
        </Text>
        
        {/* Rating display */}
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      
      {/* Invite button */}
      {onInvite && (
        <TouchableOpacity 
          style={[
            styles.inviteButton, 
            isInviteSent(item._id) && styles.inviteSentButton
          ]}
          onPress={() => onInvite(item._id)}
          disabled={isInviteSent(item._id)}
        >
          <Text style={styles.inviteButtonText}>
            {isInviteSent(item._id) ? 'Invited' : 'Invite'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={users}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContainer}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 10,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userMode: {
    fontSize: 14,
    color: '#2e78b7',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
  },
  inviteSentButton: {
    backgroundColor: '#CCCCCC',
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
}); 
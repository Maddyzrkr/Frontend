// api/rideService.ts
import { Ride, Provider, Location } from '../types';

// Mock data for available rides
export const fetchAvailableRides = (): Promise<Ride[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'Uber', pickup: 'Current Location', destination: 'Airport', distance: '12 miles' },
        { id: 2, name: 'Lyft', pickup: 'Current Location', destination: 'Downtown', distance: '5 miles' },
        { id: 3, name: 'Bolt', pickup: 'Current Location', destination: 'Shopping Mall', distance: '8 miles' },
      ]);
    }, 1000);
  });
};

// Mock data for service providers
export const fetchProviders = (location: Location): Promise<Provider[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'Uber', eta: '5 mins', fare: '$15.50' },
        { id: 2, name: 'Lyft', eta: '3 mins', fare: '$18.75' },
        { id: 3, name: 'Bolt', eta: '7 mins', fare: '$12.20' },
      ]);
    }, 1500);
  });
};